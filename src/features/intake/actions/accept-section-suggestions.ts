"use server";

import { prisma } from "@/lib/db/prisma";
import { acceptSectionSuggestionsSchema } from "@/lib/validation/intake";
import { revalidatePath } from "next/cache";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

export interface AcceptSectionSuggestionsInput {
  projectId: string;
  sectionKey: string;
  values: Record<string, string>;
}

export interface AcceptSectionSuggestionsResult {
  success: boolean;
  error?: string;
  coverageStatus?: string;
}

export async function acceptSectionSuggestions(
  input: AcceptSectionSuggestionsInput,
): Promise<AcceptSectionSuggestionsResult> {
  const parsed = acceptSectionSuggestionsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid input. Please check your values." };
  }

  const { projectId, sectionKey, values } = parsed.data;

  try {
    const section = await prisma.intakeSection.findUnique({
      where: { projectId_sectionKey: { projectId, sectionKey } },
    });

    if (!section) {
      return { success: false, error: "Section not found." };
    }

    // Promote ai-suggested answers to ai-inferred (accepted)
    for (const [fieldKey, value] of Object.entries(values)) {
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
    }

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

    return { success: true, coverageStatus };
  } catch {
    return { success: false, error: "Failed to accept suggestions. Please try again." };
  }
}
