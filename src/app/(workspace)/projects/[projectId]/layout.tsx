import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import WorkspaceNav from "@/components/layout/workspace-nav";
import ProjectProgress from "@/components/layout/project-progress";
import type { StepStatus } from "@/components/layout/project-progress";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      workingTitle: true,
      targetOutput: true,
      intakeSections: {
        select: { coverageStatus: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Compute step completion statuses
  const detailsDone =
    project.name.trim().length > 0 &&
    project.workingTitle.trim().length > 0 &&
    project.targetOutput.trim().length > 0;

  const intakeDone =
    project.intakeSections.length > 0 &&
    project.intakeSections.every((s) => s.coverageStatus === "complete");

  const reviewSession = await prisma.conversationSession.findUnique({
    where: { projectId },
    select: {
      _count: { select: { messages: true } },
    },
  });
  const reviewDone = (reviewSession?._count?.messages ?? 0) > 0;

  // Documents, Export are future features — always false for now
  const stepStatus: StepStatus = {
    details: detailsDone,
    intake: intakeDone,
    review: reviewDone,
    documents: false,
    export: false,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-700 hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-900 font-medium" aria-current="page">
            {project.name}
          </li>
        </ol>
      </nav>

      <ProjectProgress projectId={project.id} status={stepStatus} />

      <WorkspaceNav projectId={project.id} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
