"use server";

import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/utils/crypto";
import { parseDocuments } from "@/features/upload/lib/document-parser";
import { extractFacts, filterFactsForPersistence } from "@/features/upload/lib/import-extractor";
import type { ExistingAnswer } from "@/features/upload/lib/import-extractor";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { revalidatePath } from "next/cache";
import type { ProviderConfig } from "@/lib/ai/adapters/types";

export interface ExtractImportedFactsInput {
  projectId: string;
}

export interface ExtractImportedFactsResult {
  success: boolean;
  error?: string;
  factCount?: number;
  sectionsAffected?: number;
}

export async function extractImportedFacts(
  input: ExtractImportedFactsInput,
): Promise<ExtractImportedFactsResult> {
  const { projectId } = input;

  // 1. Validate projectId
  if (!projectId || projectId.trim() === "") {
    return { success: false, error: "Invalid project ID." };
  }

  try {
    // 2. Load UploadedDocument records for the project
    const documents = await prisma.uploadedDocument.findMany({
      where: { projectId },
    });

    if (documents.length === 0) {
      return { success: false, error: "No uploaded documents found for this project." };
    }

    // 3. Load ProviderConnection
    const provider = await prisma.providerConnection.findFirst();
    if (!provider) {
      return {
        success: false,
        error: "No AI provider configured. Please set up a provider connection in Settings.",
      };
    }

    // 4. Decrypt the secret
    const secret = provider.encryptedSecret
      ? decrypt(provider.encryptedSecret)
      : undefined;

    // 5. Parse documents into a single normalized payload
    const parsed = parseDocuments(
      documents.map((d) => ({ filename: d.filename, content: d.content })),
    );

    // 6. Build ProviderConfig
    const providerConfig: ProviderConfig = {
      providerType: provider.providerType as ProviderConfig["providerType"],
      endpoint: provider.endpoint ?? undefined,
      region: provider.region ?? undefined,
      modelName: provider.modelName,
      authMode: provider.authMode as ProviderConfig["authMode"],
      secret,
      apiVersion: provider.apiVersion ?? undefined,
    };

    // 7. Call extractFacts
    const extraction = await extractFacts(parsed.text, providerConfig, secret);

    if (!extraction.success) {
      return { success: false, error: extraction.error };
    }

    // 8. Load IntakeSections with their answers for the project
    const sections = await prisma.intakeSection.findMany({
      where: { projectId },
      include: { answers: true },
    });

    // 9. Build existing answers map and filter facts using pure helper
    const existingAnswersBySectionKey: Record<string, ExistingAnswer[]> = {};
    for (const section of sections) {
      existingAnswersBySectionKey[section.sectionKey] = section.answers.map((a) => ({
        fieldKey: a.fieldKey,
        source: a.source,
      }));
    }

    const factsToWrite = filterFactsForPersistence(
      extraction.facts,
      existingAnswersBySectionKey,
    );

    // 10. Persist filtered facts as ai-suggested answers
    let factCount = 0;
    const affectedSectionKeys = new Set<string>();

    for (const [sectionKey, fields] of Object.entries(factsToWrite)) {
      const section = sections.find((s) => s.sectionKey === sectionKey);
      if (!section) continue;

      for (const [fieldKey, value] of Object.entries(fields)) {
        await prisma.answer.upsert({
          where: {
            intakeSectionId_fieldKey: {
              intakeSectionId: section.id,
              fieldKey,
            },
          },
          create: {
            intakeSectionId: section.id,
            fieldKey,
            value,
            source: "ai-suggested",
          },
          update: {
            value,
            source: "ai-suggested",
          },
        });

        factCount++;
        affectedSectionKeys.add(sectionKey);
      }
    }

    // 11. Recalculate coverage for each affected section
    for (const sectionKey of affectedSectionKeys) {
      const section = sections.find((s) => s.sectionKey === sectionKey);
      const sectionDef = INTAKE_SECTIONS.find(
        (s) => s.sectionKey === sectionKey,
      );
      if (!section || !sectionDef) continue;

      const allAnswers = await prisma.answer.findMany({
        where: { intakeSectionId: section.id },
        select: { fieldKey: true, value: true },
      });
      const answerMap = new Map(allAnswers.map((a) => [a.fieldKey, a.value]));
      const coverageStatus = calculateCoverage(sectionDef.fields, answerMap);

      await prisma.intakeSection.update({
        where: { id: section.id },
        data: { coverageStatus },
      });
    }

    // 12. Revalidate the intake path
    revalidatePath(`/projects/${projectId}/intake`);

    return {
      success: true,
      factCount,
      sectionsAffected: affectedSectionKeys.size,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[extractImportedFacts] Error:", message);
    return {
      success: false,
      error: `Failed to extract facts from documents: ${message}`,
    };
  }
}
