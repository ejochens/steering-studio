import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  type ResolvedBoundaries,
  renderBoundariesMarkdown,
} from "@/features/document-generation/lib/ai-boundaries-defaults";

// ── Generators ───────────────────────────────────────────────────────

const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter((s) => s.trim().length > 0);

const optionalStringArb = fc.oneof(fc.constant(""), nonEmptyStringArb);

const stringArrayArb = fc.array(
  fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
  { minLength: 0, maxLength: 5 },
);

const developmentOsArb = fc.oneof(
  fc.constant("Windows"),
  fc.constant("Linux"),
  fc.constant("macOS"),
  fc.constant("Mixed/Cross-platform"),
  fc.constant("Other"),
  fc.constant(""),
);

const shellArb = fc.oneof(
  fc.constant("PowerShell"),
  fc.constant("Bash"),
  fc.constant("Zsh"),
  fc.constant("Fish"),
  fc.constant("Command Prompt"),
  fc.constant(""),
);

/** Generate a random ResolvedBoundaries object */
function resolvedBoundariesArb(): fc.Arbitrary<ResolvedBoundaries> {
  return fc.record({
    allowedPromptData: stringArrayArb,
    prohibitedPromptData: stringArrayArb,
    sensitiveDataRedaction: optionalStringArb,
    allowedOperationalArtifacts: stringArrayArb,
    environmentRestrictions: optionalStringArb,
    aiWorkspaceScope: fc.oneof(fc.constant("Current repo only"), nonEmptyStringArb),
    prohibitedLocalAccess: stringArrayArb,
    inspectGeneratedFiles: optionalStringArb,
    readLocalConfig: optionalStringArb,
    externalModelCalls: fc.oneof(fc.constant("Only approved enterprise services"), nonEmptyStringArb),
    approvedAiProviders: stringArrayArb,
    consumerAiToolsProhibited: optionalStringArb,
    unmanagedExtensionsProhibited: optionalStringArb,
    networkTenantRestrictions: optionalStringArb,
    secretsInPrompts: fc.oneof(fc.constant("No"), fc.constant("Yes with restrictions"), fc.constant("")),
    secretHandlingMechanism: stringArrayArb,
    sensitiveCodeCategories: stringArrayArb,
    aiGenerateSensitiveCode: optionalStringArb,
    developerProhibitedContent: stringArrayArb,
    humanValidationAreas: stringArrayArb,
    verifyAiOutputBeforeCommit: fc.oneof(fc.constant("Yes"), fc.constant("No"), fc.constant("")),
    manualReviewInfraSecurity: fc.oneof(fc.constant("Yes"), fc.constant("No"), fc.constant("")),
    approvalBeforeProceed: stringArrayArb,
    approvalBeforeMerge: stringArrayArb,
    approvalBeforeDeploy: stringArrayArb,
    stopOnUnclearBoundaries: fc.oneof(fc.constant("Yes"), fc.constant("No"), fc.constant("")),
    escalationContact: optionalStringArb,
    developmentOs: developmentOsArb,
    preferredShell: shellArb,
    crossPlatformSupport: optionalStringArb,
    examplesDefaultToOs: fc.oneof(fc.constant("Yes"), fc.constant("No"), fc.constant("")),
  });
}

/** Generate a ResolvedBoundaries with at least one non-empty field */
function resolvedBoundariesWithContentArb(): fc.Arbitrary<ResolvedBoundaries> {
  return resolvedBoundariesArb().filter((b) => {
    return (
      b.allowedPromptData.length > 0 ||
      b.prohibitedPromptData.length > 0 ||
      b.aiWorkspaceScope.trim().length > 0 ||
      b.externalModelCalls.trim().length > 0 ||
      b.secretsInPrompts.trim().length > 0 ||
      b.verifyAiOutputBeforeCommit.trim().length > 0 ||
      b.manualReviewInfraSecurity.trim().length > 0 ||
      b.humanValidationAreas.length > 0 ||
      b.developerProhibitedContent.length > 0 ||
      b.stopOnUnclearBoundaries.trim().length > 0 ||
      b.developmentOs.trim().length > 0
    );
  });
}

// ── Subsection headings ──────────────────────────────────────────────

const SUBSECTION_HEADINGS = [
  "Allowed Prompt Content",
  "Prohibited Prompt Content",
  "Local Access Scope",
  "External AI/Model Usage Rules",
  "Secrets and Sensitive Code Handling",
  "Developer Usage Guardrails",
  "Human Approval and Escalation Rules",
  "Development Operating System and CLI Conventions",
] as const;

// ── Feature: ai-usage-boundaries, Property 2: Rendered boundaries section contains correct title and ordered subsections ──

