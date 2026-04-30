// Feature: chat-clarification, Property: Review validation schemas accept valid inputs and reject invalid ones
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  sendReviewMessageSchema,
  extractReviewFactsSchema,
  acceptReviewFactSchema,
} from "@/lib/validation/review";

// **Validates: Requirements 5.1, 7.3**

// ── Arbitraries ─────────────────────────────────────────────────────

const validProjectIdArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

const validContentArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);

const validSectionKeyArb = fc.constantFrom(
  "product-and-users",
  "problem-and-outcomes",
  "scope-and-non-goals",
  "tech-stack-and-architecture",
  "project-structure-and-conventions",
  "testing-and-quality",
  "security-and-compliance",
  "workflows-and-team-practices",
);

const invalidSectionKeyArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter(
    (s) =>
      ![
        "product-and-users",
        "problem-and-outcomes",
        "scope-and-non-goals",
        "tech-stack-and-architecture",
        "project-structure-and-conventions",
        "testing-and-quality",
        "security-and-compliance",
        "workflows-and-team-practices",
      ].includes(s),
  );

const validFieldKeyArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

const validValueArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

// ── sendReviewMessageSchema ─────────────────────────────────────────

describe("Property: sendReviewMessageSchema accepts valid inputs and rejects invalid ones", () => {
  it("accepts valid projectId and content", () => {
    fc.assert(
      fc.property(validProjectIdArb, validContentArb, (projectId, content) => {
        const result = sendReviewMessageSchema.safeParse({ projectId, content });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty projectId", () => {
    fc.assert(
      fc.property(validContentArb, (content) => {
        const result = sendReviewMessageSchema.safeParse({ projectId: "", content });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty content", () => {
    fc.assert(
      fc.property(validProjectIdArb, (projectId) => {
        const result = sendReviewMessageSchema.safeParse({ projectId, content: "" });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects content exceeding 10000 characters", () => {
    fc.assert(
      fc.property(
        validProjectIdArb,
        fc.string({ minLength: 10001, maxLength: 10100 }),
        (projectId, content) => {
          const result = sendReviewMessageSchema.safeParse({ projectId, content });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── extractReviewFactsSchema ────────────────────────────────────────

describe("Property: extractReviewFactsSchema accepts valid inputs and rejects invalid ones", () => {
  it("accepts valid projectId", () => {
    fc.assert(
      fc.property(validProjectIdArb, (projectId) => {
        const result = extractReviewFactsSchema.safeParse({ projectId });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty projectId", () => {
    const result = extractReviewFactsSchema.safeParse({ projectId: "" });
    expect(result.success).toBe(false);
  });
});

// ── acceptReviewFactSchema ──────────────────────────────────────────

describe("Property: acceptReviewFactSchema accepts valid inputs and rejects invalid ones", () => {
  it("accepts valid projectId, sectionKey, fieldKey, and value", () => {
    fc.assert(
      fc.property(
        validProjectIdArb,
        validSectionKeyArb,
        validFieldKeyArb,
        validValueArb,
        (projectId, sectionKey, fieldKey, value) => {
          const result = acceptReviewFactSchema.safeParse({
            projectId,
            sectionKey,
            fieldKey,
            value,
          });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects empty projectId", () => {
    fc.assert(
      fc.property(
        validSectionKeyArb,
        validFieldKeyArb,
        validValueArb,
        (sectionKey, fieldKey, value) => {
          const result = acceptReviewFactSchema.safeParse({
            projectId: "",
            sectionKey,
            fieldKey,
            value,
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects invalid sectionKey", () => {
    fc.assert(
      fc.property(
        validProjectIdArb,
        invalidSectionKeyArb,
        validFieldKeyArb,
        validValueArb,
        (projectId, sectionKey, fieldKey, value) => {
          const result = acceptReviewFactSchema.safeParse({
            projectId,
            sectionKey,
            fieldKey,
            value,
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects empty fieldKey", () => {
    fc.assert(
      fc.property(
        validProjectIdArb,
        validSectionKeyArb,
        validValueArb,
        (projectId, sectionKey, value) => {
          const result = acceptReviewFactSchema.safeParse({
            projectId,
            sectionKey,
            fieldKey: "",
            value,
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects empty value", () => {
    fc.assert(
      fc.property(
        validProjectIdArb,
        validSectionKeyArb,
        validFieldKeyArb,
        (projectId, sectionKey, fieldKey) => {
          const result = acceptReviewFactSchema.safeParse({
            projectId,
            sectionKey,
            fieldKey,
            value: "",
          });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
