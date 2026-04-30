"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export interface CancelSectionSuggestionsInput {
  projectId: string;
  sectionKey: string;
}

export async function cancelSectionSuggestions(
  input: CancelSectionSuggestionsInput,
): Promise<{ success: boolean; error?: string }> {
  const { projectId, sectionKey } = input;

  try {
    const section = await prisma.intakeSection.findUnique({
      where: { projectId_sectionKey: { projectId, sectionKey } },
    });

    if (!section) {
      return { success: false, error: "Section not found." };
    }

    // Delete all ai-suggested answers for this section
    await prisma.answer.deleteMany({
      where: {
        intakeSectionId: section.id,
        source: "ai-suggested",
      },
    });

    revalidatePath(`/projects/${projectId}/intake`);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to cancel suggestions." };
  }
}
