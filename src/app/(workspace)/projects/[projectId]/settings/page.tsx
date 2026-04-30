import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import ProjectSettingsForm from "@/features/projects/components/project-settings-form";
import type { TargetOutput, ProjectType } from "@/lib/validation/project";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, workingTitle: true, targetOutput: true, projectType: true, hasExistingDocs: true, codebasePath: true },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="max-w-xl">
      <section>
        <h2 className="text-base font-semibold text-gray-900">Project settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Update your project configuration. Changes take effect on the next document generation.
        </p>
        <div className="mt-6">
          <ProjectSettingsForm
            projectId={project.id}
            currentName={project.name}
            currentWorkingTitle={project.workingTitle}
            currentTargetOutput={project.targetOutput as TargetOutput}
            currentProjectType={project.projectType as ProjectType}
            currentHasExistingDocs={project.hasExistingDocs}
            currentCodebasePath={project.codebasePath ?? undefined}
          />
        </div>
      </section>
    </div>
  );
}
