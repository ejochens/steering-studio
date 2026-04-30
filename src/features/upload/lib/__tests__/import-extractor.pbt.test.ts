// Feature: project-type-and-import, Property 7: Extraction response filtering discards invalid keys
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { filterValidKeys } from "../import-extractor";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

// **Validates: Requirements 5.5**

// ── Derive valid keys from INTAKE_SECTIONS ──────────────────────────

const VALID_SECTION_KEYS = INTAKE_SECTIONS.map((s) => s.sectionKey);

/** Map from sectionKey → array of valid fieldKeys */
const VALID_FIELDS_BY_SECTION: Record<string, string[]> = {};
for (const section of INTAKE_SECTIONS) {
  VALID_FIELDS_BY_SECTION[section.sectionKey] = section.fields.map((f) => f.fieldKey);
}

/** All valid field keys across all sections (for exclusion filtering) */
const ALL_VALID_FIELD_KEYS = INTAKE_SECTIONS.flatMap((s) => s.fields.map((f) => f.fieldKey));
const ALL_VALID_KEYS = new Set([...VALID_SECTION_KEYS, ...ALL_VALID_FIELD_KEYS]);

// ── Arbitraries ─────────────────────────────────────────────────────

/** Built-in Object prototype property names to exclude from generated keys */
const BUILTIN_PROPS = new Set(Object.getOwnPropertyNames(Object.prototype));

/** Generate a string guaranteed NOT to be a valid section or field key (or a JS built-in) */
const invalidKeyArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => !ALL_VALID_KEYS.has(s) && !BUILTIN_PROPS.has(s) && /^[a-zA-Z]/.test(s));

/** Generate a non-empty string value for a field */
const fieldValueArb = fc.string({ minLength: 1, maxLength: 100 });

/** Pick a random valid section key */
const validSectionKeyArb = fc.constantFrom(...VALID_SECTION_KEYS);

/** For a given section key, pick a random valid field key from that section */
function validFieldKeyArb(sectionKey: string): fc.Arbitrary<string> {
  const fields = VALID_FIELDS_BY_SECTION[sectionKey];
  if (!fields || fields.length === 0) return fc.constant("unknown-field");
  return fc.constantFrom(...fields);
}

/**
 * Generate a response object containing ONLY valid section/field keys.
 * Picks 1-4 sections, each with 1-3 valid fields.
 */
const allValidResponseArb = fc
  .array(validSectionKeyArb, { minLength: 1, maxLength: 4 })
  .chain((sectionKeys) => {
    const unique = [...new Set(sectionKeys)];
    const entries = unique.map((sk) =>
      fc
        .array(
          fc.tuple(validFieldKeyArb(sk), fieldValueArb),
          { minLength: 1, maxLength: 3 },
        )
        .map((pairs) => {
          const fields: Record<string, string> = {};
          for (const [fk, val] of pairs) fields[fk] = val;
          return [sk, fields] as const;
        }),
    );
    return fc.tuple(...entries).map((arr) => {
      const obj: Record<string, Record<string, string>> = {};
      for (const [sk, fields] of arr) obj[sk] = fields;
      return obj;
    });
  });

/**
 * Generate a response object containing ONLY invalid section keys.
 */
const allInvalidSectionResponseArb = fc
  .array(fc.tuple(invalidKeyArb, fc.dictionary(invalidKeyArb, fieldValueArb, { minKeys: 1, maxKeys: 3 })), {
    minLength: 1,
    maxLength: 4,
  })
  .map((entries) => {
    const obj: Record<string, Record<string, string>> = {};
    for (const [sk, fields] of entries) obj[sk] = fields;
    return obj;
  });

/**
 * Generate a mixed response: some valid section/field entries, some invalid.
 */
const mixedResponseArb = fc
  .tuple(allValidResponseArb, allInvalidSectionResponseArb)
  .map(([valid, invalid]) => ({ ...valid, ...invalid }));

// ── Property 7 Tests ────────────────────────────────────────────────

