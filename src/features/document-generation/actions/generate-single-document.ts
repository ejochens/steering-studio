"use server";

import { prisma } from "@/lib/db/prisma";
import { generateSingleDocumentSchema } from "@/lib/validation/generated-document";
import { assembleKnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { getTemplatesForTarget } from "@/features/document-generation/lib/template-registry";
import { refineDocument } from "@/features/document-generation/lib/ai-refiner";
import type { TargetOutput } from "@/lib/validation";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import { revalidatePath } from "next/cache";
import type { GenerateResult } from "./generate-documents";

// ── Server action ────────────────────────────────────────────────────

export async function generateSingleDocument(
  projectId: string,
  filePath: string,
): Promise<GenerateResult> {
  const parsed = generateSingleDocumentSchema.safeParse({ projectId, filePath });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input. projectId and filePath are required.",
      documents: [],
      warnings: [],
      summary: { total: 0, complete: 0, partial: 0, empty: 0 },
    };
  }

  try {
    // 1. Fetch the project to get targetOutput
    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
      select: { id: true, targetOutput: true },
    });

    if (!project) {
      return {
        success: false,
        error: "Project not found.",
        documents: [],
        warnings: [],
        summary: { total: 0, complete: 0, partial: 0, empty: 0 },
      };
    }

    const targetOutput = project.targetOutput as TargetOutput;

    // 2. Assemble the knowledge model from intake answers
    const model = await assembleKnowledgeModel(parsed.data.projectId);

    // 3. Get templates for the target and find the one matching filePath
    const allTemplates = getTemplatesForTarget(targetOutput);
    const template = allTemplates.find((t) => t.filePath === parsed.data.filePath);

    if (!template) {
      return {
        success: false,
        error: `No template found for file path: ${parsed.data.filePath}`,
        documents: [],
        warnings: [],
        summary: { total: 0, complete: 0, partial: 0, empty: 0 },
      };
    }

    // 4. Optionally load provider config for AI refinement
    const warnings: string[] = [];
    const providerConfig = await resolveProvider("generation");
    if (!providerConfig) {
      warnings.push(
        "No AI provider configured. Document was generated using template only (Layer 1).",
      );
    }

    // 5. Render the template and optionally refine
    const result = template.render(model);
    const draftContent = result.markdown;
    let finalContent = draftContent;
    let wasRefined = false;

    if (providerConfig) {
      const refineResult = await refineDocument(draftContent, providerConfig);
      if (refineResult.wasRefined) {
        finalContent = refineResult.refined;
        wasRefined = true;
      } else if (refineResult.error) {
        warnings.push(
          `AI refinement skipped for ${template.filePath}: ${refineResult.error}`,
        );
      }
    }

    // 6. Upsert the single GeneratedDocument record
    const missingFieldsJson = JSON.stringify(result.missingFields);

    await prisma.generatedDocument.upsert({
      where: {
        projectId_filePath: {
          projectId: parsed.data.projectId,
          filePath: template.filePath,
        },
      },
      create: {
        projectId: parsed.data.projectId,
        filePath: template.filePath,
        content: finalContent,
        draftContent,
        completeness: result.completeness,
        missingFields: missingFieldsJson,
        templateVersion: "1.0",
        manuallyEdited: false,
        generatedAt: new Date(),
      },
      update: {
        content: finalContent,
        draftContent,
        completeness: result.completeness,
        missingFields: missingFieldsJson,
        manuallyEdited: false,
        generatedAt: new Date(),
      },
    });

    const documents: GenerateResult["documents"] = [
      {
        filePath: template.filePath,
        completeness: result.completeness,
        missingFields: result.missingFields,
        wasRefined,
      },
    ];

    // 7. Build completeness summary
    const summary = {
      total: 1,
      complete: result.completeness === "complete" ? 1 : 0,
      partial: result.completeness === "partial" ? 1 : 0,
      empty: result.completeness === "empty" ? 1 : 0,
    };

    // 8. Revalidate the documents page
    revalidatePath(`/projects/${parsed.data.projectId}/documents`);

    return {
      success: true,
      documents,
      warnings,
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[generateSingleDocument] Error:", message);
    return {
      success: false,
      error: `Failed to generate document: ${message}`,
      documents: [],
      warnings: [],
      summary: { total: 0, complete: 0, partial: 0, empty: 0 },
    };
  }
}
