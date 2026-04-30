"use server";

import { prisma } from "@/lib/db/prisma";
import { saveAnswerSchema } from "@/lib/validation/intake";
import { revalidatePath } from "next/cache";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

export interface SaveAnswerInput {
  projectId: string;
  sectionKey: string;
  fieldKey: string;
  value: string;
}

export interface SaveAnswerResult {
  success: boolean;
  error?: string;
  coverageStatus?: string;
}

export async function saveAnswer(input: SaveAnswerInput): Promise<SaveAnswerResult> {
  const parsed = saveAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid input. Please check your values." };
  }

  const { projectId, sectionKey, fieldKey, value } = parsed.data;

  try {
    // 1. Look up the IntakeSection by (projectId, sectionKey)
    const section = await prisma.intakeSection.findUnique({
      where: { projectId_sectionKey: { projectId, sectionKey } },
    });

    if (!section) {
      return { success: false, error: "Section not found." };
    }

    // 2. Upsert the Answer row by (intakeSectionId, fieldKey)
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
        source: "user-form",
      },
      update: {
        value,
        source: "user-form",
      },
    });

    // 3. Recalculate coverage for the section
    const sectionDef = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey);
    const allAnswers = await prisma.answer.findMany({
      where: { intakeSectionId: section.id },
      select: { fieldKey: true, value: true },
    });

    const answerMap = new Map(allAnswers.map((a) => [a.fieldKey, a.value]));
    const coverageStatus = sectionDef
      ? calculateCoverage(sectionDef.fields, answerMap)
      : "unknown";

    // 4. Update IntakeSection.coverageStatus
    await prisma.intakeSection.update({
      where: { id: section.id },
      data: { coverageStatus },
    });

    // 5. If project status is "setup", transition to "intake"
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });

    if (project?.status === "setup") {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "intake" },
      });
    }

    revalidatePath(`/projects/${projectId}/intake`);

    return { success: true, coverageStatus };
  } catch {
    return { success: false, error: "Failed to save answer. Please try again." };
  }
}
