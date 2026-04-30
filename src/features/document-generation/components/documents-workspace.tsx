"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GenerationEmptyState } from "./generation-empty-state";
import { DocumentListPanel } from "./document-list-panel";
import { DocumentPreview } from "./document-preview";
import { DocumentEditor } from "./document-editor";
import { OverwriteWarningDialog } from "./overwrite-warning-dialog";
import { generateAllDocuments } from "@/features/document-generation/actions/generate-documents";
import { generateSingleDocument } from "@/features/document-generation/actions/generate-single-document";

export interface DocumentItem {
  id: string;
  filePath: string;
  completeness: string;
  missingFields: string;
  generatedAt: string;
  manuallyEdited: boolean;
  content: string;
  draftContent: string;
}

interface OverwriteDialogState {
  open: boolean;
  editedFilePaths: string[];
  mode: "all" | "single";
  singleFilePath?: string;
}

interface DocumentsWorkspaceProps {
  projectId: string;
  initialDocuments: DocumentItem[];
  hasProvider: boolean;
  generationModelName?: string | null;
}

function buildSummary(documents: DocumentItem[]) {
  return {
    total: documents.length,
    complete: documents.filter((d) => d.completeness === "complete").length,
    partial: documents.filter((d) => d.completeness === "partial").length,
    empty: documents.filter((d) => d.completeness === "empty").length,
  };
}

