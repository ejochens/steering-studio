import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  emptyKnowledgeModel,
  type KnowledgeModel,
} from "@/features/document-generation/lib/assemble-knowledge-model";
import { renderProductMd } from "@/features/document-generation/templates/kiro/product.template";
import { renderTechMd } from "@/features/document-generation/templates/kiro/tech.template";
import { renderStructureMd } from "@/features/document-generation/templates/kiro/structure.template";
import { renderTestingMd } from "@/features/document-generation/templates/kiro/testing.template";
import { renderSecurityMd } from "@/features/document-generation/templates/kiro/security.template";
import { renderWorkflowsMd } from "@/features/document-generation/templates/kiro/workflows.template";
import { renderCopilotInstructionsMd } from "@/features/document-generation/templates/copilot/copilot-instructions.template";
import { renderAgentsMd } from "@/features/document-generation/templates/shared/agents.template";
import type { TemplateResult } from "@/features/document-generation/templates/types";

// **Validates: Requirements 1.2, 1.3, 1.4**

// ── Generators ───────────────────────────────────────────────────────

/** Arbitrary that produces either an empty string or a non-empty string */
const optionalStringArb = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 1, maxLength: 100 }),
);

/**
 * Non-empty string arbitrary for required fields.
 * Must contain at least one non-whitespace character because templates
 * and completeness calculation use .trim() to determine presence.
 */
const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/** Build a fully random KnowledgeModel */
function randomModelArb(): fc.Arbitrary<KnowledgeModel> {
  const fields = Object.keys(emptyKnowledgeModel()) as (keyof KnowledgeModel)[];
  return fc
    .tuple(...fields.map(() => optionalStringArb))
    .map((values) => {
      const model = emptyKnowledgeModel();
      fields.forEach((field, i) => {
        model[field] = values[i];
      });
      return model;
    });
}

/** Build a KnowledgeModel where specific required fields are always non-empty */
function modelWithRequiredFieldsArb(
  requiredFields: (keyof KnowledgeModel)[],
): fc.Arbitrary<KnowledgeModel> {
  const allFields = Object.keys(emptyKnowledgeModel()) as (keyof KnowledgeModel)[];
  const requiredSet = new Set<string>(requiredFields);
  return fc
    .tuple(
      ...allFields.map((field) =>
        requiredSet.has(field) ? nonEmptyStringArb : optionalStringArb,
      ),
    )
    .map((values) => {
      const model = emptyKnowledgeModel();
      allFields.forEach((field, i) => {
        model[field] = values[i];
      });
      return model;
    });
}

// ── Template definitions ─────────────────────────────────────────────

interface TemplateSpec {
  name: string;
  render: (model: KnowledgeModel) => TemplateResult;
  requiredFields: (keyof KnowledgeModel)[];
}

const TEMPLATES: TemplateSpec[] = [
  {
    name: "product",
    render: renderProductMd,
    requiredFields: ["productName", "productPurpose", "targetUsers", "primaryUseCases"],
  },
  {
    name: "tech",
    render: renderTechMd,
    requiredFields: ["programmingLanguages", "frameworks", "database", "architecturePattern"],
  },
  {
    name: "structure",
    render: renderStructureMd,
    requiredFields: ["folderStructure", "namingConventions", "moduleOrganization"],
  },
  {
    name: "testing",
    render: renderTestingMd,
    requiredFields: ["testingFramework", "testTypes"],
  },
  {
    name: "security",
    render: renderSecurityMd,
    requiredFields: ["authenticationMethod", "authorizationModel", "dataSensitivity"],
  },
  {
    name: "workflows",
    render: renderWorkflowsMd,
    requiredFields: ["branchingStrategy", "sourceControlPlatform", "ciCdApproach"],
  },
  {
    name: "copilot-instructions",
    render: renderCopilotInstructionsMd,
    requiredFields: ["productName", "productPurpose", "programmingLanguages", "frameworks"],
  },
  {
    name: "agents",
    render: renderAgentsMd,
    requiredFields: ["productName", "productPurpose"],
  },
];

const PLACEHOLDER_REGEX = /\[TODO\]|\[PLACEHOLDER\]|\bTBD\b|\bN\/A\b/i;

// ── Property 2: Deterministic template rendering produces valid markdown ──

// Feature: document-generation, Property 2: Deterministic template rendering produces valid markdown
describe("Property 2: Deterministic template rendering produces valid markdown", () => {
  for (const tmpl of TEMPLATES) {
    it(`${tmpl.name}: returns non-empty markdown, completeness=complete, missingFields=[] when all required fields are non-empty`, () => {
      fc.assert(
        fc.property(
          modelWithRequiredFieldsArb(tmpl.requiredFields),
          (model) => {
            const result = tmpl.render(model);
            expect(result.markdown.length).toBeGreaterThan(0);
            expect(result.completeness).toBe("complete");
            expect(result.missingFields).toEqual([]);
          },
        ),
        { numRuns: 100 },
      );
    });
  }
});

// ── Property 3: Missing optional fields are omitted, never placeholders ──

// Feature: document-generation, Property 3: Missing optional fields are omitted, never placeholders
describe("Property 3: Missing optional fields are omitted, never placeholders", () => {
  for (const tmpl of TEMPLATES) {
    it(`${tmpl.name}: rendered markdown never contains placeholder patterns`, () => {
      fc.assert(
        fc.property(randomModelArb(), (model) => {
          const result = tmpl.render(model);
          expect(result.markdown).not.toMatch(PLACEHOLDER_REGEX);
        }),
        { numRuns: 100 },
      );
    });
  }
});

// ── Property 4: User terminology is preserved verbatim ──

// Feature: document-generation, Property 4: User terminology is preserved verbatim
describe("Property 4: User terminology is preserved verbatim", () => {
  for (const tmpl of TEMPLATES) {
    it(`${tmpl.name}: each non-empty required field value appears verbatim in the rendered markdown`, () => {
      fc.assert(
        fc.property(
          modelWithRequiredFieldsArb(tmpl.requiredFields),
          (model) => {
            const result = tmpl.render(model);
            for (const field of tmpl.requiredFields) {
              const value = model[field];
              if (value.trim()) {
                expect(result.markdown).toContain(value);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  }
});
