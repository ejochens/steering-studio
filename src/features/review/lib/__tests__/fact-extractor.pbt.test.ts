// Feature: chat-clarification, Property 3: Fact extraction validates against known keys
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseFactExtractionResponse } from "../fact-extractor";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

// **Validates: Requirements 7.4**

// ── Lookup structures ────────────────────────────────────────────────

/** All valid section keys */
const VALID_SECTION_KEYS = INTAKE_SECTIONS.map((s) => s.sectionKey);

/** Map from sectionKey → set of valid field keys */
const VALID_FIELDS_BY_SECTION = new Map(
  INTAKE_SECTIONS.map((s) => [
    s.sectionKey,
    new Set(s.fields.map((f) => f.fieldKey)),
  ]),
);

// ── Arbitraries ──────────────────────────────────────────────────────

/** A non-empty trimmed string value */
const nonEmptyValueArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/** A random string that is NOT a valid section key */
const invalidSectionKeyArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => !VALID_SECTION_KEYS.includes(s) && s.trim().length > 0);

/** For a given section key, a random string that is NOT a valid field key */
function invalidFieldKeyArb(sectionKey: string): fc.Arbitrary<string> {
  const validFields = VALID_FIELDS_BY_SECTION.get(sectionKey)!;
  return fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => !validFields.has(s) && s.trim().length > 0);
}

/** Pick a random valid section key */
const validSectionKeyArb = fc.constantFrom(...VALID_SECTION_KEYS);

/** For a given section key, pick a random valid field key */
function validFieldKeyArb(sectionKey: string): fc.Arbitrary<string> {
  const fields = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey)!.fields;
  return fc.constantFrom(...fields.map((f) => f.fieldKey));
}

/**
 * Generate a JSON response object with only valid section/field keys and non-empty values.
 * Returns both the raw JSON string and the expected entry count.
 */
const validOnlyResponseArb = fc
  .subarray(VALID_SECTION_KEYS, { minLength: 1 })
  .chain((sectionKeys) => {
    const sectionArbs = sectionKeys.map((sk) => {
      const fields = INTAKE_SECTIONS.find((s) => s.sectionKey === sk)!.fields;
      const fieldKeys = fields.map((f) => f.fieldKey);
      return fc
        .subarray(fieldKeys, { minLength: 1 })
        .chain((selectedFieldKeys) =>
          fc
            .tuple(...selectedFieldKeys.map(() => nonEmptyValueArb))
            .map((values) => {
              const fieldRecord: Record<string, string> = {};
              selectedFieldKeys.forEach((fk, i) => {
                fieldRecord[fk] = values[i];
              });
              return { sectionKey: sk, fieldRecord, count: selectedFieldKeys.length };
            }),
        );
    });
    return fc.tuple(...sectionArbs);
  })
  .map((entries) => {
    const obj: Record<string, Record<string, string>> = {};
    let totalCount = 0;
    for (const entry of entries) {
      obj[entry.sectionKey] = entry.fieldRecord;
      totalCount += entry.count;
    }
    return { json: JSON.stringify(obj), expectedCount: totalCount, obj };
  });

/**
 * Generate a JSON response object with only invalid section keys.
 */
const invalidSectionsOnlyArb = fc
  .array(
    fc.tuple(invalidSectionKeyArb, fc.tuple(fc.string({ minLength: 1, maxLength: 20 }), nonEmptyValueArb)),
    { minLength: 1, maxLength: 5 },
  )
  .map((entries) => {
    const obj: Record<string, Record<string, string>> = {};
    for (const [sk, [fk, val]] of entries) {
      obj[sk] = { [fk]: val };
    }
    return JSON.stringify(obj);
  });

/**
 * Generate a mixed response: some valid section/field entries + some invalid section keys + some invalid field keys.
 */
