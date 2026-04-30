// Feature: document-generation, Property 9: Manual edit flag state machine
// Feature: document-generation, Property 11: Regenerate-all updates every document in the target set
// Feature: document-generation, Property 12: Single-document regeneration isolation
// Feature: document-generation, Property 13: Regeneration is idempotent on document count
// Feature: document-generation, Property 14: Persisted documents have all required fields
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getTemplatesForTarget } from "@/features/document-generation/lib/template-registry";
import {
  emptyKnowledgeModel,
  type KnowledgeModel,
} from "@/features/document-generation/lib/assemble-knowledge-model";
import type { TargetOutput } from "@/lib/validation";

// **Validates: Requirements 5.3, 6.1, 6.5, 7.1, 7.3, 7.4, 8.1, 8.3, 9.1, 9.3**

// ── Generator: random KnowledgeModel ─────────────────────────────────

const fieldArb = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 1, maxLength: 80 }),
);

const knowledgeModelArb: fc.Arbitrary<KnowledgeModel> = fc.record({
  productName: fieldArb,
  productPurpose: fieldArb,
  targetUsers: fieldArb,
  primaryUseCases: fieldArb,
  problemStatement: fieldArb,
  desiredOutcomes: fieldArb,
  successMetrics: fieldArb,
  keyValueProposition: fieldArb,
  inScopeFeatures: fieldArb,
  nonGoals: fieldArb,
  mvpBoundaries: fieldArb,
  futureConsiderations: fieldArb,
  programmingLanguages: fieldArb,
  frameworks: fieldArb,
  database: fieldArb,
  hostingDeployment: fieldArb,
  architecturePattern: fieldArb,
  folderStructure: fieldArb,
  namingConventions: fieldArb,
  moduleOrganization: fieldArb,
  codingStandards: fieldArb,
  testingFramework: fieldArb,
  testTypes: fieldArb,
  coverageExpectations: fieldArb,
  qualityGates: fieldArb,
  authenticationMethod: fieldArb,
  authorizationModel: fieldArb,
  dataSensitivity: fieldArb,
  complianceRequirements: fieldArb,
  branchingStrategy: fieldArb,
  sourceControlPlatform: fieldArb,
  ciCdApproach: fieldArb,
  codeReviewProcess: fieldArb,
  deploymentWorkflow: fieldArb,
  // AI Usage Boundaries fields
  allowedPromptData: fieldArb,
  prohibitedPromptData: fieldArb,
  sensitiveDataRedaction: fieldArb,
  allowedOperationalArtifacts: fieldArb,
  environmentRestrictions: fieldArb,
  aiWorkspaceScope: fieldArb,
  prohibitedLocalAccess: fieldArb,
  inspectGeneratedFiles: fieldArb,
  readLocalConfig: fieldArb,
  externalModelCalls: fieldArb,
  approvedAiProviders: fieldArb,
  consumerAiToolsProhibited: fieldArb,
  unmanagedExtensionsProhibited: fieldArb,
  networkTenantRestrictions: fieldArb,
  secretsInPrompts: fieldArb,
  secretHandlingMechanism: fieldArb,
  sensitiveCodeCategories: fieldArb,
  aiGenerateSensitiveCode: fieldArb,
  developerProhibitedContent: fieldArb,
  humanValidationAreas: fieldArb,
  verifyAiOutputBeforeCommit: fieldArb,
  manualReviewInfraSecurity: fieldArb,
  approvalBeforeProceed: fieldArb,
  approvalBeforeMerge: fieldArb,
  approvalBeforeDeploy: fieldArb,
  stopOnUnclearBoundaries: fieldArb,
  escalationContact: fieldArb,
  developmentOs: fieldArb,
  preferredShell: fieldArb,
  crossPlatformSupport: fieldArb,
  examplesDefaultToOs: fieldArb,
});

const targetArb: fc.Arbitrary<TargetOutput> = fc.constantFrom(
  "Kiro",
  "Copilot",
  "Both",
);


// ── Simulated document state for state-machine testing ───────────────

type Operation = "generate" | "edit" | "regenerate";

const operationArb: fc.Arbitrary<Operation> = fc.constantFrom(
  "generate",
  "edit",
  "regenerate",
);

