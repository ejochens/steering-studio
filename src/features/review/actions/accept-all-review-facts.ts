"use server";

import { prisma } from "@/lib/db/prisma";
import { acceptReviewFactSchema } from "@/lib/validation/review";
import { revalidatePath } from "next/cache";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { z } from "zod/v4";

export interface AcceptAllReviewFactsResult {
  success: boolean;
  error?: string;
}

const acceptAllReviewFactsSchema = z.array(acceptReviewFactSchema).min(1);

export async function acceptAllReviewFacts(
  input: unknown,
): Promise<AcceptAllReviewFactsResult> {
  // 1. Validate that input is an array and each entry matches acceptReviewFactSchema
  const parsed = acceptAllReviewFactsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input. Each fact must have projectId, sectionKey, fieldKey, and value." };
  }

  const facts = parsed.data;

  try {
    // 2. Group facts by sectionKey for efficient coverage recalculation
    const factsBySectionKey = new Map<string, typeof facts>();
    for (const fact of facts) {
      const group = factsBySectionKey.get(fact.sectionKey) ?? [];
      group.push(fact);
      factsBySectionKey.set(fact.sectionKey, group);
    }

    // 3. Use a single transaction to upsert all answers and recalculate coverage
    await prisma.$transaction(async (tx) => {
      for (const [sectionKey, sectionFacts] of factsBySectionKey) {
        const { projectId } = sectionFacts[0];

        // 3a. Look up the IntakeSection
        const section = await tx.intakeSection.findUnique({
          where: { projectId_sectionKey: { projectId, sectionKey } },
        });

        if (!section) {
          throw new Error(`Section "${sectionKey}" not found for project.`);
        }

        // 3b. Upsert each Answer row with source "ai-conversation"
        for (const fact of sectionFacts) {
          await tx.answer.upsert({
            where: {
              intakeSectionId_fieldKey: {
                intakeSectionId: section.id,
                fieldKey: fact.fieldKey,
              },
            },
            create: {
              intakeSectionId: section.id,
              fieldKey: fact.fieldKey,
              value: fact.value,
              source: "ai-conversation",
            },
            update: {
              value: fact.value,
              source: "ai-conversation",
            },
          });
        }

        // 3c. Load all answers for the section and recalculate coverage
        const allAnswers = await tx.answer.findMany({
          where: { intakeSectionId: section.id },
          select: { fieldKey: true, value: true },
        });

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
      }
    });

    // 4. Revalidate both review and intake paths using projectId from the first fact
    const projectId = facts[0].projectId;
    revalidatePath(`/projects/${projectId}/review`);
    revalidatePath(`/projects/${projectId}/intake`);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to accept facts. Please try again." };
  }
}
