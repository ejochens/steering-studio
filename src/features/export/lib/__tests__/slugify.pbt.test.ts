// Feature: zip-export, Property 6: Slugify produces valid filename segments
// Feature: zip-export, Property 7: Export filename follows the naming convention
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { slugify, buildExportFilename } from "../slugify";
import type { ExportScope } from "@/lib/validation";

// **Validates: Requirements 6.2**

/**
 * Generator: produces a non-empty string that contains at least one
 * alphanumeric character, ensuring slugify has meaningful input.
 */
const stringWithAlphanumArb = fc
  .string({ minLength: 1 })
  .filter((s) => /[a-zA-Z0-9]/.test(s));

describe("Property: Slugify produces valid filename segments", () => {
  it("produces a string with only lowercase alphanumeric and single hyphens, no leading/trailing hyphens, and is non-empty", () => {
    fc.assert(
      fc.property(stringWithAlphanumArb, (input) => {
        const result = slugify(input);

        // Must be non-empty for input containing at least one alphanumeric char
        expect(result.length).toBeGreaterThan(0);

        // Must match: only lowercase alphanumeric and single hyphens,
        // no leading/trailing hyphens, no consecutive hyphens
        expect(result).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 6.1, 6.3, 6.4, 6.5**

const scopeArb = fc.constantFrom<ExportScope>("all", "kiro", "copilot");

const scopeSegmentMap: Record<ExportScope, string> = {
  all: "both",
  kiro: "kiro",
  copilot: "copilot",
};

describe("Property: Export filename follows the naming convention", () => {
  it("produces a filename matching steering-studio-{slug}-{scopeSegment}-{timestamp}.zip", () => {
    fc.assert(
      fc.property(stringWithAlphanumArb, scopeArb, (projectName, scope) => {
        const filename = buildExportFilename(projectName, scope);
        const slug = slugify(projectName);
        const expectedSegment = scopeSegmentMap[scope];

        // Must start with the prefix
        expect(filename.startsWith("steering-studio-")).toBe(true);

        // Must end with .zip
        expect(filename.endsWith(".zip")).toBe(true);

        // Must match the full pattern with timestamp
        const pattern = new RegExp(
          `^steering-studio-${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-${expectedSegment}-\\d{8}-\\d{6}\\.zip$`,
        );
        expect(filename).toMatch(pattern);
      }),
      { numRuns: 100 },
    );
  });
});
