"use server";

import { prisma } from "@/lib/db/prisma";
import { updateProjectSettingsSchema, type UpdateProjectSettingsInput } from "@/lib/validation/project";
import { revalidatePath } from "next/cache";

export async function updateProjectSettings(
  projectId: string,
  data: UpdateProjectSettingsInput,
) {
  const parsed = updateProjectSettingsSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid input. Please check your values." };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.data.name,
        workingTitle: parsed.data.workingTitle,
        targetOutput: parsed.data.targetOutput,
        projectType: parsed.data.projectType,
        hasExistingDocs: parsed.data.hasExistingDocs,
        codebasePath: parsed.data.codebasePath ?? null,
      },
    });
  } catch {
    return { error: "Failed to update project settings. Please try again." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
