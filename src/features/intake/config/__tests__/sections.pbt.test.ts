// Feature: guided-intake, Property 1: Section config completeness
// Feature: guided-intake, Property 10: Starter content present for all sections
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { INTAKE_SECTIONS } from "../sections";
import type { FieldType, FieldStatus } from "../sections";

const VALID_FIELD_TYPES: FieldType[] = [
  "short-text",
  "long-text",
  "single-select",
  "multi-select",
  "tag-list",
];

const VALID_FIELD_STATUSES: FieldStatus[] = ["required", "optional"];

const sectionIndexArb = fc.integer({ min: 0, max: INTAKE_SECTIONS.length - 1 });

// ── Property 1: Section config completeness ─────────────────────────

// **Validates: Requirements 2.2, 2.3**

describe("Property: Section config completeness", () => {
  it("for any section in INTAKE_SECTIONS, it has non-empty displayName, description, and all fields have label, helpText, valid type, and valid status", () => {
    fc.assert(
      fc.property(sectionIndexArb, (index) => {
        const section = INTAKE_SECTIONS[index];

        // Section-level checks
        expect(section.displayName.trim().length).toBeGreaterThan(0);
        expect(section.description.trim().length).toBeGreaterThan(0);

        // Field-level checks
        for (const field of section.fields) {
          expect(field.label.trim().length).toBeGreaterThan(0);
          expect(field.helpText.trim().length).toBeGreaterThan(0);
          expect(VALID_FIELD_TYPES).toContain(field.type);
          expect(VALID_FIELD_STATUSES).toContain(field.status);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 10: Starter content present for all sections ───────────

// **Validates: Requirements 12.1, 12.3**

describe("Property: Starter content present for all sections", () => {
  it("for any section, every field has non-empty placeholder or helpText, and the section has a non-empty description", () => {
    fc.assert(
      fc.property(sectionIndexArb, (index) => {
        const section = INTAKE_SECTIONS[index];

        // Section must have a non-empty description
        expect(section.description.trim().length).toBeGreaterThan(0);

        // Every field must have non-empty placeholder or non-empty helpText
        for (const field of section.fields) {
          const hasPlaceholder =
            field.placeholder !== undefined && field.placeholder.trim().length > 0;
          const hasHelpText = field.helpText.trim().length > 0;

          expect(hasPlaceholder || hasHelpText).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
