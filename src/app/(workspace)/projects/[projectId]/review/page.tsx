import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { ReviewChat } from "@/features/review/components/review-chat";
import { ReviewSidebar } from "@/features/review/components/review-sidebar";
import { FactReviewPanel } from "@/features/review/components/fact-review-panel";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // 1. Load the project — 404 if not found
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!project) {
    notFound();
  }

  // 2. Check if a provider is configured
  const provider = await prisma.providerConnection.findFirst({
    select: { id: true },
  });
  const providerConfigured = !!provider;

  // 3. Load the conversation session (if any)
  const session = await prisma.conversationSession.findUnique({
    where: { projectId },
    select: { id: true },
  });

  // 4. Load messages for the session, ordered chronologically
  const messages = session
    ? await prisma.conversationMessage.findMany({
        where: { sessionId: session.id },
        select: { id: true, role: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // 5. Load intake sections with coverage status for the sidebar
  const intakeSections = await prisma.intakeSection.findMany({
    where: { projectId },
    select: { sectionKey: true, displayName: true, coverageStatus: true },
    orderBy: { sortOrder: "asc" },
  });

  // Build sidebar data — fall back to config definitions if no DB rows yet
  const sidebarSections =
    intakeSections.length > 0
      ? intakeSections.map((s) => ({
          sectionKey: s.sectionKey,
          displayName: s.displayName,
          coverageStatus: s.coverageStatus,
        }))
      : INTAKE_SECTIONS.map((s) => ({
          sectionKey: s.sectionKey,
          displayName: s.displayName,
          coverageStatus: "unknown",
        }));

  // Serialize messages for the client component
  const initialMessages = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  // 6. No-provider state
  if (!providerConfigured) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h2 className="text-base font-semibold text-yellow-800">
            Provider not configured
          </h2>
          <p className="mt-1 text-sm text-yellow-700">
            An AI provider connection is required for the review conversation.
            Please configure one in Settings.
          </p>
          <Link
            href="/settings/provider"
            className="mt-4 inline-block rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            Go to Provider Settings
          </Link>
        </div>
        <aside>
          <ReviewSidebar sections={sidebarSections} />
        </aside>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      <main>
        <ReviewChat
          projectId={projectId}
          initialMessages={initialMessages}
          sessionId={session?.id ?? null}
          providerConfigured={providerConfigured}
        />
        <FactReviewPanel
          projectId={projectId}
          messageCount={initialMessages.length}
        />
      </main>
      <aside>
        <ReviewSidebar sections={sidebarSections} />
      </aside>
    </div>
  );
}
