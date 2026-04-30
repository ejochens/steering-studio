// Feature: document-generation, Property 6: "Both" target is a superset of individual targets
// Feature: document-generation, Property 7: Optional template applicability
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getTemplatesForTarget } from "@/features/document-generation/lib/template-registry";
import {
  emptyKnowledgeModel,
  type KnowledgeModel,
} from "@/features/document-generation/lib/assemble-knowledge-model";

// **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

// ── Generator: random KnowledgeModel ─────────────────────────────────

const knowledgeModelArb: fc.Arbitrary<KnowledgeModel> = fc.record({
  productName: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  productPurpose: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  targetUsers: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  primaryUseCases: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  problemStatement: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  desiredOutcomes: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  successMetrics: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  keyValueProposition: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  inScopeFeatures: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  nonGoals: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  mvpBoundaries: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  futureConsiderations: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  programmingLanguages: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  frameworks: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  database: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  hostingDeployment: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  architecturePattern: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  folderStructure: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  namingConventions: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  moduleOrganization: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  codingStandards: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  testingFramework: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  testTypes: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  coverageExpectations: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  qualityGates: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  authenticationMethod: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  authorizationModel: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  dataSensitivity: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  complianceRequirements: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  branchingStrategy: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  sourceControlPlatform: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  ciCdApproach: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  codeReviewProcess: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
  deploymentWorkflow: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 100 })),
});

// ── Optional template definitions with their relevant fields ─────────

const optionalTemplateFields: Record<string, (keyof KnowledgeModel)[]> = {
  "kiro-testing": ["testingFramework", "testTypes"],
  "kiro-security": ["authenticationMethod", "authorizationModel", "dataSensitivity"],
  "kiro-workflows": ["branchingStrategy", "sourceControlPlatform", "ciCdApproach"],
  "shared-agents": ["productName", "productPurpose"],
};

// ── Property 6 ───────────────────────────────────────────────────────

describe("Property 6: 'Both' target is a superset of individual targets", () => {
  it("getTemplatesForTarget('Both') contains every Kiro and every Copilot template by filePath", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const kiroTemplates = getTemplatesForTarget("Kiro");
        const copilotTemplates = getTemplatesForTarget("Copilot");
        const bothTemplates = getTemplatesForTarget("Both");

        const bothPaths = new Set(bothTemplates.map((t) => t.filePath));

        // Every Kiro template filePath must appear in Both
        for (const t of kiroTemplates) {
          expect(bothPaths.has(t.filePath)).toBe(true);
        }

        // Every Copilot template filePath must appear in Both
        for (const t of copilotTemplates) {
          expect(bothPaths.has(t.filePath)).toBe(true);
        }

        // Both should have at least as many templates as the union
        expect(bothTemplates.length).toBeGreaterThanOrEqual(
          kiroTemplates.length + copilotTemplates.length,
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 7 ───────────────────────────────────────────────────────

describe("Property 7: Optional template applicability", () => {
  it("optional templates return false when all relevant fields are empty, true when at least one is non-empty", () => {
    fc.assert(
      fc.property(knowledgeModelArb, (model) => {
        const allTemplates = getTemplatesForTarget("Both");
        const optionalTemplates = allTemplates.filter((t) => !t.required);

        for (const template of optionalTemplates) {
          const relevantFields = optionalTemplateFields[template.templateId];
          if (!relevantFields) continue;

          const allEmpty = relevantFields.every(
            (field) => model[field].trim() === "",
          );
          const hasNonEmpty = relevantFields.some(
            (field) => model[field].trim() !== "",
          );

          if (allEmpty) {
            expect(template.isApplicable(model)).toBe(false);
          }

          if (hasNonEmpty) {
            expect(template.isApplicable(model)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