// **Validates: Requirements 10.1, 10.2**
describe("Property 2: Rendered boundaries section contains correct title and ordered subsections", () => {
  it("output contains the main title and all 8 subsection headings in correct order", () => {
    fc.assert(
      fc.property(resolvedBoundariesArb(), (resolved) => {
        const output = renderBoundariesMarkdown(resolved);

        // Must contain the main title
        expect(output).toContain("AI Usage, Data Handling, and Access Boundaries");

        // All subsection headings must appear in order
        let lastIndex = -1;
        for (const heading of SUBSECTION_HEADINGS) {
          const idx = output.indexOf(`## ${heading}`);
          expect(idx).toBeGreaterThan(lastIndex);
          lastIndex = idx;
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ── Feature: ai-usage-boundaries, Property 3: Rendered boundaries section uses imperative language and avoids soft language ──

// **Validates: Requirements 10.3, 10.4**
describe("Property 3: Rendered boundaries section uses imperative language and avoids soft language", () => {
  const IMPERATIVE_TERMS = [
    "must",
    "must not",
    "only",
    "prohibited",
    "requires approval",
    "out of scope",
  ];

  const SOFT_PHRASES = [
    "should be careful",
    "preferably",
    "generally avoid",
    "try not to",
  ];

  it("contains at least one imperative term and no soft phrases", () => {
    fc.assert(
      fc.property(resolvedBoundariesWithContentArb(), (resolved) => {
        const output = renderBoundariesMarkdown(resolved);
        const lower = output.toLowerCase();

        // At least one imperative term must be present
        const hasImperative = IMPERATIVE_TERMS.some((term) =>
          lower.includes(term),
        );
        expect(hasImperative).toBe(true);

        // No soft phrases must be present
        for (const phrase of SOFT_PHRASES) {
          expect(lower).not.toContain(phrase);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ── Feature: ai-usage-boundaries, Property 4: OS-aware CLI guidance matches the development OS ──

// **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
describe("Property 4: OS-aware CLI guidance matches the development OS", () => {
  it("Windows OS mentions PowerShell and semicolons", () => {
    fc.assert(
      fc.property(
        resolvedBoundariesArb().map((b) => ({
          ...b,
          developmentOs: "Windows",
        })),
        (resolved) => {
          const output = renderBoundariesMarkdown(resolved);
          expect(output).toContain("PowerShell");
          expect(output).toContain(";");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Linux OS mentions preferred shell or Bash", () => {
    fc.assert(
      fc.property(
        resolvedBoundariesArb().map((b) => ({
          ...b,
          developmentOs: "Linux",
        })),
        (resolved) => {
          const output = renderBoundariesMarkdown(resolved);
          if (resolved.preferredShell) {
            expect(output).toContain(resolved.preferredShell);
          } else {
            expect(output).toContain("Bash");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("macOS mentions preferred shell or Bash", () => {
    fc.assert(
      fc.property(
        resolvedBoundariesArb().map((b) => ({
          ...b,
          developmentOs: "macOS",
        })),
        (resolved) => {
          const output = renderBoundariesMarkdown(resolved);
          if (resolved.preferredShell) {
            expect(output).toContain(resolved.preferredShell);
          } else {
            expect(output).toContain("Bash");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Mixed/Cross-platform mentions cross-platform", () => {
    fc.assert(
      fc.property(
        resolvedBoundariesArb().map((b) => ({
          ...b,
          developmentOs: "Mixed/Cross-platform",
        })),
        (resolved) => {
          const output = renderBoundariesMarkdown(resolved);
          expect(output.toLowerCase()).toContain("cross-platform");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("examplesDefaultToOs=Yes states examples default to the selected OS", () => {
    fc.assert(
      fc.property(
        resolvedBoundariesArb()
          .filter((b) => b.developmentOs.trim().length > 0)
          .map((b) => ({
            ...b,
            examplesDefaultToOs: "Yes",
          })),
        (resolved) => {
          const output = renderBoundariesMarkdown(resolved);
          const lower = output.toLowerCase();
          expect(lower).toContain("examples");
          expect(lower).toContain("default");
          expect(lower).toContain(resolved.developmentOs.toLowerCase());
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Feature: ai-usage-boundaries, Property 5: Kiro and Copilot boundaries content uses the same resolved values ──

// **Validates: Requirements 12.3**
describe("Property 5: Kiro and Copilot boundaries content uses the same resolved values", () => {
  it("renderBoundariesMarkdown produces identical output for the same resolved boundaries", () => {
    fc.assert(
      fc.property(resolvedBoundariesArb(), (resolved) => {
        const output1 = renderBoundariesMarkdown(resolved);
        const output2 = renderBoundariesMarkdown(resolved);
        expect(output1).toBe(output2);
      }),
      { numRuns: 100 },
    );
  });
});
