import { describe, it, expect } from "vitest";
import {
  calculateDocumentCompleteness,
  type CompletenessStatus,
} from "../calculate-completeness";
import { emptyKnowledgeModel } from "../assemble-knowledge-model";
import type { KnowledgeModel } from "../assemble-knowledge-model";

function modelWith(overrides: Partial<KnowledgeModel>): KnowledgeModel {
  return { ...emptyKnowledgeModel(), ...overrides };
}

describe("calculateDocumentCompleteness", () => {
  it('returns "complete" with empty missingFields when all required fields are present', () => {
    const model = modelWith({
      productName: "Acme",
      productPurpose: "Build widgets",
    });
    const result = calculateDocumentCompleteness(
      ["productName", "productPurpose"],
      model,
    );
    expect(result.status).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it('returns "empty" when all required fields are empty strings', () => {
    const model = emptyKnowledgeModel();
    const result = calculateDocumentCompleteness(
      ["productName", "productPurpose", "targetUsers"],
      model,
    );
    expect(result.status).toBe("empty");
    expect(result.missingFields).toEqual([
      "productName",
      "productPurpose",
      "targetUsers",
    ]);
  });

  it('returns "partial" when some fields are present and some are empty', () => {
    const model = modelWith({ productName: "Acme" });
    const result = calculateDocumentCompleteness(
      ["productName", "productPurpose"],
      model,
    );
    expect(result.status).toBe("partial");
    expect(result.missingFields).toEqual(["productPurpose"]);
  });

  it('returns "complete" when requiredFields is empty', () => {
    const model = emptyKnowledgeModel();
    const result = calculateDocumentCompleteness([], model);
    expect(result.status).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("treats whitespace-only values as empty", () => {
    const model = modelWith({ productName: "   ", productPurpose: "\t\n" });
    const result = calculateDocumentCompleteness(
      ["productName", "productPurpose"],
      model,
    );
    expect(result.status).toBe("empty");
    expect(result.missingFields).toEqual(["productName", "productPurpose"]);
  });

  it("treats a field with content after trimming as present", () => {
    const model = modelWith({ productName: "  Acme  " });
    const result = calculateDocumentCompleteness(["productName"], model);
    expect(result.status).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("handles a single required field that is present", () => {
    const model = modelWith({ frameworks: "Next.js" });
    const result = calculateDocumentCompleteness(["frameworks"], model);
    expect(result.status).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("handles a single required field that is empty", () => {
    const model = emptyKnowledgeModel();
    const result = calculateDocumentCompleteness(["frameworks"], model);
    expect(result.status).toBe("empty");
    expect(result.missingFields).toEqual(["frameworks"]);
  });
});
