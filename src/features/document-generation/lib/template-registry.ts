import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import type { TemplateResult } from "@/features/document-generation/templates/types";
import type { TargetOutput } from "@/lib/validation";

import { renderProductMd } from "@/features/document-generation/templates/kiro/product.template";
import { renderTechMd } from "@/features/document-generation/templates/kiro/tech.template";
import { renderStructureMd } from "@/features/document-generation/templates/kiro/structure.template";
import { renderTestingMd } from "@/features/document-generation/templates/kiro/testing.template";
import { renderSecurityMd } from "@/features/document-generation/templates/kiro/security.template";
import { renderWorkflowsMd } from "@/features/document-generation/templates/kiro/workflows.template";
import { renderCopilotInstructionsMd } from "@/features/document-generation/templates/copilot/copilot-instructions.template";
import { renderAgentsMd } from "@/features/document-generation/templates/shared/agents.template";
import { renderAiBoundariesMd } from "@/features/document-generation/templates/kiro/ai-boundaries.template";

// ── Types ────────────────────────────────────────────────────────────

export type TemplateFn = (model: KnowledgeModel) => TemplateResult;

export interface TemplateDefinition {
  templateId: string;
  filePath: string;
  target: "kiro" | "copilot";
  required: boolean;
  render: TemplateFn;
  isApplicable: (model: KnowledgeModel) => boolean;
}

// ── Template registrations ───────────────────────────────────────────

const alwaysApplicable = () => true;

const kiroTemplates: TemplateDefinition[] = [
  {
    templateId: "kiro-product",
    filePath: ".kiro/steering/product.md",
    target: "kiro",
    required: true,
    render: renderProductMd,
    isApplicable: alwaysApplicable,
  },
  {
    templateId: "kiro-tech",
    filePath: ".kiro/steering/tech.md",
    target: "kiro",
    required: true,
    render: renderTechMd,
    isApplicable: alwaysApplicable,
  },
  {
    templateId: "kiro-structure",
    filePath: ".kiro/steering/structure.md",
    target: "kiro",
    required: true,
    render: renderStructureMd,
    isApplicable: alwaysApplicable,
  },
  {
    templateId: "kiro-testing",
    filePath: ".kiro/steering/testing.md",
    target: "kiro",
    required: false,
    render: renderTestingMd,
    isApplicable: (model) =>
      model.testingFramework.trim() !== "" || model.testTypes.trim() !== "",
  },
  {
    templateId: "kiro-security",
    filePath: ".kiro/steering/security.md",
    target: "kiro",
    required: false,
    render: renderSecurityMd,
    isApplicable: (model) =>
      model.authenticationMethod.trim() !== "" ||
      model.authorizationModel.trim() !== "" ||
      model.dataSensitivity.trim() !== "",
  },
  {
    templateId: "kiro-workflows",
    filePath: ".kiro/steering/workflows.md",
    target: "kiro",
    required: false,
    render: renderWorkflowsMd,
    isApplicable: (model) =>
      model.branchingStrategy.trim() !== "" ||
      model.sourceControlPlatform.trim() !== "" ||
      model.ciCdApproach.trim() !== "",
  },
  {
    templateId: "kiro-ai-boundaries",
    filePath: ".kiro/steering/ai-boundaries.md",
    target: "kiro",
    required: false,
    render: renderAiBoundariesMd,
    isApplicable: (model) =>
      model.developmentOs.trim() !== "" ||
      model.allowedPromptData.trim() !== "" ||
      model.prohibitedPromptData.trim() !== "" ||
      model.aiWorkspaceScope.trim() !== "" ||
      model.externalModelCalls.trim() !== "",
  },
];

const copilotTemplates: TemplateDefinition[] = [
  {
    templateId: "copilot-instructions",
    filePath: ".github/copilot-instructions.md",
    target: "copilot",
    required: true,
    render: renderCopilotInstructionsMd,
    isApplicable: alwaysApplicable,
  },
  {
    templateId: "shared-agents",
    filePath: "AGENTS.md",
    target: "copilot",
    required: false,
    render: renderAgentsMd,
    isApplicable: (model) =>
      model.productName.trim() !== "" || model.productPurpose.trim() !== "",
  },
];

// ── Lookup ────────────────────────────────────────────────────────────

export function getTemplatesForTarget(
  target: TargetOutput,
): TemplateDefinition[] {
  switch (target) {
    case "Kiro":
      return [...kiroTemplates];
    case "Copilot":
      return [...copilotTemplates];
    case "Both":
      return [...kiroTemplates, ...copilotTemplates];
  }
}
