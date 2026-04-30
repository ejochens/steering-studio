"use client";

export interface OverwriteWarningDialogProps {
  editedFilePaths: string[];
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
  projectId?: string;
}

export function OverwriteWarningDialog({
  editedFilePaths,
  onConfirm,
  onCancel,
  open,
  projectId,
}: OverwriteWarningDialogProps) {
  if (!open) return null;

  const hasEditedDocs = editedFilePaths.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overwrite-warning-heading"
        className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <svg
              aria-hidden="true"
              className="h-6 w-6 shrink-0 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>

            <div>
              <h2
                id="overwrite-warning-heading"
                className="text-base font-semibold text-gray-900"
              >
                {hasEditedDocs
                  ? "Overwrite edited documents?"
                  : "Regenerate all documents?"}
              </h2>

              {/* Export suggestion — always shown */}
              <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <p>
                  Consider{" "}
                  {projectId ? (
                    <a
                      href={`/projects/${projectId}/export`}
                      className="font-medium underline hover:text-blue-900"
                    >
                      exporting your current documents
                    </a>
                  ) : (
                    <span className="font-medium">exporting your current documents</span>
                  )}{" "}
                  first. Regeneration replaces existing content and cannot be undone.
                </p>
              </div>

              {hasEditedDocs && (
                <>
                  <p className="mt-3 text-sm text-gray-600">
                    The following documents have been manually edited.
                    Regenerating will replace your edits with newly generated
                    content.
                  </p>

                  <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                    {editedFilePaths.map((filePath) => (
                      <li
                        key={filePath}
                        className="flex items-center gap-2 text-sm text-gray-800"
                      >
                        <span
                          aria-hidden="true"
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                        />
                        <code className="truncate font-mono text-xs">
                          {filePath}
                        </code>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {!hasEditedDocs && (
                <p className="mt-3 text-sm text-gray-600">
                  All documents will be regenerated from your current intake
                  data. If the new results aren&apos;t what you expected, the
                  previous versions will be lost.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
