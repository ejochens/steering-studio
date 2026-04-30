"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadDocuments } from "@/features/upload/actions/upload-documents";
import { extractImportedFacts } from "@/features/upload/actions/extract-imported-facts";
import type { ExtractImportedFactsResult } from "@/features/upload/actions/extract-imported-facts";

type Phase = "idle" | "uploading" | "extracting" | "success" | "error";

const MAX_FILE_SIZE = 500 * 1024; // 500 KB
const MAX_FILE_COUNT = 20;
const ACCEPTED_EXTENSIONS = [".md", ".markdown"];

interface SelectedFile {
  file: File;
  name: string;
}

interface UploadFormProps {
  projectId: string;
  existingDocuments: { id: string; filename: string; createdAt: Date }[];
}

function hasValidExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

export function UploadForm({ projectId, existingDocuments }: UploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractImportedFactsResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showReplace, setShowReplace] = useState(existingDocuments.length > 0);

  const validateAndAddFiles = useCallback(
    (files: FileList | File[]) => {
      setValidationError(null);
      const incoming = Array.from(files);

      // Filter to valid extensions
      const validExt = incoming.filter((f) => hasValidExtension(f.name));
      if (validExt.length < incoming.length) {
        const rejected = incoming
          .filter((f) => !hasValidExtension(f.name))
          .map((f) => f.name);
        setValidationError(
          `Only .md and .markdown files are accepted. Rejected: ${rejected.join(", ")}`
        );
      }

      // Check file sizes
      const oversized = validExt.filter((f) => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        setValidationError(
          `Files exceed the 500 KB limit: ${oversized.map((f) => f.name).join(", ")}`
        );
        return;
      }

      const combined = [
        ...selectedFiles,
        ...validExt
          .filter((f) => f.size <= MAX_FILE_SIZE)
          .map((f) => ({ file: f, name: f.name })),
      ];

      // Deduplicate by name
      const unique = combined.filter(
        (item, idx, arr) => arr.findIndex((x) => x.name === item.name) === idx
      );

      if (unique.length > MAX_FILE_COUNT) {
        setValidationError(`You can upload a maximum of ${MAX_FILE_COUNT} files.`);
        return;
      }

      setSelectedFiles(unique);
    },
    [selectedFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndAddFiles(e.target.files);
        // Reset input so the same file can be re-selected
        e.target.value = "";
      }
    },
    [validateAndAddFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    },
    [validateAndAddFiles]
  );

  const removeFile = useCallback((name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  }, []);

  const runExtraction = useCallback(async () => {
    setPhase("extracting");
    setErrorMessage(null);

    const result = await extractImportedFacts({ projectId });

    if (result.success) {
      setExtractionResult(result);
      setPhase("success");
      setShowReplace(false);
    } else {
      setErrorMessage(result.error ?? "Extraction failed.");
      setPhase("error");
    }
  }, [projectId]);

  const handleUploadAndExtract = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setPhase("uploading");
    setErrorMessage(null);
    setValidationError(null);

    // Read all files as text
    const filePayloads: { filename: string; content: string }[] = [];
    const readErrors: string[] = [];

    for (const sf of selectedFiles) {
      try {
        const content = await readFileAsText(sf.file);
        filePayloads.push({ filename: sf.name, content });
      } catch {
        readErrors.push(sf.name);
      }
    }

    if (readErrors.length > 0) {
      setValidationError(
        `Could not read the following files (excluded from upload): ${readErrors.join(", ")}`
      );
    }

    if (filePayloads.length === 0) {
      setPhase("idle");
      setErrorMessage("No files could be read. Please try again with different files.");
      return;
    }

    // Upload documents
    const uploadResult = await uploadDocuments({
      projectId,
      files: filePayloads,
    });

    if (!uploadResult.success) {
      setPhase("error");
      setErrorMessage(uploadResult.error ?? "Failed to upload documents.");
      return;
    }

    // Extract facts
    await runExtraction();
  }, [selectedFiles, projectId, runExtraction]);

  const handleReplaceAll = useCallback(() => {
    setShowReplace(false);
    setSelectedFiles([]);
    setValidationError(null);
    setErrorMessage(null);
    setPhase("idle");
  }, []);

  const isProviderError =
    errorMessage?.toLowerCase().includes("provider") ||
    errorMessage?.toLowerCase().includes("settings");

  return (
    <div className="space-y-6">
      {/* Existing documents */}
      {showReplace && existingDocuments.length > 0 && phase === "idle" && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-sm font-medium text-gray-900">
            Previously uploaded files
          </h2>
          <ul className="mt-2 space-y-1">
            {existingDocuments.map((doc) => (
              <li key={doc.id} className="text-sm text-gray-600">
                {doc.filename}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleReplaceAll}
            className="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Replace all
          </button>
        </div>
      )}

      {/* Idle: file picker and drag-drop zone */}
      {phase === "idle" && !showReplace && (
        <>
          {/* Validation error */}
          {validationError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {validationError}
            </div>
          )}

          {/* Drag-and-drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Drop markdown files here or click to browse"
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            <svg
              className="mb-3 h-10 w-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Drop markdown files here or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500">
              .md and .markdown files, up to 500 KB each, maximum 20 files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-gray-900">
                Selected files ({selectedFiles.length})
              </h2>
              <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                {selectedFiles.map((sf) => (
                  <li
                    key={sf.name}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">{sf.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(sf.name)}
                      aria-label={`Remove ${sf.name}`}
                      className="text-sm text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleUploadAndExtract}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Upload and analyze
              </button>
            </div>
          )}
        </>
      )}

      {/* Uploading state */}
      {phase === "uploading" && (
        <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-4">
          <svg
            className="h-5 w-5 animate-spin text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <p className="text-sm font-medium text-blue-700">Uploading files...</p>
        </div>
      )}

      {/* Extracting state */}
      {phase === "extracting" && (
        <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-4">
          <svg
            className="h-5 w-5 animate-spin text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <p className="text-sm font-medium text-blue-700">Analyzing documents...</p>
        </div>
      )}

      {/* Success state */}
      {phase === "success" && extractionResult && (
        <div className="space-y-4">
          <div className="rounded-md border border-green-200 bg-green-50 p-4">
            <h2 className="text-sm font-medium text-green-800">
              Analysis complete
            </h2>
            <p className="mt-1 text-sm text-green-700">
              Extracted {extractionResult.factCount ?? 0}{" "}
              {extractionResult.factCount === 1 ? "fact" : "facts"} across{" "}
              {extractionResult.sectionsAffected ?? 0} intake{" "}
              {extractionResult.sectionsAffected === 1 ? "section" : "sections"}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}/intake`)}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Continue to Intake
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {phase === "error" && (
        <div className="space-y-4">
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-4"
          >
            <h2 className="text-sm font-medium text-red-800">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-red-700">
              {errorMessage ?? "An unexpected error occurred."}
            </p>
            {isProviderError && (
              <a
                href="/settings/provider"
                className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-800 underline"
              >
                Go to provider settings
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={runExtraction}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Skip link — visible in idle and error states */}
      {(phase === "idle" || phase === "error") && (
        <div className="pt-2">
          <a
            href={`/projects/${projectId}/intake`}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip — go to intake without analyzing documents
          </a>
        </div>
      )}
    </div>
  );
}
