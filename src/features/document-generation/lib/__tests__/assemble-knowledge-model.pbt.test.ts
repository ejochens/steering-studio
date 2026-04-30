// Feature: document-generation, Property 1: Knowledge model assembly preserves all confirmed answers
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  FIELD_MAPPING,
  buildKnowledgeModelFromAnswers,
  fieldLookupKey,
} from "../assemble-knowledge-model";

// **Validates: Requirements 1.1**

/**
 * Generator: pick a random subset of FIELD_MAPPING entries and assign
 * each a random non-empty string value. Returns the subset with values
 * so we can assert against the built model.
 */
const answersSubsetArb = fc
  .subarray([...FIELD_MAPPING], { minLength: 0, maxLength: FIELD_MAPPING.length })
  .chain((subset) =>
    fc
      .tuple(
        ...subset.map(() => fc.string({ minLength: 1, maxLength: 200 })),
      )
      .map((values) =>
        subset.map((entry, i) => ({
          ...entry,
          value: values[i],
        })),
      ),
  );

describe("Property: Knowledge model assembly preserves all confirmed answers", () => {
  it("every non-empty answer appears in the correct KnowledgeModel field and unanswered fields remain empty", () => {
    fc.assert(
      fc.property(answersSubsetArb, (answeredEntries) => {
        // Build the lookup map from the generated answers
        const lookup = new Map<string, string>();
        for (const { sectionKey, fieldKey, value } of answeredEntries) {
          lookup.set(fieldLookupKey(sectionKey, fieldKey), value);
        }

        const model = buildKnowledgeModelFromAnswers(lookup);

        // Collect the set of properties that received answers
        const answeredProperties = new Set(
          answeredEntries.map((e) => e.property),
        );

        // Assert: every generated answer appears in the correct property
        for (const { property, value } of answeredEntries) {
          expect(model[property]).toBe(value);
        }

        // Assert: fields without answers remain empty strings
        for (const { property } of FIELD_MAPPING) {
          if (!answeredProperties.has(property)) {
            expect(model[property]).toBe("");
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
