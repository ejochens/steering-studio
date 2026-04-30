// Feature: project-type-and-import, Property 1: Upload access control predicate
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { canAccessUploadPage } from "../access-control";

// **Validates: Requirements 1.2, 1.3**

// ── Arbitraries ─────────────────────────────────────────────────────

/** Generate a random project type string that is NOT "extension" */
const nonExtensionTypeArb = fc
  .string({ minLength: 0, maxLength: 30 })
  .filter((s) => s !== "extension");

// ── Property Tests ──────────────────────────────────────────────────

describe("Feature: project-type-and-import, Property 1: Upload access control predicate", () => {
  it('returns true when projectType is "extension" AND hasExistingDocs is true', () => {
    fc.assert(
      fc.property(fc.constant("extension"), fc.constant(true), (projectType, hasExistingDocs) => {
        expect(canAccessUploadPage(projectType, hasExistingDocs)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('returns false when projectType is "new" regardless of hasExistingDocs', () => {
    fc.assert(
      fc.property(fc.boolean(), (hasExistingDocs) => {
        expect(canAccessUploadPage("new", hasExistingDocs)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('returns false when projectType is "extension" AND hasExistingDocs is false', () => {
    fc.assert(
      fc.property(fc.constant("extension"), fc.constant(false), (projectType, hasExistingDocs) => {
        expect(canAccessUploadPage(projectType, hasExistingDocs)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('returns false for any random projectType that is NOT "extension", regardless of hasExistingDocs', () => {
    fc.assert(
      fc.property(nonExtensionTypeArb, fc.boolean(), (projectType, hasExistingDocs) => {
        expect(canAccessUploadPage(projectType, hasExistingDocs)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
