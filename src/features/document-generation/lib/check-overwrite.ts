import { prisma } from "@/lib/db/prisma";
import type { GeneratedDocument } from "@/generated/prisma/client";

export async function getEditedDocumentsInScope(
  projectId: string,
  filePaths?: string[],
): Promise<GeneratedDocument[]> {
  return prisma.generatedDocument.findMany({
    where: {
      projectId,
      manuallyEdited: true,
      ...(filePaths ? { filePath: { in: filePaths } } : {}),
    },
  });
}
