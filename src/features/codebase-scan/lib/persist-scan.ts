import { prisma } from "@/lib/db/prisma";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import type { ScanResult, PersistResult } from "./types";

/**
 * Persists scan results as Answer records, respecting source precedence:
 * - user-form answers are never overwritten
 * - codebase-scan / ai-codebase-scan answers are overwritten with new values
 * - missing answers are created
 *
 * After all upserts, recalculates coverageStatus for each affected IntakeSection.
 */
export async function persistScanResults(
  projectId: string,
  scanResult: ScanResult,
): Promise<PersistResult> {
  let fieldsCreated = 0;
  let fieldsUpdated = 0;
  let fieldsSkipped = 0;

  const affectedSectionIds = new Set<string>();

  for (const fact of scanResult.facts) {
    // Look up the IntakeSection by (projectId, sectionKey)
    const section = await prisma.intakeSection.findUnique({
      where: {
        projectId_sectionKey: { projectId, sectionKey: fact.sectionKey },
      },
    });

    if (!section) {
      // Section doesn't exist for this project — skip
      fieldsSkipped++;
      continue;
    }

    // Check existing Answer for (intakeSectionId, fieldKey)
    const existingAnswer = await prisma.answer.findUnique({
      where: {
        intakeSectionId_fieldKey: {
          intakeSectionId: section.id,
          fieldKey: fact.fieldKey,
        },
      },
    });

    if (existingAnswer) {
      if (existingAnswer.source === "user-form") {
        // Preserve user input — never overwrite
        fieldsSkipped++;
        continue;
      }

      // Existing answer is codebase-scan or ai-codebase-scan — overwrite
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          value: fact.value,
          source: fact.source,
        },
      });
      fieldsUpdated++;
    } else {
      // No answer exists — create new
      await prisma.answer.create({
        data: {
          intakeSectionId: section.id,
          fieldKey: fact.fieldKey,
          value: fact.value,
          source: fact.source,
        },
      });
      fieldsCreated++;
    }

    affectedSectionIds.add(section.id);
  }

  // Recalculate coverageStatus for each affected IntakeSection
  for (const sectionId of affectedSectionIds) {
    const section = await prisma.intakeSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) continue;

    const sectionDef = INTAKE_SECTIONS.find(
      (s) => s.sectionKey === section.sectionKey,
    );

    const allAnswers = await prisma.answer.findMany({
      where: { intakeSectionId: sectionId },
      select: { fieldKey: true, value: true },
    });

    const answerMap = new Map(allAnswers.map((a) => [a.fieldKey, a.value]));
    const coverageStatus = sectionDef
      ? calculateCoverage(sectionDef.fields, answerMap)
      : "unknown";

    await prisma.intakeSection.update({
      where: { id: sectionId },
      data: { coverageStatus },
    });
  }

  return { fieldsCreated, fieldsUpdated, fieldsSkipped };
}
