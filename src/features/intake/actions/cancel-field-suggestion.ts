"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export interface CancelFieldSuggestionInput {
  projectId: string;
  sectionKey: string;
  fieldKey: string;
}

export async function cancelFieldSuggestion(
  input: CancelFieldSuggestionInput,
): Promise<{ success: boolean; error?: string }> {
  const { projectId, sectionKey, fieldKey } = input;

  try {
    const section = await prisma.intakeSection.findUnique({
      where: { projectId_sectionKey: { projectId, sectionKey } },
    });

    if (!section) {
      return { success: false, error: "Section not found." };
    }

    // Only delete if the answer is ai-suggested
    await prisma.answer.deleteMany({
      where: {
        intakeSectionId: section.id,
        fieldKey,
        source: "ai-suggested",
      },
    });

    revalidatePath(`/projects/${projectId}/intake`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to cancel suggestion." };
  }
}
