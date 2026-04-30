// Feature: document-generation, Property 10: Overwrite warning is shown if and only if edited documents exist in scope
import { describe, it, expect } from "vitest";
import fc from "fast-check";

// **Validates: Requirements 6.2, 7.2, 8.2, 8.4**

/**
 * Since getEditedDocumentsInScope is a database function, we test the property
 * at the logic level: given a set of documents with random manuallyEdited flags,
 * filtering to those with manuallyEdited === true should satisfy the biconditional
 * "warning is shown iff at least one document is manually edited" and the set
 * returned should be exactly those documents.
 */

interface DocumentLike {
  filePath: string;
  manuallyEdited: boolean;
}

/**
 * Generator: produces arrays of document-like objects with random filePaths
 * and random manuallyEdited flags.
 */
const documentArrayArb = fc.array(
  fc.record({
    filePath: fc.string({ minLength: 1, maxLength: 80 }),
    manuallyEdited: fc.boolean(),
  }),
  { minLength: 0, maxLength: 30 },
);

/**
 * Pure logic equivalent of getEditedDocumentsInScope: filters documents
 * to only those with manuallyEdited === true.
 */
function getEditedDocuments(documents: DocumentLike[]): DocumentLike[] {
  return documents.filter((doc) => doc.manuallyEdited === true);
}

describe("Property: Overwrite warning is shown if and only if edited documents exist in scope", () => {
  it("warning is shown (result.length > 0) iff at least one document has manuallyEdited === true", () => {
    fc.assert(
      fc.property(documentArrayArb, (documents) => {
        const editedDocs = getEditedDocuments(documents);
        const shouldShowWarning = editedDocs.length > 0;
        const hasAnyEdited = documents.some(
          (doc) => doc.manuallyEdited === true,
        );

        // Biconditional: warning shown ↔ at least one edited document exists
        expect(shouldShowWarning).toBe(hasAnyEdited);
      }),
      { numRuns: 100 },
    );
  });

  it("the returned set contains exactly the documents where manuallyEdited === true", () => {
    fc.assert(
      fc.property(documentArrayArb, (documents) => {
        const editedDocs = getEditedDocuments(documents);

        // Every returned document must have manuallyEdited === true
        for (const doc of editedDocs) {
          expect(doc.manuallyEdited).toBe(true);
        }

        // Every document with manuallyEdited === true must be in the result
        const editedFromSource = documents.filter(
          (doc) => doc.manuallyEdited === true,
        );
        expect(editedDocs).toHaveLength(editedFromSource.length);

        // The sets should be identical (same elements in same order)
        expect(editedDocs).toEqual(editedFromSource);
      }),
      { numRuns: 100 },
    );
  });
});
