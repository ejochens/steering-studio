"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { uploadDocumentsSchema } from "@/lib/validation/upload";

interface UploadDocumentsResult {
  success: boolean;
  error?: string;
  documentCount?: number;
}

export async function uploadDocuments(
  data: unknown
): Promise<UploadDocumentsResult> {
  const parsed = uploadDocumentsSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Invalid upload data." };
  }

  const { projectId, files } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Find all IntakeSection IDs for this project
      const sections = await tx.intakeSection.findMany({
        where: { projectId },
        select: { id: true },
      });

      const sectionIds = sections.map((s) => s.id);

      // Delete existing UploadedDocument records for this project
      await tx.uploadedDocument.deleteMany({
        where: { projectId },
      });

      // Delete ai-suggested Answer rows for this project's sections
      if (sectionIds.length > 0) {
        await tx.answer.deleteMany({
          where: {
            intakeSectionId: { in: sectionIds },
            source: "ai-suggested",
          },
        });
      }

      // Create new UploadedDocument rows
      await tx.uploadedDocument.createMany({
        data: files.map((file) => ({
          projectId,
          filename: file.filename,
          content: file.content,
        })),
      });
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true, documentCount: files.length };
  } catch {
    return { success: false, error: "Failed to upload documents." };
  }
}
