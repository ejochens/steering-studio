"use client";

import { useState } from "react";
import type { IntakeSectionData } from "@/features/intake/components/intake-accordion";
import { IntakeField } from "@/features/intake/components/intake-field";

export interface IntakeSectionProps {
  section: IntakeSectionData;
  isExpanded: boolean;
  onToggle: () => void;
  projectId: string;
  suggestions?: Record<string, string>;
  disabled?: boolean;
  providerConfigured?: boolean;
  isGenerating?: boolean;
  onGenerate?: () => void;
  onAcceptField?: (fieldKey: string, value: string) => Promise<void>;
  onCancelField?: (fieldKey: string) => void;
  error?: string;
  onDismissError?: () => void;
}

function CoverageBadge({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="6" cy="6" r="5" />
        </svg>
        Complete
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 1a5 5 0 0 1 0 10V1z" />
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="5" />
      </svg>
      Not started
    </span>
  );
}

export function IntakeSection({
  section,
  isExpanded,
  onToggle,
  projectId,
  suggestions,
  disabled = false,
  providerConfigured = false,
  isGenerating = false,
  onGenerate,
  onAcceptField,
  onCancelField,
  error,
  onDismissError,
}: IntakeSectionProps) {
  const hasSuggestions = suggestions && Object.keys(suggestions).length > 0;
  const effectiveExpanded = hasSuggestions || isExpanded;
  const fieldsDisabled = disabled || isGenerating;
  const canGenerate = providerConfigured && !isGenerating;

  const isInfoMessage = error?.startsWith("AI had no");

  return (
    <div className={`border rounded-lg ${hasSuggestions ? "border-purple-300 ring-2 ring-purple-100" : "border-gray-200"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={effectiveExpanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {section.displayName}
          {hasSuggestions && (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              AI Review
            </span>
          )}
          {isGenerating && (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Generating…
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {!effectiveExpanded && <CoverageBadge status={section.coverageStatus} />}
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform ${effectiveExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {effectiveExpanded && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 flex-1">{section.description}</p>
            {onGenerate && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                disabled={!canGenerate}
                title={!providerConfigured ? "Configure an AI provider in Settings first" : undefined}
                className="ml-3 shrink-0 inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating && (
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                AI Fill
              </button>
            )}
          </div>

          {error && (
            <div role="status" className={`mb-4 flex items-center gap-2 rounded-md border px-3 py-2 ${
              isInfoMessage ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"
            }`}>
              <p className={`flex-1 text-sm ${isInfoMessage ? "text-blue-700" : "text-red-700"}`}>{error}</p>
              {onDismissError && (
                <button type="button" onClick={onDismissError}
                  className={`text-xs font-medium ${isInfoMessage ? "text-blue-600 hover:text-blue-800" : "text-red-600 hover:text-red-800"}`}
                >Dismiss</button>
              )}
            </div>
          )}

          {isGenerating && (
            <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-purple-100">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-purple-500" />
            </div>
          )}

          {section.fields.map((field) => {
            const answer = section.answers[field.fieldKey];
            const suggestion = suggestions?.[field.fieldKey];
            const currentValue = answer && answer.source !== "ai-suggested" ? answer.value : "";

            return (
              <div key={field.fieldKey} className="mb-4">
                {suggestion ? (
                  <FieldWithSuggestion
                    field={field}
                    currentValue={currentValue}
                    suggestion={suggestion}
                    onAccept={onAcceptField ? () => onAcceptField(field.fieldKey, suggestion) : undefined}
                    onCancel={onCancelField ? () => onCancelField(field.fieldKey) : undefined}
                  />
                ) : (
                  <IntakeField
                    field={field}
                    answer={answer}
                    projectId={projectId}
                    sectionKey={section.sectionKey}
                    disabled={fieldsDisabled}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldWithSuggestion({
  field,
  currentValue,
  suggestion,
  onAccept,
  onCancel,
}: {
  field: { fieldKey: string; label: string; status: string };
  currentValue: string;
  suggestion: string;
  onAccept?: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!onAccept) return;
    setAccepting(true);
    setError(null);
    try {
      await onAccept();
    } catch {
      setError("Failed to accept. Try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="rounded-md border border-purple-200 bg-purple-50/50 p-3">
      <p className="text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.status === "required" && <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>}
      </p>

      {currentValue && (
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500">Current value</span>
          <p className="mt-0.5 text-sm text-gray-800 bg-white rounded px-2 py-1.5 border border-gray-200 whitespace-pre-wrap">
            {currentValue}
          </p>
        </div>
      )}

      <div>
        <span className="text-xs font-medium text-purple-600">AI suggestion</span>
        <p className="mt-0.5 text-sm text-purple-900 bg-purple-50 rounded px-2 py-1.5 border border-purple-200 whitespace-pre-wrap">
          {suggestion}
        </p>
      </div>

      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          aria-label={`Accept AI suggestion for ${field.label}`}
          className="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:opacity-50"
        >
          {accepting ? "Saving…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={accepting}
          aria-label={`Dismiss AI suggestion for ${field.label}`}
          className="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
