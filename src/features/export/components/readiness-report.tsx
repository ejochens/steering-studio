"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReadinessResult } from "@/features/export/lib/validate-export";
import { generateSingleDocument } from "@/features/document-generation/actions/generate-single-document";

export interface ReadinessReportProps {
  readiness: ReadinessResult;
  projectId: string;
}

export function ReadinessReport({ readiness, projectId }: ReadinessReportProps) {
  const { documents, summary, allReady } = readiness;
  const [generatingPath, setGeneratingPath] = useState<string | null>(null);

  const readyDocs = documents.filter((d) => d.status === "ready");
  const warningDocs = documents.filter((d) => d.status === "warning");
  const missingDocs = documents.filter(
    (d) => d.status === "missing" || d.status === "empty",
  );

  const hasMissingOrEmpty = missingDocs.length > 0;

  async function handleGenerate(filePath: string) {
    setGeneratingPath(filePath);
    try {
      await generateSingleDocument(projectId, filePath);
      // Force a full page refresh to pick up the new document from the server
      window.location.reload();
    } catch {
      setGeneratingPath(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <p className="text-sm text-gray-700">
        <span className="font-medium text-green-700">{summary.ready} ready</span>
        {" · "}
        <span className="font-medium text-amber-700">{summary.warning} warnings</span>
        {" · "}
        <span className="font-medium text-red-700">
          {summary.missing + summary.empty} missing
        </span>
      </p>

      {/* Ready for export banner */}
      {allReady && (
        <div
          role="status"
          className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800"
        >
          Ready for export
        </div>
      )}

      {/* Ready documents */}
      {readyDocs.length > 0 && (
        <DocumentGroup label="Ready" docs={readyDocs} />
      )}

      {/* Warning documents */}
      {warningDocs.length > 0 && (
        <DocumentGroup label="Warnings" docs={warningDocs} />
      )}

      {/* Missing / empty documents */}
      {missingDocs.length > 0 && (
        <DocumentGroup
          label="Missing"
          docs={missingDocs}
          onGenerate={handleGenerate}
          generatingPath={generatingPath}
        />
      )}

      {/* Go to Documents link */}
      {hasMissingOrEmpty && (
        <Link
          href={`/projects/${projectId}/documents`}
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          Go to Documents
        </Link>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-green-500",
  warning: "bg-amber-500",
  missing: "bg-red-500",
  empty: "bg-red-500",
};

function DocumentGroup({
  label,
  docs,
  onGenerate,
  generatingPath,
}: {
  label: string;
  docs: ReadinessResult["documents"];
  onGenerate?: (filePath: string) => void;
  generatingPath?: string | null;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </h3>
      <ul className="space-y-1" role="list">
        {docs.map((doc) => (
          <li key={doc.filePath} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_STYLES[doc.status]}`}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-900 font-mono text-xs">
                {doc.filePath}
              </span>
              {doc.status === "missing" && (
                <>
                  <span className="text-gray-500 text-xs">(not generated)</span>
                  {onGenerate && (
                    <button
                      type="button"
                      onClick={() => onGenerate(doc.filePath)}
                      disabled={generatingPath !== null}
                      className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingPath === doc.filePath ? "Generating…" : "Generate"}
                    </button>
                  )}
                </>
              )}
              {doc.status === "empty" && (
                <>
                  <span className="text-gray-500 text-xs">(empty)</span>
                  {onGenerate && (
                    <button
                      type="button"
                      onClick={() => onGenerate(doc.filePath)}
                      disabled={generatingPath !== null}
                      className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingPath === doc.filePath ? "Generating…" : "Generate"}
                    </button>
                  )}
                </>
              )}
              {doc.status === "warning" && doc.missingFields.length > 0 && (
                <ul className="mt-0.5 ml-4 list-disc text-xs text-amber-700">
                  {doc.missingFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
