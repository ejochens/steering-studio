"use client";

export interface SidebarSection {
  sectionKey: string;
  displayName: string;
  coverageStatus: string;
}

export interface CompletenessSidebarProps {
  sections: SidebarSection[];
  onSectionClick: (sectionKey: string) => void;
}

function CoverageIcon({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <svg aria-hidden="true" className="h-4 w-4 text-green-600 shrink-0" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="6" cy="6" r="5" />
      </svg>
    );
  }
  if (status === "partial") {
    return (
      <svg aria-hidden="true" className="h-4 w-4 text-yellow-600 shrink-0" viewBox="0 0 12 12">
        <path d="M6 1a5 5 0 0 1 0 10V1z" fill="currentColor" />
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-gray-400 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="5" />
    </svg>
  );
}

function statusLabel(status: string): string {
  if (status === "complete") return "Complete";
  if (status === "partial") return "Partial";
  return "Not started";
}

export function CompletenessSidebar({
  sections,
  onSectionClick,
}: CompletenessSidebarProps) {
  return (
    <nav aria-label="Section completeness" className="space-y-1">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Sections
      </h2>
      {sections.map((section) => (
        <button
          key={section.sectionKey}
          type="button"
          onClick={() => onSectionClick(section.sectionKey)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <CoverageIcon status={section.coverageStatus} />
          <span className="flex-1 truncate">{section.displayName}</span>
          <span className="text-xs text-gray-500">{statusLabel(section.coverageStatus)}</span>
        </button>
      ))}
    </nav>
  );
}
