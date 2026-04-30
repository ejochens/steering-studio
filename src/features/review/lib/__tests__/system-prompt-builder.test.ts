import { describe, it, expect } from "vitest";
import { buildReviewSystemPrompt } from "../system-prompt-builder";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import type { GapSummary } from "../gap-analyzer";

function makeGapSummary(overrides: Partial<GapSummary> = {}): GapSummary {
  return {
    missingRequired: [],
    missingOptional: [],
    confirmedAnswers: {},
    sectionStatuses: {},
    ...overrides,
  };
}

describe("buildReviewSystemPrompt", () => {
  it("includes the project name in the role definition", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "My Project");
    expect(prompt).toContain('"My Project"');
  });

  it("includes confirmed answers in the prompt (Req 4.1, 4.4)", () => {
    const summary = makeGapSummary({
      confirmedAnswers: {
        "product-and-users": {
          "product-name": "Steering Studio",
          "product-purpose": "Helps teams create context packs",
        },
      },
    });
    const prompt = buildReviewSystemPrompt(summary, "Test");
    expect(prompt).toContain("Steering Studio");
    expect(prompt).toContain("Helps teams create context packs");
    expect(prompt).toContain("product-name");
    expect(prompt).toContain("product-purpose");
  });

  it("includes missing required fields in the prompt (Req 4.1)", () => {
    const summary = makeGapSummary({
      missingRequired: [
        {
          sectionKey: "product-and-users",
          fieldKey: "target-users",
          label: "Target Users",
          helpText: "Describe the primary users.",
        },
      ],
    });
    const prompt = buildReviewSystemPrompt(summary, "Test");
    expect(prompt).toContain("target-users");
    expect(prompt).toContain("Target Users");
    expect(prompt).toContain("Missing Required Fields");
  });

  it("includes missing optional fields in the prompt", () => {
    const summary = makeGapSummary({
      missingOptional: [
        {
          sectionKey: "problem-and-outcomes",
          fieldKey: "success-metrics",
          label: "Success Metrics",
          helpText: "How will you measure success?",
        },
      ],
    });
    const prompt = buildReviewSystemPrompt(summary, "Test");
    expect(prompt).toContain("success-metrics");
    expect(prompt).toContain("Missing Optional Fields");
  });

  it("instructs to ask one question at a time (Req 4.2)", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "Test");
    expect(prompt).toMatch(/one.*question.*at a time/i);
  });

  it("instructs to explain why questions matter (Req 4.3)", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "Test");
    expect(prompt).toMatch(/explain.*why/i);
  });

  it("instructs to avoid re-asking confirmed information (Req 4.4)", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "Test");
    expect(prompt).toMatch(/not re-ask|do not re-ask|avoid.*re-ask|confirmed.*settled|NEVER claim.*confirmed/i);
  });

  it("instructs to summarize at milestones (Req 4.5)", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "Test");
    expect(prompt).toMatch(/summarize/i);
    expect(prompt).toMatch(/milestone/i);
  });

  it("instructs to avoid inventing constraints (Req 4.6)", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "Test");
    expect(prompt).toMatch(/not invent|do not invent/i);
  });

  it("includes valid section keys and field keys (Req 4.7)", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "Test");
    for (const section of INTAKE_SECTIONS) {
      expect(prompt).toContain(section.sectionKey);
      for (const field of section.fields) {
        expect(prompt).toContain(field.fieldKey);
      }
    }
  });

  it("shows 'no answers confirmed' message when confirmedAnswers is empty", () => {
    const prompt = buildReviewSystemPrompt(makeGapSummary(), "Test");
    expect(prompt).toContain("No answers have been confirmed yet");
  });
});
