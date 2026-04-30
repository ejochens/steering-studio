"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface DocumentPreviewProps {
  filePath: string;
  content: string;
  onEdit: () => void;
}

export function DocumentPreview({
  filePath,
  content,
  onEdit,
}: DocumentPreviewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <h2 className="truncate text-sm font-semibold text-gray-900">
          {filePath}
        </h2>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Edit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <article
          aria-label={`Preview of ${filePath}`}
          className="prose prose-sm prose-gray max-w-none"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