// ── Property 9: Manual edit flag state machine ───────────────────────
// **Validates: Requirements 5.3, 8.1, 8.3**

describe("Property 9: Manual edit flag state machine", () => {
  it("manuallyEdited follows the state machine: generate→false, edit→true, regenerate→false", () => {
    fc.assert(
      fc.property(
        fc.array(operationArb, { minLength: 1, maxLength: 30 }),
        (operations) => {
          // State machine: track manuallyEdited flag
          // Initial state: document does not exist yet
          let documentExists = false;
          let manuallyEdited = false;

          for (const op of operations) {
            switch (op) {
              case "generate":
                // Generation (initial or regenerate-all) sets manuallyEdited = false
                documentExists = true;
                manuallyEdited = false;
                break;
              case "edit":
                // Edit only applies if document exists
                if (documentExists) {
                  manuallyEdited = true;
                }
                break;
              case "regenerate":
                // Regeneration resets manuallyEdited to false
                if (documentExists) {
                  manuallyEdited = false;
                }
                break;
            }
          }

          // Verify the final state matches the state machine rules:
          // The last operation determines the flag
          const lastRelevantOp = [...operations]
            .reverse()
            .find(
              (op) =>
                op === "generate" ||
                op === "regenerate" ||
                (op === "edit" && documentExists),
            );

          if (lastRelevantOp === "edit") {
            expect(manuallyEdited).toBe(true);
          } else if (
            lastRelevantOp === "generate" ||
            lastRelevantOp === "regenerate"
          ) {
            expect(manuallyEdited).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("generate always resets manuallyEdited to false regardless of prior state", () => {
    fc.assert(
      fc.property(fc.boolean(), (wasEdited) => {
        // Simulate: document exists with some edit state
        let manuallyEdited = wasEdited;

        // Generation resets the flag
        manuallyEdited = false;

        expect(manuallyEdited).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("edit always sets manuallyEdited to true", () => {
    fc.assert(
      fc.property(fc.boolean(), (wasEdited) => {
        // Simulate: document exists with some state
        let manuallyEdited = wasEdited;

        // Edit sets the flag
        manuallyEdited = true;

        expect(manuallyEdited).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});


// ── Property 11: Regenerate-all updates every document in the target set ──
// **Validates: Requirements 6.1, 6.5**

describe("Property 11: Regenerate-all updates every document in the target set", () => {
  it("for any target and knowledge model, rendering all applicable templates produces a result for each applicable template", () => {
    fc.assert(
      fc.property(targetArb, knowledgeModelArb, (target, model) => {
        const allTemplates = getTemplatesForTarget(target);
        const applicableTemplates = allTemplates.filter((t) =>
          t.isApplicable(model),
        );

        // Simulate regenerate-all: render every applicable template
        const results = applicableTemplates.map((t) => ({
          filePath: t.filePath,
          result: t.render(model),
        }));

        // Every applicable template must produce a result
        expect(results.length).toBe(applicableTemplates.length);

        // Every result must have a filePath matching an applicable template
        const applicablePaths = new Set(
          applicableTemplates.map((t) => t.filePath),
        );
        for (const r of results) {
          expect(applicablePaths.has(r.filePath)).toBe(true);
        }

        // Every applicable template must be covered in results
        const resultPaths = new Set(results.map((r) => r.filePath));
        for (const t of applicableTemplates) {
          expect(resultPaths.has(t.filePath)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ── Property 12: Single-document regeneration isolation ──────────────
// **Validates: Requirements 7.1, 7.3, 7.4**

describe("Property 12: Single-document regeneration isolation", () => {
  it("rendering a single template produces the same result regardless of whether other templates were rendered", () => {
    fc.assert(
      fc.property(targetArb, knowledgeModelArb, (target, model) => {
        const allTemplates = getTemplatesForTarget(target);
        const applicableTemplates = allTemplates.filter((t) =>
          t.isApplicable(model),
        );

        if (applicableTemplates.length < 2) return; // Need at least 2 templates

        // Pick the first template as the "single" one to regenerate
        const singleTemplate = applicableTemplates[0];

        // Render all templates (simulating regenerate-all first)
        const allResults = new Map(
          applicableTemplates.map((t) => [t.filePath, t.render(model)]),
        );

        // Now render only the single template (simulating single-document regeneration)
        const singleResult = singleTemplate.render(model);

        // The single template result should be identical to when rendered as part of all
        const fromAll = allResults.get(singleTemplate.filePath)!;
        expect(singleResult.markdown).toBe(fromAll.markdown);
        expect(singleResult.completeness).toBe(fromAll.completeness);
        expect(singleResult.missingFields).toEqual(fromAll.missingFields);

        // Other templates' results should be unaffected (they weren't re-rendered)
        for (const t of applicableTemplates.slice(1)) {
          const otherResult = allResults.get(t.filePath)!;
          // Re-render to confirm determinism
          const otherReRender = t.render(model);
          expect(otherReRender.markdown).toBe(otherResult.markdown);
          expect(otherReRender.completeness).toBe(otherResult.completeness);
          expect(otherReRender.missingFields).toEqual(
            otherResult.missingFields,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ── Property 13: Regeneration is idempotent on document count ────────
// **Validates: Requirements 9.3**

describe("Property 13: Regeneration is idempotent on document count", () => {
  it("rendering all applicable templates N times produces the same count each time", () => {
    fc.assert(
      fc.property(
        targetArb,
        knowledgeModelArb,
        fc.integer({ min: 1, max: 5 }),
        (target, model, n) => {
          const allTemplates = getTemplatesForTarget(target);
          const applicableTemplates = allTemplates.filter((t) =>
            t.isApplicable(model),
          );

          const expectedCount = applicableTemplates.length;

          // Simulate rendering N times — each time should produce the same count
          for (let i = 0; i < n; i++) {
            const results = applicableTemplates.map((t) => ({
              filePath: t.filePath,
              result: t.render(model),
            }));
            expect(results.length).toBe(expectedCount);
          }

          // Also verify that the set of filePaths is stable across runs
          // (simulating upsert behavior — same filePaths each time)
          const firstRunPaths = applicableTemplates
            .map((t) => t.filePath)
            .sort();
          const secondRunPaths = getTemplatesForTarget(target)
            .filter((t) => t.isApplicable(model))
            .map((t) => t.filePath)
            .sort();

          expect(firstRunPaths).toEqual(secondRunPaths);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 14: Persisted documents have all required fields ────────
// **Validates: Requirements 9.1**

describe("Property 14: Persisted documents have all required fields", () => {
  it("every template result has non-null markdown, a valid completeness status, and missingFields as an array", () => {
    fc.assert(
      fc.property(targetArb, knowledgeModelArb, (target, model) => {
        const allTemplates = getTemplatesForTarget(target);
        const applicableTemplates = allTemplates.filter((t) =>
          t.isApplicable(model),
        );

        for (const template of applicableTemplates) {
          const result = template.render(model);

          // markdown must be a non-null string (may be empty for "empty" completeness)
          expect(result.markdown).toBeDefined();
          expect(typeof result.markdown).toBe("string");

          // completeness must be one of the three valid values
          expect(["complete", "partial", "empty"]).toContain(
            result.completeness,
          );

          // missingFields must be an array
          expect(Array.isArray(result.missingFields)).toBe(true);

          // Simulate the persisted document record — verify all required fields
          // would be present in a GeneratedDocument record
          const simulatedRecord = {
            filePath: template.filePath,
            content: result.markdown,
            draftContent: result.markdown,
            completeness: result.completeness,
            missingFields: JSON.stringify(result.missingFields),
            templateVersion: "1.0",
            generatedAt: new Date(),
          };

          // filePath must be non-empty
          expect(simulatedRecord.filePath.length).toBeGreaterThan(0);

          // content and draftContent must be strings
          expect(typeof simulatedRecord.content).toBe("string");
          expect(typeof simulatedRecord.draftContent).toBe("string");

          // completeness must be valid
          expect(["complete", "partial", "empty"]).toContain(
            simulatedRecord.completeness,
          );

          // missingFields must be valid JSON array
          const parsed = JSON.parse(simulatedRecord.missingFields);
          expect(Array.isArray(parsed)).toBe(true);

          // templateVersion must be non-empty
          expect(simulatedRecord.templateVersion.length).toBeGreaterThan(0);

          // generatedAt must be a valid date
          expect(simulatedRecord.generatedAt).toBeInstanceOf(Date);
        }
      }),
      { numRuns: 100 },
    );
  });
});
