// Feature: codebase-scan-intake, Property 14: ScanResult JSON round-trip
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { ScanFact, ScanResult } from "../lib/types";

// **Validates: Requirements 13.4**

const scanFactArb: fc.Arbitrary<ScanFact> = fc.record({
  sectionKey: fc.string({ minLength: 1, maxLength: 50 }),
  fieldKey: fc.string({ minLength: 1, maxLength: 50 }),
  value: fc.string({ minLength: 1, maxLength: 200 }),
  sourceFile: fc.string({ minLength: 1, maxLength: 100 }),
  source: fc.constantFrom("codebase-scan" as const, "ai-codebase-scan" as const),
});

const scanResultArb: fc.Arbitrary<ScanResult> = fc.record({
  facts: fc.array(scanFactArb, { minLength: 0, maxLength: 20 }),
  filesScanned: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
    minLength: 0,
    maxLength: 20,
  }),
  deterministicFieldCount: fc.nat({ max: 100 }),
  aiFieldCount: fc.nat({ max: 100 }),
  warnings: fc.array(fc.string({ minLength: 0, maxLength: 200 }), {
    minLength: 0,
    maxLength: 10,
  }),
});

describe("Property 14: ScanResult JSON round-trip", () => {
  it("JSON.parse(JSON.stringify(result)) produces an equivalent ScanResult", () => {
    fc.assert(
      fc.property(scanResultArb, (result) => {
        const serialized = JSON.stringify(result);
        const deserialized = JSON.parse(serialized) as ScanResult;

        expect(deserialized).toEqual(result);
      }),
      { numRuns: 100 },
    );
  });
});
