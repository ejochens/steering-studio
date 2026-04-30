import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { initIntakeSections } from "@/features/intake/actions/init-intake-sections";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { IntakeAccordion } from "@/features/intake/components/intake-accordion";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // 1. Fetch the project — 404 if not found
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!project) {
    notFound();
  }

  // 2. Check if a provider is configured
  const provider = await prisma.providerConnection.findFirst({ select: { id: true } });

  // 3. Ensure intake sections exist for this project
  try {
    await initIntakeSections(projectId);
  } catch {
    return <IntakeError projectId={projectId} />;
  }

  // 4. Load sections with their answers, ordered by sortOrder
  let sections;
  try {
    sections = await prisma.intakeSection.findMany({
      where: { projectId },
      include: { answers: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return <IntakeError projectId={projectId} />;
  }

  // 5. Transform DB rows into the shape the client component expects
  const sectionData = sections.map((section) => {
    const def = INTAKE_SECTIONS.find((s) => s.sectionKey === section.sectionKey);
    const answerMap: Record<string, { value: string; source: string }> = {};
    for (const answer of section.answers) {
      answerMap[answer.fieldKey] = {
        value: answer.value,
        source: answer.source,
      };
    }

    return {
      sectionKey: section.sectionKey,
      displayName: section.displayName,
      description: def?.description ?? "",
      sortOrder: section.sortOrder,
      coverageStatus: section.coverageStatus,
      fields: def?.fields ?? [],
      answers: answerMap,
    };
  });

  return (
    <IntakeAccordion
      projectId={projectId}
      sections={sectionData}
      providerConfigured={!!provider}
    />
  );
}

function IntakeError({ projectId }: { projectId: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <h2 className="text-base font-semibold text-red-800">
        Failed to load intake data
      </h2>
      <p className="mt-1 text-sm text-red-700">
        Something went wrong while loading the intake sections. Please try
        again.
      </p>
      <a
        href={`/projects/${projectId}/intake`}
        className="mt-4 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Retry
      </a>
    </div>
  );
}
