"use client";

import { useState, useCallback } from "react";
import { ScopeSelector } from "./scope-selector";
import { ReadinessReport } from "./readiness-report";
import { validateExportReadiness } from "@/features/export/lib/validate-export";
import { getTemplatesForScope } from "@/features/export/lib/scope";
import type { ReadinessResult } from "@/features/export/lib/validate-export";
import type { ExportScope, TargetOutput } from "@/lib/validation";

export interface ExportWorkspaceProps {
  projectId: string;
  projectName: string;
  targetOutput: TargetOutput;
  readiness: ReadinessResult;
  defaultScope: ExportScope;
  allowedScopes: ExportScope[];
  allDocuments: Array<{
    filePath: string;
    content: string;
    completeness: string;
    missingFields: string;
  }>;
  /** File paths of templates that are applicable given the current knowledge model. */
  applicableFilePaths: string[];
}

export function ExportWorkspace({
  projectId,
  projectName,
  targetOutput,
  readiness,
  defaultScope,
  allowedScopes,
  allDocuments,
  applicableFilePaths,
}: ExportWorkspaceProps) {
  const [scope, setScope] = useState<ExportScope>(defaultScope);
  const [currentReadiness, setCurrentReadiness] =
    useState<ReadinessResult>(readiness);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const handleScopeChange = useCallback(
    (newScope: ExportScope) => {
      setScope(newScope);
      setDownloadStatus("idle");
      setErrorMessage(null);

      const templates = getTemplatesForScope(newScope, targetOutput);
      const applicableTemplates = templates.filter((t) =>
        applicableFilePaths.includes(t.filePath),
      );
      const expectedTemplates = applicableTemplates.map((t) => ({
        filePath: t.filePath,
        required: t.required,
      }));
      const newReadiness = validateExportReadiness(
        allDocuments,
        expectedTemplates,
      );
      setCurrentReadiness(newReadiness);
    },
    [targetOutput, allDocuments, applicableFilePaths],
  );

  const handleExportClick = useCallback(() => {
    setShowWarning(true);
  }, []);

  const handleWarningCancel = useCallback(() => {
    setShowWarning(false);
  }, []);

  const handleWarningConfirm = useCallback(async () => {
    setShowWarning(false);
    setIsDownloading(true);
    setDownloadStatus("idle");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/export/${projectId}?scope=${scope}`,
      );

      if (!response.ok) {
        let message = "Failed to generate ZIP archive";
        try {
          const body = await response.json();
          if (body.error) {
            message = body.error;
          }
        } catch {
          // use default message
        }
        setDownloadStatus("error");
        setErrorMessage(message);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;

      // Extract filename from Content-Disposition header, or use a fallback
      const disposition = response.headers.get("Content-Disposition");
      let filename = `steering-studio-export-${scope}.zip`;
      if (disposition) {
        const match = disposition.match(/filename="?([^";\n]+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setDownloadStatus("success");
    } catch {
      setDownloadStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsDownloading(false);
    }
  }, [projectId, scope]);

  const exportDisabled = isDownloading || !currentReadiness.canExport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Export {projectName}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Download your steering documents as a ZIP archive.
        </p>
      </div>

      {/* Scope selector */}
      <ScopeSelector
        scope={scope}
        allowedScopes={allowedScopes}
        onChange={handleScopeChange}
      />

      {/* Readiness report */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Document readiness
        </h3>
        <ReadinessReport
          readiness={currentReadiness}
          projectId={projectId}
        />
      </div>

      {/* Missing required documents message */}
      {!currentReadiness.canExport && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Export is blocked because required documents are missing or empty.
          Please generate the missing documents before exporting.
        </div>
      )}

      {/* Export button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleExportClick}
          disabled={exportDisabled}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading && (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
          )}
          {isDownloading ? "Downloading…" : "Export ZIP"}
        </button>
      </div>

      {/* Download status messages */}
      {downloadStatus === "success" && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Export complete. Check your downloads folder.
        </div>
      )}

      {downloadStatus === "error" && errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      {/* Sensitive content warning dialog */}
      {showWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="warning-title"
        >
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3
              id="warning-title"
              className="text-base font-semibold text-gray-900"
            >
              Sensitive content notice
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Exported documents may contain sensitive project context including
              architecture details, security requirements, and internal
              workflows. Store them in appropriate repositories only.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleWarningCancel}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWarningConfirm}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
