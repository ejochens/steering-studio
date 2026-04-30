// Feature: document-generation, Property 5: Completeness status invariant
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  emptyKnowledgeModel,
  type KnowledgeModel,
} from "../assemble-knowledge-model";
import { calculateDocumentCompleteness } from "../calculate-completeness";

// **Validates: Requirements 1.5, 10.1, 10.2**

const allKnowledgeModelKeys = Object.keys(
  emptyKnowledgeModel(),
) as (keyof KnowledgeModel)[];

/**
 * Generator: produces a KnowledgeModel where each field is randomly either
 * an empty string or a non-empty string, giving us varying completeness.
 */
const knowledgeModelArb = fc
  .tuple(
    ...allKnowledgeModelKeys.map(() =>
      fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
    ),
  )
  .map((values) => {
    const model = emptyKnowledgeModel();
    allKnowledgeModelKeys.forEach((key, i) => {
      model[key] = values[i];
    });
    return model;
  });

/**
 * Generator: produces a random non-empty subset of KnowledgeModel keys
 * to use as requiredFields.
 */
const requiredFieldsArb = fc.subarray([...allKnowledgeModelKeys], {
  minLength: 1,
  maxLength: allKnowledgeModelKeys.length,
});

describe("Property: Completeness status invariant", () => {
  it("status is always one of 'complete', 'partial', or 'empty' with correct missingFields invariants", () => {
    fc.assert(
      fc.property(
        requiredFieldsArb,
        knowledgeModelArb,
        (requiredFields, model) => {
          const result = calculateDocumentCompleteness(requiredFields, model);

          // Invariant 1: status is always one of the three valid values
          expect(["complete", "partial", "empty"]).toContain(result.status);

          // Invariant 2: missingFields is always a subset of requiredFields
          for (const field of result.missingFields) {
            expect(requiredFields).toContain(field);
          }

          // Invariant 3: "complete" → missingFields.length === 0
          if (result.status === "complete") {
            expect(result.missingFields).toHaveLength(0);
          }

          // Invariant 4: "partial" → missingFields.length > 0 AND < requiredFields.length
          if (result.status === "partial") {
            expect(result.missingFields.length).toBeGreaterThan(0);
            expect(result.missingFields.length).toBeLessThan(
              requiredFields.length,
            );
          }

          // Invariant 5: "empty" → missingFields.length === requiredFields.length
          if (result.status === "empty") {
            expect(result.missingFields).toHaveLength(requiredFields.length);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
