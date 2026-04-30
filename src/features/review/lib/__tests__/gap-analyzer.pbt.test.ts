// Feature: chat-clarification, Property 1: Gap analyzer identifies all missing required fields
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  analyzeGaps,
  type IntakeSectionWithAnswers,
  type AnswerRow,
} from "../gap-analyzer";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

// **Validates: Requirements 3.1, 3.2, 3.3**

// ── Helpers ──────────────────────────────────────────────────────────

const CONFIRMED_SOURCES = ["user-form", "ai-conversation"];
const ALL_SOURCES = ["user-form", "ai-conversation", "ai-inferred", "import"];
const COVERAGE_STATUSES = ["unknown", "partial", "complete"];

/** Pick a random non-empty subset of real INTAKE_SECTIONS */
const sectionSubsetArb = fc
  .subarray(INTAKE_SECTIONS, { minLength: 1 })
  .map((defs) => defs.map((d) => d.sectionKey));

/** Generate a random answer for a given field key */
const answerRowArb = (fieldKey: string): fc.Arbitrary<AnswerRow> =>
  fc.record({
    fieldKey: fc.constant(fieldKey),
    value: fc.oneof(
      fc.constant(""),
      fc.string({ minLength: 1, maxLength: 50 }),
    ),
    source: fc.constantFrom(...ALL_SOURCES),
  });

/** Build an IntakeSectionWithAnswers for a real section key with random answers */
function sectionWithAnswersArb(
  sectionKey: string,
): fc.Arbitrary<IntakeSectionWithAnswers> {
  const def = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey)!;
  const fieldKeys = def.fields.map((f) => f.fieldKey);

  // For each field, optionally generate an answer
  const answersArb = fc
    .tuple(...fieldKeys.map((fk) => fc.option(answerRowArb(fk), { nil: undefined })))
    .map((opts) => opts.filter((a): a is AnswerRow => a !== undefined));

  return fc
    .tuple(fc.constantFrom(...COVERAGE_STATUSES), answersArb)
    .map(([coverageStatus, answers]) => ({
      id: `section-${sectionKey}`,
      sectionKey,
      coverageStatus,
      answers,
    }));
}

/** Generate a full random input: a subset of real sections with random answers */
const sectionsInputArb: fc.Arbitrary<IntakeSectionWithAnswers[]> =
  sectionSubsetArb.chain((keys) =>
    fc.tuple(...keys.map((k) => sectionWithAnswersArb(k))).map((arr) => arr),
  );

// ── Properties ───────────────────────────────────────────────────────

describe("Property: Gap analyzer identifies all missing required fields", () => {
  it("every required field with no answer or empty answer appears in missingRequired", () => {
    fc.assert(
      fc.property(sectionsInputArb, (sections) => {
        const result = analyzeGaps(sections);

        for (const section of sections) {
          const def = INTAKE_SECTIONS.find(
            (s) => s.sectionKey === section.sectionKey,
          );
          if (!def) continue;

          const answerMap = new Map(
            section.answers.map((a) => [a.fieldKey, a]),
          );

          for (const field of def.fields) {
            if (field.status !== "required") continue;
            const answer = answerMap.get(field.fieldKey);
            const hasValue = answer !== undefined && answer.value !== "";

            if (!hasValue) {
              const found = result.missingRequired.some(
                (m) =>
                  m.sectionKey === section.sectionKey &&
                  m.fieldKey === field.fieldKey,
              );
              expect(found).toBe(true);
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("no required field with a non-empty answer appears in missingRequired", () => {
    fc.assert(
      fc.property(sectionsInputArb, (sections) => {
        const result = analyzeGaps(sections);

        for (const section of sections) {
          const def = INTAKE_SECTIONS.find(
            (s) => s.sectionKey === section.sectionKey,
          );
          if (!def) continue;

          const answerMap = new Map(
            section.answers.map((a) => [a.fieldKey, a]),
          );

          for (const field of def.fields) {
            if (field.status !== "required") continue;
            const answer = answerMap.get(field.fieldKey);
            const hasValue = answer !== undefined && answer.value !== "";

            if (hasValue) {
              const found = result.missingRequired.some(
                (m) =>
                  m.sectionKey === section.sectionKey &&
                  m.fieldKey === field.fieldKey,
              );
              expect(found).toBe(false);
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("optional fields without answers in partial/unknown sections appear in missingOptional", () => {
    fc.assert(
      fc.property(sectionsInputArb, (sections) => {
        const result = analyzeGaps(sections);

        for (const section of sections) {
          const def = INTAKE_SECTIONS.find(
            (s) => s.sectionKey === section.sectionKey,
          );
          if (!def) continue;

          const answerMap = new Map(
            section.answers.map((a) => [a.fieldKey, a]),
          );
          const isPartialOrUnknown =
            section.coverageStatus === "partial" ||
            section.coverageStatus === "unknown";

          for (const field of def.fields) {
            if (field.status !== "optional") continue;
            const answer = answerMap.get(field.fieldKey);
            const hasValue = answer !== undefined && answer.value !== "";

            if (!hasValue && isPartialOrUnknown) {
              const found = result.missingOptional.some(
                (m) =>
                  m.sectionKey === section.sectionKey &&
                  m.fieldKey === field.fieldKey,
              );
              expect(found).toBe(true);
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("confirmed answers (user-form or ai-conversation with non-empty value) appear in confirmedAnswers", () => {
    fc.assert(
      fc.property(sectionsInputArb, (sections) => {
        const result = analyzeGaps(sections);

        for (const section of sections) {
          const def = INTAKE_SECTIONS.find(
            (s) => s.sectionKey === section.sectionKey,
          );
          if (!def) continue;

          for (const answer of section.answers) {
            // Only check fields that exist in the section definition
            const fieldExists = def.fields.some(
              (f) => f.fieldKey === answer.fieldKey,
            );
            if (!fieldExists) continue;

            const isConfirmedSource = CONFIRMED_SOURCES.includes(answer.source);
            const hasValue = answer.value !== "";

            if (isConfirmedSource && hasValue) {
              expect(
                result.confirmedAnswers[section.sectionKey]?.[answer.fieldKey],
              ).toBe(answer.value);
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
