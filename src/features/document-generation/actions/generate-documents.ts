"use server";

import { prisma } from "@/lib/db/prisma";
import { generateDocumentsSchema } from "@/lib/validation/generated-document";
import { assembleKnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { getTemplatesForTarget } from "@/features/document-generation/lib/template-registry";
import { refineDocument } from "@/features/document-generation/lib/ai-refiner";
import type { TargetOutput } from "@/lib/validation";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import { revalidatePath } from "next/cache";

// ── Result type ──────────────────────────────────────────────────────

export interface GenerateResult {
  success: boolean;
  error?: string;
  documents: Array<{
    filePath: string;
    completeness: string;
    missingFields: string[];
    wasRefined: boolean;
  }>;
  warnings: string[];
  summary: {
    total: number;
    complete: number;
    partial: number;
    empty: number;
  };
}

// ── Server action ────────────────────────────────────────────────────

export async function generateAllDocuments(
  projectId: string,
): Promise<GenerateResult> {
  const parsed = generateDocumentsSchema.safeParse({ projectId });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input. projectId is required.",
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

    // 3. Get applicable templates for the target
    const allTemplates = getTemplatesForTarget(targetOutput);
    const applicableTemplates = allTemplates.filter((t) => t.isApplicable(model));

    // 4. Optionally load provider config for AI refinement
    const warnings: string[] = [];
    const providerConfig = await resolveProvider("generation");
    if (!providerConfig) {
      warnings.push(
        "No AI provider configured. Documents were generated using templates only (Layer 1).",
      );
    }

    // 5. Render each template and optionally refine
    const documents: GenerateResult["documents"] = [];

    for (const template of applicableTemplates) {
      console.debug(`[generateAllDocuments] Processing: ${template.filePath}`);
      const result = template.render(model);
      const draftContent = result.markdown;
      let finalContent = draftContent;
      let wasRefined = false;

      // Attempt AI refinement if provider is available
      if (providerConfig) {
        console.debug(`[generateAllDocuments] Refining: ${template.filePath} with ${providerConfig.modelName}`);
        const refineStart = Date.now();
        const refineResult = await refineDocument(draftContent, providerConfig);
        const refineMs = Date.now() - refineStart;
        if (refineResult.wasRefined) {
          console.debug(`[generateAllDocuments] Refined: ${template.filePath} (${refineMs}ms)`);
          finalContent = refineResult.refined;
          wasRefined = true;
        } else if (refineResult.error) {
          console.warn(`[generateAllDocuments] Refinement failed for ${template.filePath} (${refineMs}ms): ${refineResult.error}`);
          warnings.push(
            `AI refinement skipped for ${template.filePath}: ${refineResult.error}`,
          );
        }
      }

      // 6. Upsert the generated document
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

      documents.push({
        filePath: template.filePath,
        completeness: result.completeness,
        missingFields: result.missingFields,
        wasRefined,
      });
    }

    // 7. Build completeness summary
    const summary = {
      total: documents.length,
      complete: documents.filter((d) => d.completeness === "complete").length,
      partial: documents.filter((d) => d.completeness === "partial").length,
      empty: documents.filter((d) => d.completeness === "empty").length,
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
    console.error("[generateAllDocuments] Error:", message);
    return {
      success: false,
      error: `Failed to generate documents: ${message}`,
      documents: [],
      warnings: [],
      summary: { total: 0, complete: 0, partial: 0, empty: 0 },
    };
  }
}
