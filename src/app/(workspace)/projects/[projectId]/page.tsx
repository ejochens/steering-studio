import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { buildChecklistItems, type ChecklistItem } from "./lib/build-checklist";

function ChecklistIcon({ done }: Readonly<{ done: boolean }>) {
  if (done) {
    return (
      <svg
        className="h-5 w-5 text-green-600 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5 text-gray-300 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function SetupChecklist({
  items,
  nextActionIndex,
}: Readonly<{ items: ChecklistItem[]; nextActionIndex: number }>) {
  return (
    <section aria-label="Setup checklist">
      <h2 className="text-base font-semibold text-gray-900">Setup checklist</h2>
      <ul className="mt-3 space-y-3" role="list">
        {items.map((item, index) => {
          const isNext = index === nextActionIndex;
          return (
            <li
              key={item.label}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                isNext
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <ChecklistIcon done={item.done} />
              <span
                className={`flex-1 text-sm ${
                  item.done ? "text-gray-500" : "text-gray-900 font-medium"
                }`}
              >
                {item.label}
              </span>
              {!item.done && item.href && (
                <Link
                  href={item.href}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isNext
                      ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400"
                  }`}
                >
                  {item.actionLabel ?? "Set up"}
                </Link>
              )}
              {item.done && (
                <span className="shrink-0 text-xs text-green-700">Done</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProjectSummary({
  project,
}: Readonly<{ project: { id: string; name: string; workingTitle: string; targetOutput: string } }>) {
  const { name, workingTitle, targetOutput } = project;
  return (
    <section aria-label="Project details">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Project details</h2>
        <Link
          href={`/projects/${project.id}/settings`}
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          Edit settings
        </Link>
      </div>
      <dl className="mt-3 rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        <div className="px-4 py-3">
          <dt className="text-xs text-gray-500">Name</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">{name}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-gray-500">Working title</dt>
          <dd className="mt-1 text-sm text-gray-900">{workingTitle}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-gray-500">Target output</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">{targetOutput}</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project, providerConnection] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.providerConnection.findFirst(),
  ]);

  if (!project) {
    notFound();
  }

  const isExtensionWithDocs =
    project.projectType === "extension" && project.hasExistingDocs === true;

  const [uploadedDocumentCount, extractedFactCount, answerCount, generatedDocumentCount] =
    await Promise.all([
      isExtensionWithDocs
        ? prisma.uploadedDocument.count({ where: { projectId } })
        : Promise.resolve(0),
      isExtensionWithDocs
        ? prisma.answer.count({
            where: {
              intakeSection: { projectId },
              source: "ai-suggested",
            },
          })
        : Promise.resolve(0),
      prisma.answer.count({
        where: { intakeSection: { projectId } },
      }),
      prisma.generatedDocument.count({ where: { projectId } }),
    ]);

  const isProviderConfigured = providerConnection !== null;

  const checklistItems: ChecklistItem[] = buildChecklistItems({
    projectType: project.projectType,
    hasExistingDocs: project.hasExistingDocs,
    isProviderConfigured,
    uploadedDocumentCount,
    extractedFactCount,
    answerCount,
    generatedDocumentCount,
    projectId,
  });

  const nextActionIndex = checklistItems.findIndex((item) => !item.done);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {project.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {nextActionIndex === -1
            ? "All setup steps are complete."
            : `Next step: ${checklistItems[nextActionIndex].label.toLowerCase()}`}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <SetupChecklist items={checklistItems} nextActionIndex={nextActionIndex} />
        <ProjectSummary
          project={{
            id: project.id,
            name: project.name,
            workingTitle: project.workingTitle,
            targetOutput: project.targetOutput,
          }}
        />
      </div>
    </div>
  );
}
