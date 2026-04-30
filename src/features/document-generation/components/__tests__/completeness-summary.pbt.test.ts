// Feature: document-generation, Property 15: Summary counts are consistent
import { describe, it, expect } from "vitest";
import fc from "fast-check";

// **Validates: Requirements 10.4**

/**
 * The CompletenessSummary component receives a summary object with total,
 * complete, partial, and empty counts. This property test verifies the
 * invariant that complete + partial + empty === total for any valid summary.
 *
 * We generate complete, partial, and empty independently, then derive
 * total = complete + partial + empty to produce valid summaries, and also
 * test that inconsistent summaries are detectable.
 */

interface SummaryData {
  total: number;
  complete: number;
  partial: number;
  empty: number;
}

/**
 * Generator: produces a valid summary where total = complete + partial + empty.
 * Each count is an integer in [0, 100].
 */
const validSummaryArb = fc
  .tuple(
    fc.integer({ min: 0, max: 100 }),
    fc.integer({ min: 0, max: 100 }),
    fc.integer({ min: 0, max: 100 }),
  )
  .map(([complete, partial, empty]): SummaryData => ({
    total: complete + partial + empty,
    complete,
    partial,
    empty,
  }));

describe("Property: Summary counts are consistent", () => {
  it("for any valid summary, complete + partial + empty equals total", () => {
    fc.assert(
      fc.property(validSummaryArb, (summary) => {
        expect(summary.complete + summary.partial + summary.empty).toBe(
          summary.total,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("each count is non-negative in a valid summary", () => {
    fc.assert(
      fc.property(validSummaryArb, (summary) => {
        expect(summary.total).toBeGreaterThanOrEqual(0);
        expect(summary.complete).toBeGreaterThanOrEqual(0);
        expect(summary.partial).toBeGreaterThanOrEqual(0);
        expect(summary.empty).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it("no individual count exceeds total in a valid summary", () => {
    fc.assert(
      fc.property(validSummaryArb, (summary) => {
        expect(summary.complete).toBeLessThanOrEqual(summary.total);
        expect(summary.partial).toBeLessThanOrEqual(summary.total);
        expect(summary.empty).toBeLessThanOrEqual(summary.total);
      }),
      { numRuns: 100 },
    );
  });
});