describe("Feature: project-type-and-import, Property 7: Extraction response filtering discards invalid keys", () => {
  it("retains all entries when response contains only valid section/field keys", () => {
    fc.assert(
      fc.property(allValidResponseArb, (response) => {
        const result = filterValidKeys(response);
        // Every section key in the input should be in the result
        for (const sectionKey of Object.keys(response)) {
          expect(result).toHaveProperty(sectionKey);
          // Every field key in the input section should be in the result section
          for (const fieldKey of Object.keys(response[sectionKey])) {
            expect(result[sectionKey]).toHaveProperty(fieldKey);
            expect(result[sectionKey][fieldKey]).toBe(response[sectionKey][fieldKey]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("returns empty object when response contains only invalid section keys", () => {
    fc.assert(
      fc.property(allInvalidSectionResponseArb, (response) => {
        const result = filterValidKeys(response);
        expect(Object.keys(result)).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  it("retains only valid entries and discards invalid ones in a mixed response", () => {
    fc.assert(
      fc.property(mixedResponseArb, (response) => {
        const result = filterValidKeys(response);

        for (const sectionKey of Object.keys(result)) {
          // Every section key in the result must be valid
          expect(VALID_SECTION_KEYS).toContain(sectionKey);
          // Every field key in the result must be valid for that section
          for (const fieldKey of Object.keys(result[sectionKey])) {
            expect(VALID_FIELDS_BY_SECTION[sectionKey]).toContain(fieldKey);
          }
        }

        // Invalid section keys must not appear in the result
        for (const sectionKey of Object.keys(response)) {
          if (!VALID_SECTION_KEYS.includes(sectionKey as typeof VALID_SECTION_KEYS[number])) {
            expect(result).not.toHaveProperty(sectionKey);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("result never contains a section key not in INTAKE_SECTIONS", () => {
    fc.assert(
      fc.property(mixedResponseArb, (response) => {
        const result = filterValidKeys(response);
        for (const sectionKey of Object.keys(result)) {
          expect(VALID_SECTION_KEYS).toContain(sectionKey);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("result never contains a field key not in the corresponding section's field definitions", () => {
    // Generate responses with valid section keys but a mix of valid and invalid field keys
    const validSectionInvalidFieldsArb = fc
      .array(validSectionKeyArb, { minLength: 1, maxLength: 4 })
      .chain((sectionKeys) => {
        const unique = [...new Set(sectionKeys)];
        const entries = unique.map((sk) => {
          const mixedFieldArb = fc.oneof(
            validFieldKeyArb(sk).chain((fk) => fc.tuple(fc.constant(fk), fieldValueArb)),
            fc.tuple(invalidKeyArb, fieldValueArb),
          );
          return fc
            .array(mixedFieldArb, { minLength: 1, maxLength: 5 })
            .map((pairs) => {
              const fields: Record<string, string> = {};
              for (const [fk, val] of pairs) fields[fk] = val;
              return [sk, fields] as const;
            });
        });
        return fc.tuple(...entries).map((arr) => {
          const obj: Record<string, Record<string, string>> = {};
          for (const [sk, fields] of arr) obj[sk] = fields;
          return obj;
        });
      });

    fc.assert(
      fc.property(validSectionInvalidFieldsArb, (response) => {
        const result = filterValidKeys(response);
        for (const sectionKey of Object.keys(result)) {
          const validFieldKeys = VALID_FIELDS_BY_SECTION[sectionKey];
          for (const fieldKey of Object.keys(result[sectionKey])) {
            expect(validFieldKeys).toContain(fieldKey);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: project-type-and-import, Property 8: Extracted facts do not overwrite user-confirmed answers
// **Validates: Requirements 6.1, 6.2**

import { filterFactsForPersistence } from "../import-extractor";
import type { ExistingAnswer } from "../import-extractor";

// ── Property 8 Arbitraries ──────────────────────────────────────────

/** Pick a random valid field key for a given section key */
function validFieldKeysArb(sectionKey: string): fc.Arbitrary<string[]> {
  const fields = VALID_FIELDS_BY_SECTION[sectionKey];
  if (!fields || fields.length === 0) return fc.constant([]);
  return fc.shuffledSubarray(fields, { minLength: 1, maxLength: fields.length });
}

/** Generate a non-empty trimmed string value */
const nonEmptyValueArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Source types that count as user-confirmed */
const confirmedSourceArb = fc.constantFrom("user-form", "ai-conversation");

/** Source types that do NOT count as user-confirmed */
const nonConfirmedSourceArb = fc.constantFrom("ai-suggested", "ai-inferred");

/**
 * Generate a facts object with valid section/field keys and non-empty values.
 * Returns both the facts and the section keys used.
 */
const factsWithSectionsArb = fc
  .array(validSectionKeyArb, { minLength: 1, maxLength: 4 })
  .chain((sectionKeys) => {
    const unique = [...new Set(sectionKeys)];
    const entries = unique.map((sk) =>
      validFieldKeysArb(sk).chain((fieldKeys) => {
        if (fieldKeys.length === 0) return fc.constant([sk, {}, fieldKeys] as const);
        return fc
          .array(nonEmptyValueArb, { minLength: fieldKeys.length, maxLength: fieldKeys.length })
          .map((values) => {
            const fields: Record<string, string> = {};
            fieldKeys.forEach((fk, i) => {
              fields[fk] = values[i];
            });
            return [sk, fields, fieldKeys] as const;
          });
      }),
    );
    return fc.tuple(...entries);
  })
  .map((arr) => {
    const facts: Record<string, Record<string, string>> = {};
    const sectionFieldKeys: Record<string, string[]> = {};
    for (const [sk, fields, fieldKeys] of arr) {
      if (Object.keys(fields).length > 0) {
        facts[sk] = fields;
        sectionFieldKeys[sk] = fieldKeys;
      }
    }
    return { facts, sectionFieldKeys };
  });

// ── Property 8 Tests ────────────────────────────────────────────────

describe("Feature: project-type-and-import, Property 8: Extracted facts do not overwrite user-confirmed answers", () => {
  it("returns no facts when all corresponding existing answers have source 'user-form'", () => {
    fc.assert(
      fc.property(factsWithSectionsArb, ({ facts, sectionFieldKeys }) => {
        // Build existing answers: every field in every section has source "user-form"
        const existingAnswersBySectionKey: Record<string, ExistingAnswer[]> = {};
        for (const [sectionKey, fieldKeys] of Object.entries(sectionFieldKeys)) {
          existingAnswersBySectionKey[sectionKey] = fieldKeys.map((fk) => ({
            fieldKey: fk,
            source: "user-form",
          }));
        }

        const result = filterFactsForPersistence(facts, existingAnswersBySectionKey);
        expect(Object.keys(result)).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  it("returns no facts when all corresponding existing answers have source 'ai-conversation'", () => {
    fc.assert(
      fc.property(factsWithSectionsArb, ({ facts, sectionFieldKeys }) => {
        // Build existing answers: every field has source "ai-conversation"
        const existingAnswersBySectionKey: Record<string, ExistingAnswer[]> = {};
        for (const [sectionKey, fieldKeys] of Object.entries(sectionFieldKeys)) {
          existingAnswersBySectionKey[sectionKey] = fieldKeys.map((fk) => ({
            fieldKey: fk,
            source: "ai-conversation",
          }));
        }

        const result = filterFactsForPersistence(facts, existingAnswersBySectionKey);
        expect(Object.keys(result)).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  it("returns all non-empty facts when no existing answers exist", () => {
    fc.assert(
      fc.property(factsWithSectionsArb, ({ facts }) => {
        const result = filterFactsForPersistence(facts, {});

        // Every section and field from the input should be in the result
        // (all values are non-empty by construction)
        for (const [sectionKey, fields] of Object.entries(facts)) {
          expect(result).toHaveProperty(sectionKey);
          for (const fieldKey of Object.keys(fields)) {
            expect(result[sectionKey]).toHaveProperty(fieldKey);
            expect(result[sectionKey][fieldKey]).toBe(fields[fieldKey]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("returns only non-confirmed fields when a mix of confirmed and non-confirmed answers exist", () => {
    // Generate facts, then for each section randomly mark some fields as confirmed
    const mixedArb = factsWithSectionsArb.chain(({ facts, sectionFieldKeys }) => {
      const answerEntries = Object.entries(sectionFieldKeys).map(([sk, fieldKeys]) => {
        // For each field, randomly assign confirmed or non-confirmed source
        const answerArbs = fieldKeys.map((fk) =>
          fc.oneof(confirmedSourceArb, nonConfirmedSourceArb).map((source) => ({
            fieldKey: fk,
            source,
          })),
        );
        return fc.tuple(...answerArbs).map((answers) => [sk, answers] as const);
      });
      return fc.tuple(...answerEntries).map((entries) => {
        const existingAnswersBySectionKey: Record<string, ExistingAnswer[]> = {};
        for (const [sk, answers] of entries) {
          existingAnswersBySectionKey[sk] = answers;
        }
        return { facts, existingAnswersBySectionKey };
      });
    });

    fc.assert(
      fc.property(mixedArb, ({ facts, existingAnswersBySectionKey }) => {
        const result = filterFactsForPersistence(facts, existingAnswersBySectionKey);

        for (const [sectionKey, fields] of Object.entries(result)) {
          const existingAnswers = existingAnswersBySectionKey[sectionKey] ?? [];
          const confirmedKeys = new Set(
            existingAnswers
              .filter((a) => a.source === "user-form" || a.source === "ai-conversation")
              .map((a) => a.fieldKey),
          );

          for (const fieldKey of Object.keys(fields)) {
            // No confirmed field should appear in the result
            expect(confirmedKeys.has(fieldKey)).toBe(false);
            // Value should match the original
            expect(fields[fieldKey]).toBe(facts[sectionKey][fieldKey]);
          }
        }

        // Verify confirmed fields are NOT in the result
        for (const [sectionKey, answers] of Object.entries(existingAnswersBySectionKey)) {
          for (const answer of answers) {
            if (answer.source === "user-form" || answer.source === "ai-conversation") {
              if (result[sectionKey]) {
                expect(result[sectionKey]).not.toHaveProperty(answer.fieldKey);
              }
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("always excludes empty string values from the result", () => {
    // Generate facts where some values are empty or whitespace-only
    const factsWithEmptyValuesArb = fc
      .array(validSectionKeyArb, { minLength: 1, maxLength: 3 })
      .chain((sectionKeys) => {
        const unique = [...new Set(sectionKeys)];
        const entries = unique.map((sk) =>
          validFieldKeysArb(sk).chain((fieldKeys) => {
            if (fieldKeys.length === 0) return fc.constant([sk, {}] as const);
            // Mix of empty and non-empty values
            const valueArb = fc.oneof(
              fc.constant(""),
              fc.constant("   "),
              fc.constant("\t"),
              nonEmptyValueArb,
            );
            return fc
              .array(valueArb, { minLength: fieldKeys.length, maxLength: fieldKeys.length })
              .map((values) => {
                const fields: Record<string, string> = {};
                fieldKeys.forEach((fk, i) => {
                  fields[fk] = values[i];
                });
                return [sk, fields] as const;
              });
          }),
        );
        return fc.tuple(...entries);
      })
      .map((arr) => {
        const facts: Record<string, Record<string, string>> = {};
        for (const [sk, fields] of arr) {
          if (Object.keys(fields).length > 0) {
            facts[sk] = fields;
          }
        }
        return facts;
      });

    fc.assert(
      fc.property(factsWithEmptyValuesArb, (facts) => {
        const result = filterFactsForPersistence(facts, {});

        // Every value in the result must be non-empty after trimming
        for (const fields of Object.values(result)) {
          for (const value of Object.values(fields)) {
            expect(value.trim()).not.toBe("");
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
