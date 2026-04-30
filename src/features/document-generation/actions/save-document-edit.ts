"use server";

import { prisma } from "@/lib/db/prisma";
import { saveDocumentEditSchema } from "@/lib/validation/generated-document";
import { revalidatePath } from "next/cache";

// ── Result type ──────────────────────────────────────────────────────

interface SaveEditResult {
  success: boolean;
  error?: string;
}

// ── Server action ────────────────────────────────────────────────────

export async function saveDocumentEdit(
  documentId: string,
  content: string,
): Promise<SaveEditResult> {
  const parsed = saveDocumentEditSchema.safeParse({ documentId, content });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input. documentId and content are required.",
    };
  }

  try {
    // 1. Fetch the document to get projectId for revalidation
    const existing = await prisma.generatedDocument.findUnique({
      where: { id: parsed.data.documentId },
      select: { id: true, projectId: true },
    });

    if (!existing) {
      return {
        success: false,
        error: "Document not found.",
      };
    }

    // 2. Update content and mark as manually edited
    await prisma.generatedDocument.update({
      where: { id: parsed.data.documentId },
      data: {
        content: parsed.data.content,
        manuallyEdited: true,
      },
    });

    // 3. Revalidate the documents page
    revalidatePath(`/projects/${existing.projectId}/documents`);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[saveDocumentEdit] Error:", message);
    return {
      success: false,
      error: `Failed to save document edit: ${message}`,
    };
  }
}
