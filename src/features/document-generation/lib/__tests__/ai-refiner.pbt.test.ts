// Feature: document-generation, Property 8: Draft content is always stored
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { ProviderConfig } from "@/lib/ai/adapters/types";

// **Validates: Requirements 3.1, 3.4, 9.4**

vi.mock("@/lib/ai/adapters", () => ({
  getAdapter: vi.fn(),
}));

import { getAdapter } from "@/lib/ai/adapters";
import { refineDocument } from "../ai-refiner";

const mockGetAdapter = vi.mocked(getAdapter);

const providerConfig: ProviderConfig = {
  providerType: "openai",
  modelName: "gpt-4",
  authMode: "api_key",
  secret: "test-key",
};

/** Arbitrary: non-empty markdown-like strings to serve as drafts */
const nonEmptyMarkdownArb = fc
  .string({ minLength: 1, maxLength: 500 })
  .filter((s) => s.trim().length > 0)
  .map((s) => "# " + s);

/** Arbitrary: non-empty strings representing AI-refined output */
const nonEmptyRefinedArb = fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0);

describe("Property 8: Draft content is always stored", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when refinement succeeds (wasRefined=true), the refined content is non-empty", () => {
    fc.assert(
      fc.asyncProperty(nonEmptyMarkdownArb, nonEmptyRefinedArb, async (draft, refinedText) => {
        const mockAdapter = {
          testConnection: vi.fn(),
          sendChat: vi.fn().mockResolvedValue({ content: refinedText }),
        };
        mockGetAdapter.mockReturnValue(mockAdapter);

        const result = await refineDocument(draft, providerConfig);

        expect(result.wasRefined).toBe(true);
        expect(result.refined).toBe(refinedText);
        expect(result.refined.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("when refinement fails (wasRefined=false), the refined content equals the original draft exactly", () => {
    fc.assert(
      fc.asyncProperty(nonEmptyMarkdownArb, async (draft) => {
        const mockAdapter = {
          testConnection: vi.fn(),
          sendChat: vi.fn().mockRejectedValue(new Error("Provider unavailable")),
        };
        mockGetAdapter.mockReturnValue(mockAdapter);

        const result = await refineDocument(draft, providerConfig);

        expect(result.wasRefined).toBe(false);
        expect(result.refined).toBe(draft);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  it("the original draft is never lost regardless of refinement outcome", () => {
    fc.assert(
      fc.asyncProperty(
        nonEmptyMarkdownArb,
        fc.boolean(),
        async (draft, shouldSucceed) => {
          if (shouldSucceed) {
            const mockAdapter = {
              testConnection: vi.fn(),
              sendChat: vi.fn().mockResolvedValue({ content: "refined: " + draft }),
            };
            mockGetAdapter.mockReturnValue(mockAdapter);
          } else {
            const mockAdapter = {
              testConnection: vi.fn(),
              sendChat: vi.fn().mockRejectedValue(new Error("fail")),
            };
            mockGetAdapter.mockReturnValue(mockAdapter);
          }

          const result = await refineDocument(draft, providerConfig);

          // In both cases, the result has non-empty refined content
          expect(result.refined.length).toBeGreaterThan(0);

          if (result.wasRefined) {
            // Refinement succeeded — refined content is non-empty (draft available via draftContent at persistence layer)
            expect(typeof result.refined).toBe("string");
            expect(result.refined.length).toBeGreaterThan(0);
          } else {
            // Refinement failed — refined content IS the original draft (draft preserved)
            expect(result.refined).toBe(draft);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
