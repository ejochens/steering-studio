import { describe, it, expect } from "vitest";
import {
  analyzeGaps,
  type IntakeSectionWithAnswers,
} from "../gap-analyzer";

function makeSection(
  sectionKey: string,
  coverageStatus: string,
  answers: { fieldKey: string; value: string; source: string }[] = [],
): IntakeSectionWithAnswers {
  return {
    id: `section-${sectionKey}`,
    sectionKey,
    coverageStatus,
    answers,
  };
}

describe("analyzeGaps", () => {
  it("returns empty results for empty input", () => {
    const result = analyzeGaps([]);
    expect(result.missingRequired).toEqual([]);
    expect(result.missingOptional).toEqual([]);
    expect(result.confirmedAnswers).toEqual({});
    expect(result.sectionStatuses).toEqual({});
  });

  it("identifies missing required fields when section has no answers", () => {
    const sections = [makeSection("product-and-users", "unknown")];
    const result = analyzeGaps(sections);

    // product-and-users has 4 required fields
    const requiredKeys = result.missingRequired.map((f) => f.fieldKey);
    expect(requiredKeys).toContain("product-name");
    expect(requiredKeys).toContain("product-purpose");
    expect(requiredKeys).toContain("target-users");
    expect(requiredKeys).toContain("primary-use-cases");
    expect(result.missingRequired.length).toBe(4);
  });

  it("does not list required fields that have non-empty answers", () => {
    const sections = [
      makeSection("product-and-users", "partial", [
        { fieldKey: "product-name", value: "My App", source: "user-form" },
        { fieldKey: "product-purpose", value: "Does stuff", source: "user-form" },
        { fieldKey: "target-users", value: "Devs", source: "ai-conversation" },
        { fieldKey: "primary-use-cases", value: "Build things", source: "user-form" },
      ]),
    ];
    const result = analyzeGaps(sections);

    const requiredKeysForSection = result.missingRequired.filter(
      (f) => f.sectionKey === "product-and-users",
    );
    expect(requiredKeysForSection).toEqual([]);
  });

  it("treats empty string answers as missing", () => {
    const sections = [
      makeSection("product-and-users", "partial", [
        { fieldKey: "product-name", value: "", source: "user-form" },
      ]),
    ];
    const result = analyzeGaps(sections);

    const requiredKeys = result.missingRequired
      .filter((f) => f.sectionKey === "product-and-users")
      .map((f) => f.fieldKey);
    expect(requiredKeys).toContain("product-name");
  });

  it("identifies missing optional fields in partial sections", () => {
    const sections = [
      makeSection("problem-and-outcomes", "partial", [
        { fieldKey: "problem-statement", value: "A problem", source: "user-form" },
        { fieldKey: "desired-outcomes", value: "Good outcomes", source: "user-form" },
        { fieldKey: "key-value-proposition", value: "Value", source: "user-form" },
      ]),
    ];
    const result = analyzeGaps(sections);

    // success-metrics is optional and missing in a partial section
    const optionalKeys = result.missingOptional.map((f) => f.fieldKey);
    expect(optionalKeys).toContain("success-metrics");
  });

  it("identifies missing optional fields in unknown sections", () => {
    const sections = [makeSection("problem-and-outcomes", "unknown")];
    const result = analyzeGaps(sections);

    const optionalKeys = result.missingOptional.map((f) => f.fieldKey);
    expect(optionalKeys).toContain("success-metrics");
  });

  it("does not list optional fields as missing in complete sections", () => {
    const sections = [
      makeSection("problem-and-outcomes", "complete", [
        { fieldKey: "problem-statement", value: "A problem", source: "user-form" },
        { fieldKey: "desired-outcomes", value: "Good outcomes", source: "user-form" },
        { fieldKey: "key-value-proposition", value: "Value", source: "user-form" },
      ]),
    ];
    const result = analyzeGaps(sections);

    // success-metrics is optional but section is complete, so not listed
    const optionalKeys = result.missingOptional.map((f) => f.fieldKey);
    expect(optionalKeys).not.toContain("success-metrics");
  });

  it("collects confirmed answers from user-form and ai-conversation sources", () => {
    const sections = [
      makeSection("product-and-users", "partial", [
        { fieldKey: "product-name", value: "My App", source: "user-form" },
        { fieldKey: "product-purpose", value: "Does stuff", source: "ai-conversation" },
        { fieldKey: "target-users", value: "Devs", source: "ai-inferred" },
      ]),
    ];
    const result = analyzeGaps(sections);

    expect(result.confirmedAnswers["product-and-users"]).toEqual({
      "product-name": "My App",
      "product-purpose": "Does stuff",
    });
    // ai-inferred should not be in confirmed
    expect(
      result.confirmedAnswers["product-and-users"]["target-users"],
    ).toBeUndefined();
  });

  it("does not include empty-value answers in confirmedAnswers", () => {
    const sections = [
      makeSection("product-and-users", "partial", [
        { fieldKey: "product-name", value: "", source: "user-form" },
      ]),
    ];
    const result = analyzeGaps(sections);

    expect(result.confirmedAnswers["product-and-users"]).toBeUndefined();
  });

  it("records section statuses for all provided sections", () => {
    const sections = [
      makeSection("product-and-users", "complete"),
      makeSection("problem-and-outcomes", "partial"),
      makeSection("scope-and-non-goals", "unknown"),
    ];
    const result = analyzeGaps(sections);

    expect(result.sectionStatuses).toEqual({
      "product-and-users": "complete",
      "problem-and-outcomes": "partial",
      "scope-and-non-goals": "unknown",
    });
  });

  it("skips sections with unknown sectionKey not in INTAKE_SECTIONS", () => {
    const sections = [
      makeSection("nonexistent-section", "unknown", [
        { fieldKey: "some-field", value: "val", source: "user-form" },
      ]),
    ];
    const result = analyzeGaps(sections);

    // Status is still recorded
    expect(result.sectionStatuses["nonexistent-section"]).toBe("unknown");
    // But no missing fields or confirmed answers since def not found
    expect(result.missingRequired).toEqual([]);
    expect(result.missingOptional).toEqual([]);
    expect(result.confirmedAnswers).toEqual({});
  });

  it("includes label and helpText in missing field entries", () => {
    const sections = [makeSection("product-and-users", "unknown")];
    const result = analyzeGaps(sections);

    const productName = result.missingRequired.find(
      (f) => f.fieldKey === "product-name",
    );
    expect(productName).toBeDefined();
    expect(productName!.label).toBe("Product Name");
    expect(productName!.helpText).toBe(
      "The working name for the product or project.",
    );
  });
});
