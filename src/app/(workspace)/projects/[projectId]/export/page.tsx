import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import type { TargetOutput } from "@/lib/validation";
import {
  getDefaultScope,
  getAllowedScopes,
  getTemplatesForScope,
} from "@/features/export/lib/scope";
import { validateExportReadiness } from "@/features/export/lib/validate-export";
import { ExportEmptyState } from "@/features/export/components/export-empty-state";
import { ExportWorkspace } from "@/features/export/components/export-workspace";
import { assembleKnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { getTemplatesForTarget } from "@/features/document-generation/lib/template-registry";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, targetOutput: true },
  });

  if (!project) {
    notFound();
  }

  const targetOutput = project.targetOutput as TargetOutput;

  const documents = await prisma.generatedDocument.findMany({
    where: { projectId },
    select: {
      filePath: true,
      content: true,
      completeness: true,
      missingFields: true,
    },
  });

  if (documents.length === 0) {
    return <ExportEmptyState projectId={projectId} />;
  }

  const defaultScope = getDefaultScope(targetOutput);
  const allowedScopes = getAllowedScopes(targetOutput);

  // Assemble the knowledge model so we can filter out non-applicable templates
  const model = await assembleKnowledgeModel(projectId);

  const templates = getTemplatesForScope(defaultScope, targetOutput);
  const applicableTemplates = templates.filter((t) => t.isApplicable(model));
  const expectedTemplates = applicableTemplates.map((t) => ({
    filePath: t.filePath,
    required: t.required,
  }));
  const readiness = validateExportReadiness(documents, expectedTemplates);

  // Compute all applicable file paths across all targets for client-side scope switching
  const allTemplatesForTarget = getTemplatesForTarget(targetOutput);
  const allApplicableFilePaths = allTemplatesForTarget
    .filter((t) => t.isApplicable(model))
    .map((t) => t.filePath);

  return (
    <ExportWorkspace
      projectId={projectId}
      projectName={project.name}
      targetOutput={targetOutput}
      readiness={readiness}
      defaultScope={defaultScope}
      allowedScopes={allowedScopes}
      allDocuments={documents}
      applicableFilePaths={allApplicableFilePaths}
    />
  );
}
