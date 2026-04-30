// Feature: guided-intake, Property 3: Coverage calculation correctness
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculateCoverage } from "../calculate-coverage";
import type { IntakeFieldDef } from "@/features/intake/config/sections";
import type { CoverageStatus } from "@/lib/validation/intake";

// **Validates: Requirements 6.2, 6.3, 6.4**

/** Arbitrary that generates a random IntakeFieldDef */
const fieldDefArb = fc
  .record({
    fieldKey: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    status: fc.constantFrom("required" as const, "optional" as const),
  })
  .map(
    ({ fieldKey, status }): IntakeFieldDef => ({
      fieldKey,
      label: fieldKey,
      type: "short-text",
      status,
      helpText: "help",
    }),
  );

/** Generate a list of fields with unique fieldKeys */
const uniqueFieldsArb = fc
  .uniqueArray(fieldDefArb, {
    minLength: 0,
    maxLength: 15,
    selector: (f) => f.fieldKey,
  });

/**
 * Given a set of fields, generate an answer map where each field may or may not
 * have an answer, and answers may be empty strings.
 */
function answersArb(fields: IntakeFieldDef[]) {
  if (fields.length === 0) {
    return fc.constant(new Map<string, string>());
  }
  return fc
    .tuple(
      ...fields.map((f) =>
        fc.oneof(
          fc.constant(undefined as string | undefined),
          fc.constant(""),
          fc.string({ minLength: 1, maxLength: 30 }),
        ),
      ),
    )
    .map((values) => {
      const map = new Map<string, string>();
      fields.forEach((f, i) => {
        const v = values[i];
        if (v !== undefined) {
          map.set(f.fieldKey, v);
        }
      });
      return map;
    });
}

/** Reference implementation to compute expected coverage */
function expectedCoverage(
  fields: IntakeFieldDef[],
  answers: Map<string, string>,
): CoverageStatus {
  const required = fields.filter((f) => f.status === "required");

  if (required.length === 0) {
    return "complete";
  }

  const answeredRequired = required.filter((f) => {
    const v = answers.get(f.fieldKey);
    return v !== undefined && v !== "";
  });

  if (answeredRequired.length === 0) {
    const hasAny = fields.some((f) => {
      const v = answers.get(f.fieldKey);
      return v !== undefined && v !== "";
    });
    return hasAny ? "partial" : "unknown";
  }

  if (answeredRequired.length === required.length) {
    return "complete";
  }

  return "partial";
}

/** Arbitrary that generates fields + matching answers together */
const fieldsAndAnswersArb = uniqueFieldsArb.chain((fields) =>
  answersArb(fields).map((answers) => ({ fields, answers })),
);

describe("Property: Coverage calculation correctness", () => {
  it("calculateCoverage returns the correct status for any fields and answers", () => {
    fc.assert(
      fc.property(fieldsAndAnswersArb, ({ fields, answers }) => {
        const result = calculateCoverage(fields, answers);
        const expected = expectedCoverage(fields, answers);
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
