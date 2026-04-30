"use client";

import { useState } from "react";
import { saveDocumentEdit } from "@/features/document-generation/actions/save-document-edit";

export interface DocumentEditorProps {
  documentId: string;
  filePath: string;
  initialContent: string;
  onSave: () => void;
  onCancel: () => void;
}

function MarkdownHelpGuide() {
  return (
    <details className="border-t border-gray-200 bg-gray-50 px-6 py-3">
      <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-800 select-none">
        Markdown formatting reference
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-600">
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800"># Heading 1</code>
            <span className="text-gray-400">Top-level heading</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">## Heading 2</code>
            <span className="text-gray-400">Section heading</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">### Heading 3</code>
            <span className="text-gray-400">Subsection</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">**bold**</code>
            <span className="text-gray-400">Bold text</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">*italic*</code>
            <span className="text-gray-400">Italic text</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">`code`</code>
            <span className="text-gray-400">Inline code</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">- item</code>
            <span className="text-gray-400">Bullet list</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">1. item</code>
            <span className="text-gray-400">Numbered list</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">[text](url)</code>
            <span className="text-gray-400">Link</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">&gt; quote</code>
            <span className="text-gray-400">Blockquote</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">---</code>
            <span className="text-gray-400">Horizontal rule</span>
          </div>
          <div className="flex items-baseline gap-2">
            <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800">```lang</code>
            <span className="text-gray-400">Code block</span>
          </div>
        </div>
      </div>
    </details>
  );
}

export function DocumentEditor({
  documentId,
  filePath,
  initialContent,
  onSave,
  onCancel,
}: DocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveDocumentEdit(documentId, content);

      if (!result.success) {
        setError(result.error ?? "Failed to save document.");
        return;
      }

      onSave();
    } catch {
      setError("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <h2 className="truncate text-sm font-semibold text-gray-900">
          {filePath}
        </h2>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden px-6 py-4">
        <label htmlFor="document-editor-textarea" className="sr-only">
          Edit {filePath}
        </label>
        <textarea
          id="document-editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSaving}
          className="h-full w-full resize-none rounded-md border border-gray-300 bg-white p-4 font-mono text-sm leading-relaxed text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
        />
      </div>

      <MarkdownHelpGuide />
    </div>
  );
}
