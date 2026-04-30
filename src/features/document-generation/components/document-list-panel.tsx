"use client";

import { CompletenessSummary } from "./completeness-summary";

export interface DocumentItem {
  id: string;
  filePath: string;
  completeness: string;
  missingFields: string;
  generatedAt: string;
  manuallyEdited: boolean;
}

export interface DocumentListPanelProps {
  documents: DocumentItem[];
  summary: {
    total: number;
    complete: number;
    partial: number;
    empty: number;
  };
  selectedFilePath: string | null;
  onSelectDocument: (filePath: string) => void;
  onRegenerateAll: () => void;
  onRegenerateSingle: (filePath: string) => void;
  isGenerating: boolean;
}

function CompletenessIcon({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4 text-green-600 shrink-0"
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <circle cx="6" cy="6" r="5" />
      </svg>
    );
  }
  if (status === "partial") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4 text-yellow-500 shrink-0"
        viewBox="0 0 12 12"
      >
        <path d="M6 1a5 5 0 0 1 0 10V1z" fill="currentColor" />
        <circle
          cx="6"
          cy="6"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-gray-400 shrink-0"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6" cy="6" r="5" />
    </svg>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function DocumentListPanel({
  documents,
  summary,
  selectedFilePath,
  onSelectDocument,
  onRegenerateAll,
  onRegenerateSingle,
  isGenerating,
}: DocumentListPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-gray-200 px-4 py-3">
        <CompletenessSummary summary={summary} />

        <button
          type="button"
          disabled={isGenerating || documents.length === 0}
          onClick={onRegenerateAll}
          className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : "Regenerate All"}
        </button>
      </div>

      <nav aria-label="Generated documents" className="flex-1 overflow-y-auto">
        <ul role="list" className="divide-y divide-gray-100">
          {documents.map((doc) => {
            const isSelected = doc.filePath === selectedFilePath;

            return (
              <li key={doc.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectDocument(doc.filePath)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectDocument(doc.filePath);
                    }
                  }}
                  aria-current={isSelected ? "true" : undefined}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                    isSelected
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <CompletenessIcon status={doc.completeness} />

                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {doc.filePath}
                    </span>

                    <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <time dateTime={doc.generatedAt}>
                        {formatTimestamp(doc.generatedAt)}
                      </time>
                      {doc.manuallyEdited && (
                        <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                          edited
                        </span>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerateSingle(doc.filePath);
                    }}
                    aria-label={`Regenerate ${doc.filePath}`}
                    className="shrink-0 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