export function DocumentsWorkspace({
  projectId,
  initialDocuments,
  hasProvider,
  generationModelName,
}: DocumentsWorkspaceProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    initialDocuments.length > 0 ? initialDocuments[0].filePath : null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [overwriteDialog, setOverwriteDialog] = useState<OverwriteDialogState>({
    open: false,
    editedFilePaths: [],
    mode: "all",
  });

  const isSlowModel = generationModelName
    ? /pro|codex|o[1-9]/i.test(generationModelName)
    : false;

  // Elapsed time counter while generating
  useEffect(() => {
    if (isGenerating) {
      setElapsedSeconds(0);
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1_000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  const selectedDocument = documents.find(
    (d) => d.filePath === selectedFilePath,
  );
  const summary = buildSummary(documents);

  const handleSelectDocument = useCallback((filePath: string) => {
    setSelectedFilePath(filePath);
    setIsEditing(false);
  }, []);

  const executeGenerateAll = useCallback(async () => {
    abortRef.current = new AbortController();
    setIsGenerating(true);
    setIsCancelled(false);
    try {
      const result = await generateAllDocuments(projectId);
      if (!abortRef.current.signal.aborted && result.success) {
        router.refresh();
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [projectId, router]);

  const executeSingleRegenerate = useCallback(
    async (filePath: string) => {
      abortRef.current = new AbortController();
      setIsGenerating(true);
      setIsCancelled(false);
      try {
        const result = await generateSingleDocument(projectId, filePath);
        if (!abortRef.current.signal.aborted && result.success) {
          router.refresh();
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [projectId, router],
  );

  const handleCancelGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setIsCancelled(true);
    setIsGenerating(false);
  }, []);

  const handleGenerateAll = useCallback(async () => {
    const editedDocs = documents.filter((d) => d.manuallyEdited);
    // Always confirm before regenerating when documents already exist
    setOverwriteDialog({
      open: true,
      editedFilePaths: editedDocs.map((d) => d.filePath),
      mode: "all",
    });
  }, [documents]);

  const handleRegenerateSingle = useCallback(
    async (filePath: string) => {
      const doc = documents.find((d) => d.filePath === filePath);
      if (doc?.manuallyEdited) {
        setOverwriteDialog({
          open: true,
          editedFilePaths: [filePath],
          mode: "single",
          singleFilePath: filePath,
        });
      } else {
        await executeSingleRegenerate(filePath);
      }
    },
    [documents, executeSingleRegenerate],
  );

  const handleOverwriteConfirm = useCallback(async () => {
    setOverwriteDialog((prev) => ({ ...prev, open: false }));
    if (overwriteDialog.mode === "all") {
      await executeGenerateAll();
    } else if (overwriteDialog.singleFilePath) {
      await executeSingleRegenerate(overwriteDialog.singleFilePath);
    }
  }, [overwriteDialog, executeGenerateAll, executeSingleRegenerate]);

  const handleOverwriteCancel = useCallback(() => {
    setOverwriteDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    router.refresh();
  }, [router]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Empty state: no documents generated yet
  if (documents.length === 0) {
    return (
      <GenerationEmptyState
        onGenerate={handleGenerateAll}
        hasProvider={hasProvider}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <>
      {!hasProvider && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No AI provider configured. Documents are generated using templates
          only. Configure a provider in{" "}
          <a
            href="/settings/provider"
            className="font-medium underline hover:text-amber-900"
          >
            Settings
          </a>{" "}
          to enable AI refinement.
        </div>
      )}

      <div ref={gridRef} className="relative grid min-h-[600px] grid-cols-3 gap-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-8 py-6 shadow-lg border border-gray-200 max-w-sm text-center">
              <svg
                aria-hidden="true"
                className="h-8 w-8 text-blue-600 animate-spin"
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
              <span className="text-sm font-medium text-gray-700" role="status">
                Generating documents…
              </span>
              <span className="text-xs tabular-nums text-gray-400">
                {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")} elapsed
              </span>

              {/* Progressive time-based guidance */}
              {isSlowModel && elapsedSeconds < 120 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-1">
                  You are using <span className="font-medium">{generationModelName}</span>, which can take 2–5 minutes per document. This is normal.
                </p>
              )}
              {isSlowModel && elapsedSeconds >= 120 && elapsedSeconds < 600 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-1">
                  Still working. Pro models with reasoning can take up to 5 minutes per document. Multiple documents are processed sequentially.
                </p>
              )}
              {isSlowModel && elapsedSeconds >= 600 && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-1">
                  This is taking longer than expected. The request may have stalled. You can cancel and try again, or check your provider dashboard for errors.
                </p>
              )}
              {!isSlowModel && elapsedSeconds >= 30 && elapsedSeconds < 180 && (
                <p className="text-xs text-gray-500 mt-1">
                  AI refinement can take a while depending on the model. Still working…
                </p>
              )}
              {!isSlowModel && elapsedSeconds >= 180 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-1">
                  This is taking longer than usual. You can cancel and try again if needed.
                </p>
              )}

              <button
                type="button"
                onClick={handleCancelGeneration}
                className="mt-2 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cancelled banner */}
        {isCancelled && !isGenerating && (
          <div
            role="status"
            className="absolute inset-x-0 top-0 z-10 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800"
          >
            Generation was cancelled. Some documents may have been partially updated.
            <button
              type="button"
              onClick={() => { setIsCancelled(false); router.refresh(); }}
              className="ml-2 font-medium underline hover:text-amber-900"
            >
              Refresh
            </button>
          </div>
        )}
        <div className="col-span-1 border-r border-gray-200 overflow-y-auto">
          <DocumentListPanel
            documents={documents}
            summary={summary}
            selectedFilePath={selectedFilePath}
            onSelectDocument={handleSelectDocument}
            onRegenerateAll={handleGenerateAll}
            onRegenerateSingle={handleRegenerateSingle}
            isGenerating={isGenerating}
          />
        </div>

        <div className="col-span-2 overflow-y-auto">
          {selectedDocument && !isEditing && (
            <DocumentPreview
              filePath={selectedDocument.filePath}
              content={selectedDocument.content}
              onEdit={handleEdit}
            />
          )}

          {selectedDocument && isEditing && (
            <DocumentEditor
              documentId={selectedDocument.id}
              filePath={selectedDocument.filePath}
              initialContent={selectedDocument.content}
              onSave={handleSave}
              onCancel={handleCancelEdit}
            />
          )}

          {!selectedDocument && (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Select a document to preview
            </div>
          )}
        </div>
      </div>

      <OverwriteWarningDialog
        open={overwriteDialog.open}
        editedFilePaths={overwriteDialog.editedFilePaths}
        onConfirm={handleOverwriteConfirm}
        onCancel={handleOverwriteCancel}
        projectId={projectId}
      />
    </>
  );
}
