"use client";

import { useState, useCallback } from "react";
import { extractReviewFacts } from "@/features/review/actions/extract-review-facts";
import { acceptReviewFact } from "@/features/review/actions/accept-review-fact";
import { acceptAllReviewFacts } from "@/features/review/actions/accept-all-review-facts";
import type { ExtractedFact } from "@/features/review/lib/fact-extractor";

export interface FactReviewPanelProps {
  projectId: string;
  messageCount: number;
}

type PanelState = "idle" | "extracting" | "reviewing" | "done" | "error";

export function FactReviewPanel({ projectId, messageCount }: FactReviewPanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());
  const [acceptingAll, setAcceptingAll] = useState(false);

  const canExtract = messageCount >= 4;

  const factKey = (f: ExtractedFact) => `${f.sectionKey}:${f.fieldKey}`;

  const handleExtract = useCallback(async () => {
    setState("extracting");
    setError(null);
    setFacts([]);

    try {
      const result = await extractReviewFacts({ projectId });

      if (!result.success) {
        setState("error");
        setError(result.error ?? "Failed to extract facts.");
        return;
      }

      if (!result.facts || result.facts.length === 0) {
        setState("done");
        return;
      }

      setFacts(result.facts);
      setState("reviewing");
    } catch {
      setState("error");
      setError("An unexpected error occurred during extraction.");
    }
  }, [projectId]);

  const handleAccept = useCallback(async (fact: ExtractedFact) => {
    const key = factKey(fact);
    setAcceptingIds((prev) => new Set(prev).add(key));

    try {
      const result = await acceptReviewFact({
        projectId,
        sectionKey: fact.sectionKey,
        fieldKey: fact.fieldKey,
        value: fact.value,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to accept fact.");
        setAcceptingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return;
      }

      setFacts((prev) => {
        const remaining = prev.filter((f) => factKey(f) !== key);
        if (remaining.length === 0) setState("done");
        return remaining;
      });
    } catch {
      setError("Failed to accept fact. Please try again.");
    } finally {
      setAcceptingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [projectId]);

  const handleDismiss = useCallback((fact: ExtractedFact) => {
    setFacts((prev) => {
      const remaining = prev.filter((f) => factKey(f) !== factKey(fact));
      if (remaining.length === 0) setState("done");
      return remaining;
    });
  }, []);

  const handleAcceptAll = useCallback(async () => {
    setAcceptingAll(true);
    setError(null);

    try {
      const payload = facts.map((f) => ({
        projectId,
        sectionKey: f.sectionKey,
        fieldKey: f.fieldKey,
        value: f.value,
      }));

      const result = await acceptAllReviewFacts(payload);

      if (!result.success) {
        setError(result.error ?? "Failed to accept all facts.");
        setAcceptingAll(false);
        return;
      }

      setFacts([]);
      setState("done");
    } catch {
      setError("Failed to accept all facts. Please try again.");
    } finally {
      setAcceptingAll(false);
    }
  }, [projectId, facts]);

  // Idle state — show Extract Facts button
  if (state === "idle") {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Fact Extraction</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Extract structured facts from the conversation to populate your intake.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExtract}
            disabled={!canExtract}
            aria-label="Extract facts from conversation"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Extract Facts
          </button>
        </div>
        {!canExtract && (
          <p className="mt-2 text-xs text-gray-400">
            Continue the conversation a bit more before extracting facts (at least 2 exchanges needed).
          </p>
        )}
      </div>
    );
  }

  // Extracting state — loading
  if (state === "extracting") {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" role="status" aria-label="Extracting facts" />
          <span className="text-sm text-gray-600">Extracting facts from conversation…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={handleExtract}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Done state
  if (state === "done") {
    return (
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-700">All facts have been processed.</p>
          <button
            type="button"
            onClick={() => { setState("idle"); setError(null); }}
            className="text-sm font-medium text-green-800 underline hover:text-green-900"
          >
            Extract again
          </button>
        </div>
      </div>
    );
  }

  // Reviewing state — show facts list
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          Extracted Facts ({facts.length})
        </h3>
        <button
          type="button"
          onClick={handleAcceptAll}
          disabled={acceptingAll || facts.length === 0}
          aria-label="Accept all extracted facts"
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {acceptingAll ? "Accepting…" : "Accept All"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <ul className="space-y-2" aria-label="Extracted facts list">
        {facts.map((fact) => {
          const key = factKey(fact);
          const isAccepting = acceptingIds.has(key);

          return (
            <li
              key={key}
              className="rounded-md border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-indigo-600">
                    {fact.sectionName}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {fact.fieldLabel}
                  </p>
                  <p className="text-sm text-gray-700 mt-1 break-words">
                    {fact.value}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAccept(fact)}
                    disabled={isAccepting || acceptingAll}
                    aria-label={`Accept fact: ${fact.fieldLabel}`}
                    className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAccepting ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(fact)}
                    disabled={isAccepting || acceptingAll}
                    aria-label={`Dismiss fact: ${fact.fieldLabel}`}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
