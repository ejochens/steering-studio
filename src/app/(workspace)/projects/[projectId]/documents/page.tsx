import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { DocumentsWorkspace } from "@/features/document-generation/components/documents-workspace";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    notFound();
  }

  const documents = await prisma.generatedDocument.findMany({
    where: { projectId },
    orderBy: { filePath: "asc" },
  });

  const provider = await prisma.providerConnection.findFirst({
    select: { id: true, modelName: true },
  });

  // Check if the generation-assigned provider is a "pro" model (typically slower)
  let generationModelName: string | null = null;
  const genAssignment = await prisma.modelAssignment.findUnique({
    where: { aiFunction: "generation" },
    select: { providerConnection: { select: { modelName: true } } },
  });
  if (genAssignment?.providerConnection?.modelName) {
    generationModelName = genAssignment.providerConnection.modelName;
  } else if (provider?.modelName) {
    // Fall back to default provider
    generationModelName = provider.modelName;
  }

  const serializedDocuments = documents.map((doc) => ({
    id: doc.id,
    filePath: doc.filePath,
    completeness: doc.completeness,
    missingFields: doc.missingFields,
    generatedAt: doc.generatedAt.toISOString(),
    manuallyEdited: doc.manuallyEdited,
    content: doc.content,
    draftContent: doc.draftContent,
  }));

  return (
    <DocumentsWorkspace
      projectId={projectId}
      initialDocuments={serializedDocuments}
      hasProvider={!!provider}
      generationModelName={generationModelName}
    />
  );
}
