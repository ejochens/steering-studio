"use client";

import Link from "next/link";

export interface ExportEmptyStateProps {
  projectId: string;
}

export function ExportEmptyState({ projectId }: ExportEmptyStateProps) {
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
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
        />
      </svg>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        No documents to export
      </h2>
      <p className="text-sm text-gray-600 max-w-md mb-6">
        You need to generate steering documents before you can export them.
        Head over to the documents page to get started.
      </p>

      <Link
        href={`/projects/${projectId}/documents`}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Go to Documents
      </Link>
    </div>
  );
}
