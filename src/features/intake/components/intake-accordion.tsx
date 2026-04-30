"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { IntakeFieldDef } from "@/features/intake/config/sections";
import { IntakeSection } from "@/features/intake/components/intake-section";
import { CompletenessSidebar } from "@/features/intake/components/completeness-sidebar";
import { generateSectionAnswers } from "@/features/intake/actions/generate-section-answers";
import { acceptFieldSuggestion } from "@/features/intake/actions/accept-field-suggestion";
import { cancelFieldSuggestion } from "@/features/intake/actions/cancel-field-suggestion";

export interface IntakeSectionData {
  sectionKey: string;
  displayName: string;
  description: string;
  sortOrder: number;
  coverageStatus: string;
  fields: IntakeFieldDef[];
  answers: Record<string, { value: string; source: string }>;
}

export interface IntakeAccordionProps {
  projectId: string;
  sections: IntakeSectionData[];
  providerConfigured?: boolean;
}

export function IntakeAccordion({
  projectId,
  sections,
  providerConfigured = false,
}: IntakeAccordionProps) {
  const router = useRouter();
  const [expandedKey, setExpandedKey] = useState<string>(
    sections[0]?.sectionKey ?? "",
  );
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [statusAnnouncement, setStatusAnnouncement] = useState("");

  // In-memory suggestions for fields that already had values
  // (not persisted to DB, lost on refresh — that's fine, user can re-generate)
  const [inMemorySuggestions, setInMemorySuggestions] = useState<
    Record<string, Record<string, string>>
  >({});

  // Derive persisted suggestions (ai-suggested rows from server)
  const persistedSuggestions: Record<string, Record<string, string>> = {};
  for (const section of sections) {
    const suggested: Record<string, string> = {};
    for (const [fieldKey, answer] of Object.entries(section.answers)) {
      if (answer.source === "ai-suggested") {
        suggested[fieldKey] = answer.value;
      }
    }
    if (Object.keys(suggested).length > 0) {
      persistedSuggestions[section.sectionKey] = suggested;
    }
  }

  // Merge persisted + in-memory suggestions per section
  const allSuggestions: Record<string, Record<string, string>> = {};
  for (const section of sections) {
    const merged: Record<string, string> = {
      ...(persistedSuggestions[section.sectionKey] ?? {}),
      ...(inMemorySuggestions[section.sectionKey] ?? {}),
    };
    if (Object.keys(merged).length > 0) {
      allSuggestions[section.sectionKey] = merged;
    }
  }

  const handleToggle = useCallback((sectionKey: string) => {
    setExpandedKey((prev) => (prev === sectionKey ? "" : sectionKey));
  }, []);

  const handleSidebarClick = useCallback((sectionKey: string) => {
    setExpandedKey(sectionKey);
  }, []);

  const handleGenerateSection = useCallback(
    async (sectionKey: string) => {
      setLoadingSections((prev) => new Set(prev).add(sectionKey));
      setSectionErrors((prev) => { const n = { ...prev }; delete n[sectionKey]; return n; });
      // Clear any previous in-memory suggestions for this section
      setInMemorySuggestions((prev) => { const n = { ...prev }; delete n[sectionKey]; return n; });
      setStatusAnnouncement("Generating AI answers for section…");

      try {
        const result = await generateSectionAnswers({ projectId, sectionKey });

        if (!result.success) {
          setSectionErrors((prev) => ({ ...prev, [sectionKey]: result.error ?? "Generation failed." }));
          setStatusAnnouncement("AI answer generation failed.");
        } else if ((result.suggestionCount ?? 0) === 0) {
          setSectionErrors((prev) => ({ ...prev, [sectionKey]: "AI had no new suggestions for this section." }));
          setStatusAnnouncement("AI had no new suggestions.");
        } else {
          // Store in-memory suggestions for filled fields
          if (result.pendingSuggestions && Object.keys(result.pendingSuggestions).length > 0) {
            setInMemorySuggestions((prev) => ({
              ...prev,
              [sectionKey]: result.pendingSuggestions!,
            }));
          }
          setStatusAnnouncement(`${result.suggestionCount} suggestion${result.suggestionCount === 1 ? "" : "s"} ready for review.`);
          router.refresh();
        }
      } catch {
        setSectionErrors((prev) => ({ ...prev, [sectionKey]: "Failed to generate answers. Please try again." }));
        setStatusAnnouncement("AI answer generation failed.");
      } finally {
        setLoadingSections((prev) => { const n = new Set(prev); n.delete(sectionKey); return n; });
      }
    },
    [projectId, router],
  );

  const handleAcceptField = useCallback(
    async (sectionKey: string, fieldKey: string, value: string) => {
      const result = await acceptFieldSuggestion({ projectId, sectionKey, fieldKey, value });
      if (!result.success) {
        throw new Error(result.error ?? "Failed to accept suggestion.");
      }
      // Remove from in-memory if it was there
      setInMemorySuggestions((prev) => {
        const sectionSugs = { ...(prev[sectionKey] ?? {}) };
        delete sectionSugs[fieldKey];
        const next = { ...prev };
        if (Object.keys(sectionSugs).length === 0) {
          delete next[sectionKey];
        } else {
          next[sectionKey] = sectionSugs;
        }
        return next;
      });
      router.refresh();
    },
    [projectId, router],
  );

  const handleCancelField = useCallback(
    async (sectionKey: string, fieldKey: string) => {
      // If it's a persisted suggestion, delete from DB
      if (persistedSuggestions[sectionKey]?.[fieldKey]) {
        await cancelFieldSuggestion({ projectId, sectionKey, fieldKey });
        router.refresh();
      }
      // Remove from in-memory
      setInMemorySuggestions((prev) => {
        const sectionSugs = { ...(prev[sectionKey] ?? {}) };
        delete sectionSugs[fieldKey];
        const next = { ...prev };
        if (Object.keys(sectionSugs).length === 0) {
          delete next[sectionKey];
        } else {
          next[sectionKey] = sectionSugs;
        }
        return next;
      });
    },
    [projectId, persistedSuggestions, router],
  );

  const handleDismissError = useCallback((sectionKey: string) => {
    setSectionErrors((prev) => { const n = { ...prev }; delete n[sectionKey]; return n; });
  }, []);

  const sidebarSections = sections.map((s) => ({
    sectionKey: s.sectionKey,
    displayName: s.displayName,
    coverageStatus: s.coverageStatus,
  }));

  return (
    <div className="space-y-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-2">
          {sections.map((section) => {
            const isLoading = loadingSections.has(section.sectionKey);
            const sectionSuggestions = allSuggestions[section.sectionKey];
            const error = sectionErrors[section.sectionKey];

            return (
              <IntakeSection
                key={section.sectionKey}
                section={section}
                isExpanded={expandedKey === section.sectionKey}
                onToggle={() => handleToggle(section.sectionKey)}
                projectId={projectId}
                suggestions={sectionSuggestions}
                disabled={isLoading}
                providerConfigured={providerConfigured}
                isGenerating={isLoading}
                onGenerate={() => handleGenerateSection(section.sectionKey)}
                onAcceptField={(fieldKey, value) => handleAcceptField(section.sectionKey, fieldKey, value)}
                onCancelField={(fieldKey) => handleCancelField(section.sectionKey, fieldKey)}
                error={error}
                onDismissError={() => handleDismissError(section.sectionKey)}
              />
            );
          })}
        </div>

        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-4">
            <CompletenessSidebar
              sections={sidebarSections}
              onSectionClick={handleSidebarClick}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
