// Feature: multi-model-provider, Property 14: Regeneration notification on generation function change
// Feature: multi-model-provider, Property 15: Overwrite warning for manually edited documents
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { shouldNotifyRegeneration } from "@/features/provider-settings/lib/should-notify-regeneration";

// ── Arbitraries ──────────────────────────────────────────────────────

const aiFunctionArb = fc.constantFrom("intake", "generation");

const cuidArb = fc.stringMatching(/^c[a-z0-9]{24}$/);

const assignmentArb = fc.record({
  aiFunction: aiFunctionArb,
  providerConnectionId: cuidArb,
});

const assignmentsArb = fc.array(assignmentArb, { minLength: 0, maxLength: 4 });

// ── Property 14: Regeneration notification on generation function change ──

describe("Property 14: Regeneration notification on generation function change", () => {
  // **Validates: Requirements 7.1**

  it("returns true when the saved connection is explicitly assigned to generation", () => {
    fc.assert(
      fc.property(cuidArb, assignmentsArb, (connId, baseAssignments) => {
        // Ensure there's a generation assignment pointing to connId
        const assignments = [
          ...baseAssignments.filter((a) => a.aiFunction !== "generation"),
          { aiFunction: "generation", providerConnectionId: connId },
        ];

        const result = shouldNotifyRegeneration({
          savedConnectionId: connId,
          isDefault: false,
          assignments,
        });

        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("returns true when the saved connection is the default and no generation assignment exists", () => {
    fc.assert(
      fc.property(cuidArb, assignmentsArb, (connId, baseAssignments) => {
        // Remove any generation assignment
        const assignments = baseAssignments.filter(
          (a) => a.aiFunction !== "generation",
        );

        const result = shouldNotifyRegeneration({
          savedConnectionId: connId,
          isDefault: true,
          assignments,
        });

        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("returns true when aiFunction param is 'generation' (assignment save)", () => {
    fc.assert(
      fc.property(cuidArb, fc.boolean(), assignmentsArb, (connId, isDefault, assignments) => {
        const result = shouldNotifyRegeneration({
          savedConnectionId: connId,
          isDefault,
          aiFunction: "generation",
          assignments,
        });

        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("returns false when save does not affect the generation function", () => {
    fc.assert(
      fc.property(cuidArb, cuidArb, (savedId, generationConnId) => {
        // Precondition: savedId is NOT the generation-assigned connection
        fc.pre(savedId !== generationConnId);

        const assignments = [
          { aiFunction: "generation", providerConnectionId: generationConnId },
        ];

        const result = shouldNotifyRegeneration({
          savedConnectionId: savedId,
          isDefault: false,
          aiFunction: "intake",
          assignments,
        });

        expect(result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});


// ── Property 15: Overwrite warning for manually edited documents ─────

interface DocumentLike {
  filePath: string;
  manuallyEdited: boolean;
}

/**
 * Pure logic that mirrors the overwrite check in documents-workspace.tsx:
 * filter documents to those with manuallyEdited === true.
 * If any exist, a warning should be shown before regeneration.
 */
function checkOverwriteWarning(documents: DocumentLike[]): {
  shouldWarn: boolean;
  editedFilePaths: string[];
} {
  const edited = documents.filter((d) => d.manuallyEdited);
  return {
    shouldWarn: edited.length > 0,
    editedFilePaths: edited.map((d) => d.filePath),
  };
}

const documentArb = fc.record({
  filePath: fc.string({ minLength: 1, maxLength: 80 }),
  manuallyEdited: fc.boolean(),
});

const documentsArb = fc.array(documentArb, { minLength: 0, maxLength: 20 });

describe("Property 15: Overwrite warning for manually edited documents", () => {
  // **Validates: Requirements 7.5**

  it("any document with manuallyEdited=true triggers a warning", () => {
    fc.assert(
      fc.property(documentsArb, (documents) => {
        const { shouldWarn, editedFilePaths } = checkOverwriteWarning(documents);
        const hasEdited = documents.some((d) => d.manuallyEdited);

        // Warning shown iff at least one document is manually edited
        expect(shouldWarn).toBe(hasEdited);

        // editedFilePaths contains exactly the manually edited documents
        const expectedPaths = documents
          .filter((d) => d.manuallyEdited)
          .map((d) => d.filePath);
        expect(editedFilePaths).toEqual(expectedPaths);
      }),
      { numRuns: 100 },
    );
  });

  it("a single manuallyEdited document always produces a warning", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 80 }),
        documentsArb,
        (editedPath, otherDocs) => {
          // Ensure at least one manually edited document
          const documents: DocumentLike[] = [
            ...otherDocs,
            { filePath: editedPath, manuallyEdited: true },
          ];

          const { shouldWarn, editedFilePaths } = checkOverwriteWarning(documents);

          expect(shouldWarn).toBe(true);
          expect(editedFilePaths).toContain(editedPath);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("no warning when all documents have manuallyEdited=false", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            filePath: fc.string({ minLength: 1, maxLength: 80 }),
            manuallyEdited: fc.constant(false),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (documents) => {
          const { shouldWarn, editedFilePaths } = checkOverwriteWarning(documents);

          expect(shouldWarn).toBe(false);
          expect(editedFilePaths).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
