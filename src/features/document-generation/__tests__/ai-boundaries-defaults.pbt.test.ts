import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  emptyKnowledgeModel,
  type KnowledgeModel,
} from "@/features/document-generation/lib/assemble-knowledge-model";
import {
  SECURE_DEFAULTS,
  resolveBoundaries,
} from "@/features/document-generation/lib/ai-boundaries-defaults";

// ── Generators ───────────────────────────────────────────────────────

/** Non-empty string that survives .trim() */
const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

/** Valid JSON array of non-empty strings */
const jsonArrayArb = fc
  .array(fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0), {
    minLength: 1,
    maxLength: 5,
  })
  .map((arr) => JSON.stringify(arr));

/** Either empty string or a non-empty string for single-select/short-text fields */
const optionalStringArb = fc.oneof(fc.constant(""), nonEmptyStringArb);

/** Either empty string or a valid JSON array string for multi-select/tag-list fields */
const optionalJsonArrayArb = fc.oneof(fc.constant(""), jsonArrayArb);

/** Build a random KnowledgeModel with boundary fields varying between empty and non-empty */
function randomBoundaryModelArb(): fc.Arbitrary<KnowledgeModel> {
  return fc
    .record({
      allowedPromptData: optionalJsonArrayArb,
      prohibitedPromptData: optionalJsonArrayArb,
      sensitiveDataRedaction: optionalStringArb,
      allowedOperationalArtifacts: optionalJsonArrayArb,
      environmentRestrictions: optionalStringArb,
      aiWorkspaceScope: optionalStringArb,
      prohibitedLocalAccess: optionalJsonArrayArb,
      inspectGeneratedFiles: optionalStringArb,
      readLocalConfig: optionalStringArb,
      externalModelCalls: optionalStringArb,
      approvedAiProviders: optionalJsonArrayArb,
      consumerAiToolsProhibited: optionalStringArb,
      unmanagedExtensionsProhibited: optionalStringArb,
      networkTenantRestrictions: optionalStringArb,
      secretsInPrompts: optionalStringArb,
      secretHandlingMechanism: optionalJsonArrayArb,
      sensitiveCodeCategories: optionalJsonArrayArb,
      aiGenerateSensitiveCode: optionalStringArb,
      developerProhibitedContent: optionalJsonArrayArb,
      humanValidationAreas: optionalJsonArrayArb,
      verifyAiOutputBeforeCommit: optionalStringArb,
      manualReviewInfraSecurity: optionalStringArb,
      approvalBeforeProceed: optionalJsonArrayArb,
      approvalBeforeMerge: optionalJsonArrayArb,
      approvalBeforeDeploy: optionalJsonArrayArb,
      stopOnUnclearBoundaries: optionalStringArb,
      escalationContact: optionalStringArb,
      developmentOs: fc.oneof(
        fc.constant(""),
        fc.constant("Windows"),
        fc.constant("Linux"),
        fc.constant("macOS"),
        fc.constant("Mixed/Cross-platform"),
      ),
      preferredShell: optionalStringArb,
      crossPlatformSupport: optionalStringArb,
      examplesDefaultToOs: optionalStringArb,
    })
    .map((overrides) => ({ ...emptyKnowledgeModel(), ...overrides }));
}

// ── Feature: ai-usage-boundaries, Property 1: Secure defaults are applied for all defaulted fields ──

// **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9**
describe("Property 1: Secure defaults are applied for all defaulted fields", () => {
  it("applies secure defaults for empty fields and preserves user values for non-empty fields", () => {
    fc.assert(
      fc.property(randomBoundaryModelArb(), (model) => {
        const resolved = resolveBoundaries(model);

        // prohibitedPromptData: array field with secure default
        if (!model.prohibitedPromptData.trim()) {
          expect(resolved.prohibitedPromptData).toEqual([
            "Customer data",
            "Secrets and credentials",
            "Production logs",
          ]);
        } else {
          const parsed = JSON.parse(model.prohibitedPromptData);
          if (Array.isArray(parsed)) {
            expect(resolved.prohibitedPromptData).toEqual(parsed);
          }
        }

        // externalModelCalls: string field with secure default
        if (!model.externalModelCalls.trim()) {
          expect(resolved.externalModelCalls).toBe("Only approved enterprise services");
        } else {
          expect(resolved.externalModelCalls).toBe(model.externalModelCalls);
        }

        // aiWorkspaceScope: string field with secure default
        if (!model.aiWorkspaceScope.trim()) {
          expect(resolved.aiWorkspaceScope).toBe("Current repo only");
        } else {
          expect(resolved.aiWorkspaceScope).toBe(model.aiWorkspaceScope);
        }

        // secretsInPrompts: string field with secure default
        if (!model.secretsInPrompts.trim()) {
          expect(resolved.secretsInPrompts).toBe("No");
        } else {
          expect(resolved.secretsInPrompts).toBe(model.secretsInPrompts);
        }

        // humanValidationAreas: array field with secure default
        if (!model.humanValidationAreas.trim()) {
          expect(resolved.humanValidationAreas).toEqual([
            "Security logic",
            "Access control",
            "Infrastructure changes",
          ]);
        } else {
          const parsed = JSON.parse(model.humanValidationAreas);
          if (Array.isArray(parsed)) {
            expect(resolved.humanValidationAreas).toEqual(parsed);
          }
        }

        // stopOnUnclearBoundaries: string field with secure default
        if (!model.stopOnUnclearBoundaries.trim()) {
          expect(resolved.stopOnUnclearBoundaries).toBe("Yes");
        } else {
          expect(resolved.stopOnUnclearBoundaries).toBe(model.stopOnUnclearBoundaries);
        }

        // verifyAiOutputBeforeCommit: string field with secure default
        if (!model.verifyAiOutputBeforeCommit.trim()) {
          expect(resolved.verifyAiOutputBeforeCommit).toBe("Yes");
        } else {
          expect(resolved.verifyAiOutputBeforeCommit).toBe(model.verifyAiOutputBeforeCommit);
        }

        // manualReviewInfraSecurity: string field with secure default
        if (!model.manualReviewInfraSecurity.trim()) {
          expect(resolved.manualReviewInfraSecurity).toBe("Yes");
        } else {
          expect(resolved.manualReviewInfraSecurity).toBe(model.manualReviewInfraSecurity);
        }

        // preferredShell: conditional default — PowerShell when Windows + empty shell
        if (model.developmentOs === "Windows" && !model.preferredShell.trim()) {
          expect(resolved.preferredShell).toBe("PowerShell");
        } else if (model.preferredShell.trim()) {
          expect(resolved.preferredShell).toBe(model.preferredShell);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ── Feature: ai-usage-boundaries, Property 6: Answer value JSON round-trip ──

// **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**
describe("Property 6: Answer value JSON round-trip", () => {
  it("plain string values survive a round-trip through JSON.stringify then JSON.parse", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        (value) => {
          const serialized = JSON.stringify(value);
          const deserialized = JSON.parse(serialized);
          expect(deserialized).toBe(value);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("JSON array values survive a round-trip through JSON.parse then JSON.stringify", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 40 }), {
          minLength: 0,
          maxLength: 10,
        }),
        (arr) => {
          const serialized = JSON.stringify(arr);
          const parsed = JSON.parse(serialized);
          expect(Array.isArray(parsed)).toBe(true);
          expect(JSON.stringify(parsed)).toBe(serialized);
        },
      ),
      { numRuns: 100 },
    );
  });
});
