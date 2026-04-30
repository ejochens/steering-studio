import { describe, it, expect } from "vitest";
import {
  FIELD_MAPPING,
  buildKnowledgeModelFromAnswers,
  emptyKnowledgeModel,
  fieldLookupKey,
  type KnowledgeModel,
} from "../assemble-knowledge-model";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

describe("assemble-knowledge-model", () => {
  describe("FIELD_MAPPING", () => {
    it("covers every field in every intake section", () => {
      const expectedPairs = INTAKE_SECTIONS.flatMap((s) =>
        s.fields.map((f) => `${s.sectionKey}::${f.fieldKey}`),
      );
      const mappedPairs = FIELD_MAPPING.map(
        (m) => `${m.sectionKey}::${m.fieldKey}`,
      );
      expect(mappedPairs).toEqual(expect.arrayContaining(expectedPairs));
      expect(mappedPairs.length).toBe(expectedPairs.length);
    });

    it("maps to unique KnowledgeModel properties", () => {
      const properties = FIELD_MAPPING.map((m) => m.property);
      expect(new Set(properties).size).toBe(properties.length);
    });

    it("maps to valid KnowledgeModel keys", () => {
      const validKeys = Object.keys(emptyKnowledgeModel());
      for (const { property } of FIELD_MAPPING) {
        expect(validKeys).toContain(property);
      }
    });
  });

  describe("emptyKnowledgeModel", () => {
    it("returns an object with all empty strings", () => {
      const model = emptyKnowledgeModel();
      for (const value of Object.values(model)) {
        expect(value).toBe("");
      }
    });

    it("has the same number of keys as FIELD_MAPPING entries", () => {
      const model = emptyKnowledgeModel();
      expect(Object.keys(model).length).toBe(FIELD_MAPPING.length);
    });
  });

  describe("buildKnowledgeModelFromAnswers", () => {
    it("returns empty model when lookup is empty", () => {
      const model = buildKnowledgeModelFromAnswers(new Map());
      expect(model).toEqual(emptyKnowledgeModel());
    });

    it("maps a single answer to the correct property", () => {
      const lookup = new Map<string, string>();
      lookup.set(
        fieldLookupKey("product-and-users", "product-name"),
        "My Product",
      );
      const model = buildKnowledgeModelFromAnswers(lookup);
      expect(model.productName).toBe("My Product");
      // All other fields remain empty
      expect(model.productPurpose).toBe("");
    });

    it("maps all answers when fully populated", () => {
      const lookup = new Map<string, string>();
      for (const { sectionKey, fieldKey, property } of FIELD_MAPPING) {
        lookup.set(fieldLookupKey(sectionKey, fieldKey), `value-${property}`);
      }
      const model = buildKnowledgeModelFromAnswers(lookup);
      for (const { property } of FIELD_MAPPING) {
        expect(model[property]).toBe(`value-${property}`);
      }
    });

    it("ignores unknown keys in the lookup", () => {
      const lookup = new Map<string, string>();
      lookup.set(fieldLookupKey("unknown-section", "unknown-field"), "ignored");
      const model = buildKnowledgeModelFromAnswers(lookup);
      expect(model).toEqual(emptyKnowledgeModel());
    });

    it("preserves exact answer values without trimming or altering", () => {
      const lookup = new Map<string, string>();
      const rawValue = "  TypeScript, Python  \n  Go  ";
      lookup.set(
        fieldLookupKey(
          "tech-stack-and-architecture",
          "programming-languages",
        ),
        rawValue,
      );
      const model = buildKnowledgeModelFromAnswers(lookup);
      expect(model.programmingLanguages).toBe(rawValue);
    });
  });
});
