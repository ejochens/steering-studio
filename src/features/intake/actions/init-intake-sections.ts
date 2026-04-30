"use server";

import { prisma } from "@/lib/db/prisma";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

/**
 * Ensures all IntakeSection rows exist for a project.
 * Creates any missing sections while preserving existing ones.
 * Called from the intake page server component on load. Idempotent.
 */
export async function initIntakeSections(projectId: string): Promise<void> {
  const existing = await prisma.intakeSection.findMany({
    where: { projectId },
    select: { sectionKey: true },
  });

  const existingKeys = new Set(existing.map((s) => s.sectionKey));

  const missingSections = INTAKE_SECTIONS.filter(
    (section) => !existingKeys.has(section.sectionKey),
  );

  if (missingSections.length === 0) {
    return;
  }

  await prisma.intakeSection.createMany({
    data: missingSections.map((section) => ({
      projectId,
      sectionKey: section.sectionKey,
      displayName: section.displayName,
      sortOrder: section.sortOrder,
      coverageStatus: "unknown",
    })),
  });
}
