import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import type { SectionKey } from "@/lib/validation/intake";

/**
 * Represents an Answer row from the database.
 */
export interface AnswerRow {
  fieldKey: string;
  value: string;
  source: string;
}

/**
 * Represents an IntakeSection row with its Answer rows included.
 * This is the shape returned by Prisma when including answers.
 */
export interface IntakeSectionWithAnswers {
  id: string;
  sectionKey: string;
  coverageStatus: string;
  answers: AnswerRow[];
}

export interface MissingField {
  sectionKey: string;
  fieldKey: string;
  label: string;
  helpText: string;
}

export interface GapSummary {
  missingRequired: MissingField[];
  missingOptional: MissingField[];
  confirmedAnswers: Record<string, Record<string, string>>;
  sectionStatuses: Record<string, string>;
}

const CONFIRMED_SOURCES = new Set(["user-form", "ai-conversation"]);

/**
 * Analyzes intake sections to identify gaps in required and optional fields,
 * collect confirmed answers, and record section statuses.
 *
 * Pure function — no database calls. Receives pre-loaded data.
 */
export function analyzeGaps(sections: IntakeSectionWithAnswers[]): GapSummary {
  const missingRequired: MissingField[] = [];
  const missingOptional: MissingField[] = [];
  const confirmedAnswers: Record<string, Record<string, string>> = {};
  const sectionStatuses: Record<string, string> = {};

  // Build a lookup map from sectionKey → section definition
  const sectionDefMap = new Map(
    INTAKE_SECTIONS.map((def) => [def.sectionKey, def]),
  );

  for (const section of sections) {
    const sectionKey = section.sectionKey;
    sectionStatuses[sectionKey] = section.coverageStatus;

    const def = sectionDefMap.get(sectionKey as SectionKey);
    if (!def) continue;

    // Build a map of fieldKey → answer for quick lookup
    const answerMap = new Map(
      section.answers.map((a) => [a.fieldKey, a]),
    );

    for (const field of def.fields) {
      const answer = answerMap.get(field.fieldKey);
      const hasValue = answer !== undefined && answer.value !== "";

      if (hasValue && CONFIRMED_SOURCES.has(answer.source)) {
        // Collect confirmed answer
        if (!confirmedAnswers[sectionKey]) {
          confirmedAnswers[sectionKey] = {};
        }
        confirmedAnswers[sectionKey][field.fieldKey] = answer.value;
      }

      if (!hasValue) {
        const entry: MissingField = {
          sectionKey,
          fieldKey: field.fieldKey,
          label: field.label,
          helpText: field.helpText,
        };

        if (field.status === "required") {
          missingRequired.push(entry);
        } else if (
          section.coverageStatus === "partial" ||
          section.coverageStatus === "unknown"
        ) {
          missingOptional.push(entry);
        }
      }
    }
  }

  return { missingRequired, missingOptional, confirmedAnswers, sectionStatuses };
}
