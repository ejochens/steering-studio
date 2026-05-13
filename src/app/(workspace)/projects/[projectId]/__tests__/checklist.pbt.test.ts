// Feature: project-type-and-import, Property 11: Setup checklist conditionally includes upload step
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildChecklistItems } from "../lib/build-checklist";

// **Validates: Requirements 11.1, 11.2, 11.4**

// ── Arbitraries ─────────────────────────────────────────────────────

/** Generate a random project type string that is NOT "extension" */
const nonExtensionTypeArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s !== "extension");

/** Generate a random non-empty project ID */
const projectIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Generate a non-negative integer for uploaded document count */
const docCountArb = fc.nat({ max: 1000 });

/** Generate a non-negative integer for extracted fact count */
const factCountArb = fc.nat({ max: 1000 });

// ── Property Tests ──────────────────────────────────────────────────

describe("Feature: project-type-and-import, Property 11: Setup checklist conditionally includes upload step", () => {
  it('includes "Upload Documents" step when projectType is "extension" AND hasExistingDocs is true', () => {
    fc.assert(
      fc.property(projectIdArb, fc.boolean(), docCountArb, factCountArb, (projectId, isProviderConfigured, uploadedDocumentCount, extractedFactCount) => {
        const items = buildChecklistItems({
          projectType: "extension",
          hasExistingDocs: true,
          isProviderConfigured,
          uploadedDocumentCount,
          extractedFactCount,
          answerCount: 0,
          generatedDocumentCount: 0,
          projectId,
        });

        const uploadStep = items.find((item) => item.label.startsWith("Upload Documents"));
        expect(uploadStep).toBeDefined();
        expect(uploadStep!.href).toBe(`/projects/${projectId}/upload`);
      }),
      { numRuns: 100 },
    );
  });

  it('does NOT include "Upload Documents" step when projectType is NOT "extension"', () => {
    fc.assert(
      fc.property(nonExtensionTypeArb, fc.boolean(), fc.boolean(), docCountArb, factCountArb, projectIdArb,
        (projectType, hasExistingDocs, isProviderConfigured, uploadedDocumentCount, extractedFactCount, projectId) => {
          const items = buildChecklistItems({
            projectType,
            hasExistingDocs,
            isProviderConfigured,
            uploadedDocumentCount,
            extractedFactCount,
            answerCount: 0,
            generatedDocumentCount: 0,
            projectId,
          });

          const uploadStep = items.find((item) => item.label.startsWith("Upload Documents"));
          expect(uploadStep).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does NOT include "Upload Documents" step when hasExistingDocs is false', () => {
    fc.assert(
      fc.property(fc.boolean(), docCountArb, factCountArb, projectIdArb,
        (isProviderConfigured, uploadedDocumentCount, extractedFactCount, projectId) => {
          const items = buildChecklistItems({
            projectType: "extension",
            hasExistingDocs: false,
            isProviderConfigured,
            uploadedDocumentCount,
            extractedFactCount,
            answerCount: 0,
            generatedDocumentCount: 0,
            projectId,
          });

          const uploadStep = items.find((item) => item.label.startsWith("Upload Documents"));
          expect(uploadStep).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('marks "Upload Documents" step as done when uploadedDocumentCount > 0 AND extractedFactCount > 0', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 }), projectIdArb,
        (isProviderConfigured, uploadedDocumentCount, extractedFactCount, projectId) => {
          const items = buildChecklistItems({
            projectType: "extension",
            hasExistingDocs: true,
            isProviderConfigured,
            uploadedDocumentCount,
            extractedFactCount,
            answerCount: 0,
            generatedDocumentCount: 0,
            projectId,
          });

          const uploadStep = items.find((item) => item.label.startsWith("Upload Documents"));
          expect(uploadStep).toBeDefined();
          expect(uploadStep!.done).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('marks "Upload Documents" step as NOT done when uploadedDocumentCount is 0', () => {
    fc.assert(
      fc.property(fc.boolean(), factCountArb, projectIdArb,
        (isProviderConfigured, extractedFactCount, projectId) => {
          const items = buildChecklistItems({
            projectType: "extension",
            hasExistingDocs: true,
            isProviderConfigured,
            uploadedDocumentCount: 0,
            extractedFactCount,
            answerCount: 0,
            generatedDocumentCount: 0,
            projectId,
          });

          const uploadStep = items.find((item) => item.label.startsWith("Upload Documents"));
          expect(uploadStep).toBeDefined();
          expect(uploadStep!.done).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('marks "Upload Documents" step as NOT done when extractedFactCount is 0 even if documents uploaded', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.integer({ min: 1, max: 1000 }), projectIdArb,
        (isProviderConfigured, uploadedDocumentCount, projectId) => {
          const items = buildChecklistItems({
            projectType: "extension",
            hasExistingDocs: true,
            isProviderConfigured,
            uploadedDocumentCount,
            extractedFactCount: 0,
            answerCount: 0,
            generatedDocumentCount: 0,
            projectId,
          });

          const uploadStep = items.find((item) => item.label.startsWith("Upload Documents"));
          expect(uploadStep).toBeDefined();
          expect(uploadStep!.done).toBe(false);
          // Should show the "extraction pending" label
          expect(uploadStep!.label).toContain("extraction pending");
        },
      ),
      { numRuns: 100 },
    );
  });
});
