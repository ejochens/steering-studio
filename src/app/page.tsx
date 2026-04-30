import Link from "next/link";
import type { Project } from "@/types/project";
import { prisma } from "@/lib/db/prisma";

function statusLabel(status: Project["status"]): string {
  switch (status) {
    case "setup":
      return "Setting up";
    case "intake":
      return "Intake in progress";
    case "review":
      return "Ready for review";
    case "generating":
      return "Generating documents";
    case "complete":
      return "Complete";
  }
}

function isInProgress(status: Project["status"]): boolean {
  return status !== "complete";
}

function ProviderStatus({
  configured,
}: Readonly<{ configured: boolean }>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              configured ? "bg-green-500" : "bg-amber-500"
            }`}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-700">
            AI Provider: {configured ? "Configured" : "Not configured"}
          </span>
        </div>
        <Link
          href="/settings/provider"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          {configured ? "Manage" : "Configure"}
        </Link>
      </div>
      {!configured && (
        <p className="mt-2 text-xs text-gray-500">
          Configure a provider connection to enable AI-assisted features.
        </p>
      )}
    </div>
  );
}

function WelcomeState() {
  return (
    <section
      className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center"
      aria-label="Welcome"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Welcome to Steering Studio
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Create structured context packs that make AI development tools more
        effective. Start by creating your first project.
      </p>
      <Link
        href="/projects/new"
        className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        New Project
      </Link>
    </section>
  );
}

function ProjectCard({ project }: Readonly<{ project: Project }>) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Target: {project.targetOutput}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {statusLabel(project.status)}
          </p>
        </div>
        {isInProgress(project.status) && (
          <Link
            href={`/projects/${project.id}`}
            className="ml-4 shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue
          </Link>
        )}
      </div>
    </li>
  );
}

export default async function HomePage() {
  const [projects, providerConnection] = await Promise.all([
    prisma.project.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.providerConnection.findFirst(),
  ]);

  const isProviderConfigured = providerConnection !== null;
  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        {hasProjects && (
          <Link
            href="/projects/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New Project
          </Link>
        )}
      </div>

      <div className="mt-6">
        <ProviderStatus configured={isProviderConfigured} />
      </div>

      <div className="mt-6">
        {hasProjects ? (
          <ul className="space-y-3" role="list" aria-label="Projects">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project as Project} />
            ))}
          </ul>
        ) : (
          <WelcomeState />
        )}
      </div>
    </div>
  );
}
