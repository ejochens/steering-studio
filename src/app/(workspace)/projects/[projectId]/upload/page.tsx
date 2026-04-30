import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { UploadForm } from "@/features/upload/components/upload-form";
import { canAccessUploadPage } from "@/features/upload/lib/access-control";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // 1. Fetch the project — 404 if not found
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, projectType: true, hasExistingDocs: true },
  });

  if (!project) {
    notFound();
  }

  // 2. Redirect if not an extension project with existing docs
  if (!canAccessUploadPage(project.projectType, project.hasExistingDocs)) {
    redirect(`/projects/${projectId}/intake`);
  }

  // 3. Load existing uploaded documents
  const existingDocuments = await prisma.uploadedDocument.findMany({
    where: { projectId },
    select: { id: true, filename: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Upload Documents
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload your existing project markdown files (.md, .markdown). The
          system will analyze them and pre-fill your intake form with extracted
          information.
        </p>
      </div>

      <UploadForm projectId={projectId} existingDocuments={existingDocuments} />
    </div>
  );
}
