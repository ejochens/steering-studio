// Feature: project-type-and-import, Property 6: Extraction prompt builder includes all intake field definitions and document payload
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildImportExtractionPrompt } from "../import-extraction";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

// **Validates: Requirements 5.2, 5.3, 12.2, 12.3, 12.4, 12.5**

// ── Arbitraries ─────────────────────────────────────────────────────

/** Generate a random document payload string (simulating parsed document text) */
const documentPayloadArb = fc.string({ minLength: 0, maxLength: 500 });

// ── Property Tests ──────────────────────────────────────────────────

describe("Property: Extraction prompt builder includes all intake field definitions and document payload", () => {
  it("the system message contains every section key from the intake configuration", () => {
    fc.assert(
      fc.property(documentPayloadArb, (payload) => {
        const messages = buildImportExtractionPrompt(payload, INTAKE_SECTIONS);
        const systemContent = messages[0].content;

        for (const section of INTAKE_SECTIONS) {
          expect(systemContent).toContain(section.sectionKey);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("the system message contains every field key from the intake configuration", () => {
    fc.assert(
      fc.property(documentPayloadArb, (payload) => {
        const messages = buildImportExtractionPrompt(payload, INTAKE_SECTIONS);
        const systemContent = messages[0].content;

        for (const section of INTAKE_SECTIONS) {
          for (const field of section.fields) {
            expect(systemContent).toContain(field.fieldKey);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("the document payload text appears in the user message", () => {
    fc.assert(
      fc.property(documentPayloadArb, (payload) => {
        const messages = buildImportExtractionPrompt(payload, INTAKE_SECTIONS);
        const userContent = messages[1].content;

        expect(userContent).toContain(payload);
      }),
      { numRuns: 100 },
    );
  });

  it("the output is always a ChatMessage[] array with exactly 2 elements (system + user)", () => {
    fc.assert(
      fc.property(documentPayloadArb, (payload) => {
        const messages = buildImportExtractionPrompt(payload, INTAKE_SECTIONS);

        expect(Array.isArray(messages)).toBe(true);
        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe("system");
        expect(messages[1].role).toBe("user");
      }),
      { numRuns: 100 },
    );
  });
});
