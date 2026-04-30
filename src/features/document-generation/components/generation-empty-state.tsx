"use client";

export interface GenerationEmptyStateProps {
  onGenerate: () => void;
  hasProvider: boolean;
  isGenerating: boolean;
}

function GeneratingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative mb-6">
        <svg
          aria-hidden="true"
          className="h-16 w-16 text-blue-500 animate-pulse"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
          <svg
            aria-hidden="true"
            className="h-3 w-3 text-white animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Generating documents…
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-4">
        Assembling your intake data into templates and refining with AI. This
        may take a minute depending on the number of documents and your provider.
      </p>

      <div className="flex items-center gap-1.5" role="status" aria-label="Generating documents">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

export function GenerationEmptyState({
  onGenerate,
  hasProvider,
  isGenerating,
}: GenerationEmptyStateProps) {
  if (isGenerating) {
    return <GeneratingAnimation />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <svg
        aria-hidden="true"
        className="h-12 w-12 text-gray-400 mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        No documents generated yet
      </h2>
      <p className="text-sm text-gray-600 max-w-md mb-6">
        Generate steering documents from your project intake data. Documents are
        assembled from your confirmed answers using templates.
      </p>

      {!hasProvider && (
        <p className="text-xs text-gray-500 max-w-sm mb-4">
          AI refinement is unavailable without a configured provider. Template-only
          generation works without one.
        </p>
      )}

      <button
        type="button"
        onClick={onGenerate}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Generate Documents
      </button>
    </div>
  );
}