const mixedResponseArb = fc
  .tuple(
    // Valid entries
    validSectionKeyArb.chain((sk) =>
      validFieldKeyArb(sk).chain((fk) =>
        nonEmptyValueArb.map((val) => ({ sectionKey: sk, fieldKey: fk, value: val, valid: true })),
      ),
    ),
    // Invalid section key entry
    invalidSectionKeyArb.chain((sk) =>
      nonEmptyValueArb.map((val) => ({ sectionKey: sk, fieldKey: "some-field", value: val, valid: false })),
    ),
    // Valid section with invalid field key
    validSectionKeyArb.chain((sk) =>
      invalidFieldKeyArb(sk).chain((fk) =>
        nonEmptyValueArb.map((val) => ({ sectionKey: sk, fieldKey: fk, value: val, valid: false })),
      ),
    ),
  )
  .map(([validEntry, invalidSectionEntry, invalidFieldEntry]) => {
    const obj: Record<string, Record<string, string>> = {};

    // Add valid entry
    if (!obj[validEntry.sectionKey]) obj[validEntry.sectionKey] = {};
    obj[validEntry.sectionKey][validEntry.fieldKey] = validEntry.value;

    // Add invalid section entry
    if (!obj[invalidSectionEntry.sectionKey]) obj[invalidSectionEntry.sectionKey] = {};
    obj[invalidSectionEntry.sectionKey][invalidSectionEntry.fieldKey] = invalidSectionEntry.value;

    // Add invalid field entry (may merge into existing valid section)
    if (!obj[invalidFieldEntry.sectionKey]) obj[invalidFieldEntry.sectionKey] = {};
    obj[invalidFieldEntry.sectionKey][invalidFieldEntry.fieldKey] = invalidFieldEntry.value;

    return {
      json: JSON.stringify(obj),
      validEntries: [validEntry],
      invalidSectionKey: invalidSectionEntry.sectionKey,
      invalidFieldKey: invalidFieldEntry.fieldKey,
      invalidFieldSection: invalidFieldEntry.sectionKey,
    };
  });

// ── Properties ───────────────────────────────────────────────────────

describe("Property: Fact extraction validates against known keys", () => {
  it("all valid section/field entries with non-empty values appear in the result", () => {
    fc.assert(
      fc.property(validOnlyResponseArb, ({ json, expectedCount }) => {
        const facts = parseFactExtractionResponse(json);
        expect(facts).toHaveLength(expectedCount);
      }),
      { numRuns: 200 },
    );
  });

  it("entries with invalid section keys are filtered out entirely", () => {
    fc.assert(
      fc.property(invalidSectionsOnlyArb, (json) => {
        const facts = parseFactExtractionResponse(json);
        expect(facts).toHaveLength(0);
      }),
      { numRuns: 200 },
    );
  });

  it("entries with invalid field keys within valid sections are filtered out", () => {
    fc.assert(
      fc.property(mixedResponseArb, ({ json, invalidSectionKey, invalidFieldKey, invalidFieldSection }) => {
        const facts = parseFactExtractionResponse(json);

        // No fact should have the invalid section key
        const hasInvalidSection = facts.some((f) => f.sectionKey === invalidSectionKey);
        expect(hasInvalidSection).toBe(false);

        // No fact should have the invalid field key in its section
        const hasInvalidField = facts.some(
          (f) => f.sectionKey === invalidFieldSection && f.fieldKey === invalidFieldKey,
        );
        expect(hasInvalidField).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("every returned fact has a sectionKey in INTAKE_SECTIONS and a fieldKey in that section's fields", () => {
    fc.assert(
      fc.property(mixedResponseArb, ({ json }) => {
        const facts = parseFactExtractionResponse(json);

        for (const fact of facts) {
          // sectionKey must be valid
          expect(VALID_SECTION_KEYS).toContain(fact.sectionKey);

          // fieldKey must exist in that section's fields
          const validFields = VALID_FIELDS_BY_SECTION.get(fact.sectionKey);
          expect(validFields).toBeDefined();
          expect(validFields!.has(fact.fieldKey)).toBe(true);

          // value must be non-empty
          expect(fact.value.trim().length).toBeGreaterThan(0);

          // sectionName and fieldLabel must be populated
          expect(fact.sectionName.length).toBeGreaterThan(0);
          expect(fact.fieldLabel.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });
});
