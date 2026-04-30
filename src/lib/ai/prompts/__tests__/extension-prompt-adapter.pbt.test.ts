// Feature: project-type-and-import, Property 10: Extension prompt adapter injects extension context while preserving format
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  adaptIntakePromptForExtension,
  adaptSectionPromptForExtension,
} from "../extension-prompt-adapter";
import type { ChatMessage } from "@/lib/ai/adapters/types";

// **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

// ── Arbitraries ─────────────────────────────────────────────────────

/** Generate a random ChatMessage role */
const roleArb = fc.constantFrom<ChatMessage["role"]>("system", "user", "assistant");

/** Generate a random ChatMessage */
const chatMessageArb = fc.record({
  role: roleArb,
  content: fc.string({ minLength: 0, maxLength: 300 }),
}) as fc.Arbitrary<ChatMessage>;

/** Generate a ChatMessage[] array with at least one system message */
const messagesWithSystemArb = fc
  .tuple(
    fc.array(chatMessageArb, { minLength: 0, maxLength: 5 }),
    fc.string({ minLength: 0, maxLength: 300 }),
    fc.array(chatMessageArb, { minLength: 0, maxLength: 5 }),
  )
  .map(([before, sysContent, after]) => [
    ...before,
    { role: "system" as const, content: sysContent },
    ...after,
  ]);

/** Generate a random ChatMessage[] array (may or may not contain system messages) */
const messagesArb = fc.array(chatMessageArb, { minLength: 0, maxLength: 10 });

/** Generate a non-empty document summary string */
const documentSummaryArb = fc.string({ minLength: 1, maxLength: 300 });

// ── Property Tests ──────────────────────────────────────────────────

describe("Feature: project-type-and-import, Property 10: Extension prompt adapter injects extension context while preserving format", () => {
  describe("adaptIntakePromptForExtension", () => {
    it("injects 'extending an existing project' into every system message", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, (messages) => {
          const adapted = adaptIntakePromptForExtension(messages);
          const systemMessages = adapted.filter((m) => m.role === "system");

          for (const msg of systemMessages) {
            expect(msg.content).toContain("extending an existing project");
          }
        }),
        { numRuns: 100 },
      );
    });

    it("preserves non-system messages unchanged", () => {
      fc.assert(
        fc.property(messagesArb, (messages) => {
          const adapted = adaptIntakePromptForExtension(messages);
          const originalNonSystem = messages.filter((m) => m.role !== "system");
          const adaptedNonSystem = adapted.filter((m) => m.role !== "system");

          expect(adaptedNonSystem).toEqual(originalNonSystem);
        }),
        { numRuns: 100 },
      );
    });

    it("preserves original system message content in the adapted output", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, (messages) => {
          const adapted = adaptIntakePromptForExtension(messages);
          const originalSystem = messages.filter((m) => m.role === "system");
          const adaptedSystem = adapted.filter((m) => m.role === "system");

          for (let i = 0; i < originalSystem.length; i++) {
            expect(adaptedSystem[i].content).toContain(originalSystem[i].content);
          }
        }),
        { numRuns: 100 },
      );
    });

    it("includes uploaded document summary when provided", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, documentSummaryArb, (messages, summary) => {
          const adapted = adaptIntakePromptForExtension(messages, summary);
          const systemMessages = adapted.filter((m) => m.role === "system");

          for (const msg of systemMessages) {
            expect(msg.content).toContain(summary);
            expect(msg.content).toContain("Uploaded Document Context");
          }
        }),
        { numRuns: 100 },
      );
    });

    it("does NOT include 'Uploaded Document Context' when no summary is provided", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, (messages) => {
          const adapted = adaptIntakePromptForExtension(messages);
          const allContent = adapted.map((m) => m.content).join("");

          expect(allContent).not.toContain("Uploaded Document Context");
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("adaptSectionPromptForExtension", () => {
    it("injects 'extending an existing project' into every system message", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, (messages) => {
          const adapted = adaptSectionPromptForExtension(messages);
          const systemMessages = adapted.filter((m) => m.role === "system");

          for (const msg of systemMessages) {
            expect(msg.content).toContain("extending an existing project");
          }
        }),
        { numRuns: 100 },
      );
    });

    it("preserves non-system messages unchanged", () => {
      fc.assert(
        fc.property(messagesArb, (messages) => {
          const adapted = adaptSectionPromptForExtension(messages);
          const originalNonSystem = messages.filter((m) => m.role !== "system");
          const adaptedNonSystem = adapted.filter((m) => m.role !== "system");

          expect(adaptedNonSystem).toEqual(originalNonSystem);
        }),
        { numRuns: 100 },
      );
    });

    it("preserves original system message content in the adapted output", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, (messages) => {
          const adapted = adaptSectionPromptForExtension(messages);
          const originalSystem = messages.filter((m) => m.role === "system");
          const adaptedSystem = adapted.filter((m) => m.role === "system");

          for (let i = 0; i < originalSystem.length; i++) {
            expect(adaptedSystem[i].content).toContain(originalSystem[i].content);
          }
        }),
        { numRuns: 100 },
      );
    });

    it("includes uploaded document summary when provided", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, documentSummaryArb, (messages, summary) => {
          const adapted = adaptSectionPromptForExtension(messages, summary);
          const systemMessages = adapted.filter((m) => m.role === "system");

          for (const msg of systemMessages) {
            expect(msg.content).toContain(summary);
            expect(msg.content).toContain("Uploaded Document Context");
          }
        }),
        { numRuns: 100 },
      );
    });

    it("does NOT include 'Uploaded Document Context' when no summary is provided", () => {
      fc.assert(
        fc.property(messagesWithSystemArb, (messages) => {
          const adapted = adaptSectionPromptForExtension(messages);
          const allContent = adapted.map((m) => m.content).join("");

          expect(allContent).not.toContain("Uploaded Document Context");
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("output array length and message count preservation", () => {
    it("returns the same number of messages as the input", () => {
      fc.assert(
        fc.property(messagesArb, fc.option(documentSummaryArb, { nil: undefined }), (messages, summary) => {
          const adapted = adaptIntakePromptForExtension(messages, summary);
          expect(adapted).toHaveLength(messages.length);
        }),
        { numRuns: 100 },
      );
    });
  });
});
