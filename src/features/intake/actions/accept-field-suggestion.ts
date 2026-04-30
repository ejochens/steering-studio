"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

export interface AcceptFieldSuggestionInput {
  projectId: string;
  sectionKey: string;
  fieldKey: string;
  value: string;
}

export async function acceptFieldSuggestion(
  input: AcceptFieldSuggestionInput,
): Promise<{ success: boolean; error?: string }> {
  const { projectId, sectionKey, fieldKey, value } = input;

  try {
    const section = await prisma.intakeSection.findUnique({
      where: { projectId_sectionKey: { projectId, sectionKey } },
    });

    if (!section) {
      return { success: false, error: "Section not found." };
    }

    // Upsert the answer, promoting to ai-inferred (accepted)
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
        source: "ai-inferred",
      },
      update: {
        value,
        source: "ai-inferred",
      },
    });

    // Recalculate coverage
    const sectionDef = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey);
    const allAnswers = await prisma.answer.findMany({
      where: { intakeSectionId: section.id },
      select: { fieldKey: true, value: true },
    });
    const answerMap = new Map(allAnswers.map((a) => [a.fieldKey, a.value]));
    const coverageStatus = sectionDef
      ? calculateCoverage(sectionDef.fields, answerMap)
      : "unknown";

    await prisma.intakeSection.update({
      where: { id: section.id },
      data: { coverageStatus },
    });

    revalidatePath(`/projects/${projectId}/intake`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to accept suggestion." };
  }
}
