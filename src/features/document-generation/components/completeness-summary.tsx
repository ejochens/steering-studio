"use client";

export interface CompletenessSummaryProps {
  summary: {
    total: number;
    complete: number;
    partial: number;
    empty: number;
  };
}

export function CompletenessSummary({ summary }: CompletenessSummaryProps) {
  if (summary.total === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Document completeness summary"
      className="flex items-center gap-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm"
    >
      <span className="text-gray-500">{summary.total} documents</span>

      <span className="flex items-center gap-1.5">
        <svg
          aria-hidden="true"
          className="h-3 w-3 text-green-600"
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <circle cx="6" cy="6" r="5" />
        </svg>
        <span className="text-gray-700">{summary.complete} complete</span>
      </span>

      <span className="flex items-center gap-1.5">
        <svg
          aria-hidden="true"
          className="h-3 w-3 text-yellow-500"
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
        <span className="text-gray-700">{summary.partial} partial</span>
      </span>

      <span className="flex items-center gap-1.5">
        <svg
          aria-hidden="true"
          className="h-3 w-3 text-gray-400"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="6" cy="6" r="5" />
        </svg>
        <span className="text-gray-700">{summary.empty} empty</span>
      </span>
    </div>
  );
}
