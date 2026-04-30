"use server";

import { prisma } from "@/lib/db/prisma";
import { acceptReviewFactSchema } from "@/lib/validation/review";
import { revalidatePath } from "next/cache";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

export interface AcceptReviewFactResult {
  success: boolean;
  error?: string;
}

export async function acceptReviewFact(
  input: unknown,
): Promise<AcceptReviewFactResult> {
  // 1. Validate input
  const parsed = acceptReviewFactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input. Please check your values." };
  }

  const { projectId, sectionKey, fieldKey, value } = parsed.data;

  try {
    // 2. Look up the IntakeSection by (projectId, sectionKey)
    const section = await prisma.intakeSection.findUnique({
      where: { projectId_sectionKey: { projectId, sectionKey } },
    });

    if (!section) {
      return { success: false, error: "Section not found." };
    }

    // 3. Use a transaction to upsert answer and recalculate coverage
    await prisma.$transaction(async (tx) => {
      // 3a. Upsert the Answer row with source "ai-conversation"
      await tx.answer.upsert({
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
          source: "ai-conversation",
        },
        update: {
          value,
          source: "ai-conversation",
        },
      });

      // 3b. Load all answers for the section
      const allAnswers = await tx.answer.findMany({
        where: { intakeSectionId: section.id },
        select: { fieldKey: true, value: true },
      });

      // 3c. Calculate new coverage status
      const sectionDef = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey);
      const answerMap = new Map(allAnswers.map((a) => [a.fieldKey, a.value]));
      const coverageStatus = sectionDef
        ? calculateCoverage(sectionDef.fields, answerMap)
        : "unknown";

      // 3d. Update the IntakeSection coverageStatus
      await tx.intakeSection.update({
        where: { id: section.id },
        data: { coverageStatus },
      });
    });

    // 4. Revalidate both review and intake paths
    revalidatePath(`/projects/${projectId}/review`);
    revalidatePath(`/projects/${projectId}/intake`);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to accept fact. Please try again." };
  }
}
