// Feature: chat-clarification, Property 2: System prompt includes confirmed answers and missing fields
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildReviewSystemPrompt } from "../system-prompt-builder";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import type { GapSummary, MissingField } from "../gap-analyzer";

// **Validates: Requirements 4.1, 4.4, 4.7**

// ── Helpers ──────────────────────────────────────────────────────────

/** All real section keys from INTAKE_SECTIONS */
const ALL_SECTION_KEYS = INTAKE_SECTIONS.map((s) => s.sectionKey);

/** Map from sectionKey to its field keys */
const FIELDS_BY_SECTION = new Map(
  INTAKE_SECTIONS.map((s) => [s.sectionKey, s.fields]),
);

/** Generate a non-empty printable string for answer values */
const answerValueArb = fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0);

/** Generate a random project name */
const projectNameArb = fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0);

/** Generate confirmed answers: random subset of sections, each with random subset of fields */
const confirmedAnswersArb: fc.Arbitrary<Record<string, Record<string, string>>> =
  fc.subarray(ALL_SECTION_KEYS, { minLength: 0 }).chain((sectionKeys) => {
    if (sectionKeys.length === 0) return fc.constant({});

    const entries = sectionKeys.map((sk) => {
      const fields = FIELDS_BY_SECTION.get(sk)!;
      const fieldKeys = fields.map((f) => f.fieldKey);
      return fc
        .subarray(fieldKeys, { minLength: 1 })
        .chain((selectedFieldKeys) =>
          fc.tuple(...selectedFieldKeys.map(() => answerValueArb)).map((values) => {
            const fieldRecord: Record<string, string> = {};
            selectedFieldKeys.forEach((fk, i) => {
              fieldRecord[fk] = values[i];
            });
            return [sk, fieldRecord] as const;
          }),
        );
    });

    return fc.tuple(...entries).map((pairs) => Object.fromEntries(pairs));
  });

/** Generate a MissingField from a real section/field definition */
function missingFieldArb(sectionKey: string): fc.Arbitrary<MissingField> {
  const fields = FIELDS_BY_SECTION.get(sectionKey)!;
  return fc.constantFrom(...fields).map((field) => ({
    sectionKey,
    fieldKey: field.fieldKey,
    label: field.label,
    helpText: field.helpText,
  }));
}

/** Generate a list of missing fields from random sections */
const missingFieldsArb: fc.Arbitrary<MissingField[]> =
  fc.subarray(ALL_SECTION_KEYS, { minLength: 0 }).chain((sectionKeys) => {
    if (sectionKeys.length === 0) return fc.constant([]);
    return fc.tuple(...sectionKeys.map((sk) => missingFieldArb(sk))).map((arr) => arr);
  });

/** Generate a full random GapSummary */
const gapSummaryArb: fc.Arbitrary<GapSummary> = fc
  .tuple(missingFieldsArb, missingFieldsArb, confirmedAnswersArb)
  .map(([missingRequired, missingOptional, confirmedAnswers]) => ({
    missingRequired,
    missingOptional,
    confirmedAnswers,
    sectionStatuses: Object.fromEntries(
      ALL_SECTION_KEYS.map((sk) => [sk, "unknown"]),
    ),
  }));

// ── Properties ───────────────────────────────────────────────────────

describe("Property: System prompt includes confirmed answers and missing fields", () => {
  it("every confirmed answer value appears in the generated prompt", () => {
    fc.assert(
      fc.property(gapSummaryArb, projectNameArb, (gapSummary, projectName) => {
        const prompt = buildReviewSystemPrompt(gapSummary, projectName);

        for (const [, fields] of Object.entries(gapSummary.confirmedAnswers)) {
          for (const [, value] of Object.entries(fields)) {
            expect(prompt).toContain(value);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("every missing required field's fieldKey appears in the generated prompt", () => {
    fc.assert(
      fc.property(gapSummaryArb, projectNameArb, (gapSummary, projectName) => {
        const prompt = buildReviewSystemPrompt(gapSummary, projectName);

        for (const field of gapSummary.missingRequired) {
          expect(prompt).toContain(field.fieldKey);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("every missing optional field's fieldKey appears in the generated prompt", () => {
    fc.assert(
      fc.property(gapSummaryArb, projectNameArb, (gapSummary, projectName) => {
        const prompt = buildReviewSystemPrompt(gapSummary, projectName);

        for (const field of gapSummary.missingOptional) {
          expect(prompt).toContain(field.fieldKey);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("the project name always appears in the generated prompt", () => {
    fc.assert(
      fc.property(gapSummaryArb, projectNameArb, (gapSummary, projectName) => {
        const prompt = buildReviewSystemPrompt(gapSummary, projectName);
        expect(prompt).toContain(projectName);
      }),
      { numRuns: 200 },
    );
  });
});
