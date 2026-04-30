import { describe, it, expect } from "vitest";
import {
  getTemplatesForTarget,
  type TemplateDefinition,
} from "@/features/document-generation/lib/template-registry";
import { emptyKnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";

function templateIds(templates: TemplateDefinition[]): string[] {
  return templates.map((t) => t.templateId);
}

describe("getTemplatesForTarget", () => {
  it('returns 7 kiro templates for "Kiro"', () => {
    const templates = getTemplatesForTarget("Kiro");
    expect(templates).toHaveLength(7);
    expect(templates.every((t) => t.target === "kiro")).toBe(true);
  });

  it('returns 2 copilot templates for "Copilot"', () => {
    const templates = getTemplatesForTarget("Copilot");
    expect(templates).toHaveLength(2);
    expect(templates.every((t) => t.target === "copilot")).toBe(true);
  });

  it('"Both" returns the union of Kiro and Copilot', () => {
    const kiro = getTemplatesForTarget("Kiro");
    const copilot = getTemplatesForTarget("Copilot");
    const both = getTemplatesForTarget("Both");

    expect(both).toHaveLength(kiro.length + copilot.length);

    const bothIds = templateIds(both);
    for (const t of kiro) {
      expect(bothIds).toContain(t.templateId);
    }
    for (const t of copilot) {
      expect(bothIds).toContain(t.templateId);
    }
  });

  it("required kiro templates are always applicable", () => {
    const templates = getTemplatesForTarget("Kiro").filter((t) => t.required);
    const model = emptyKnowledgeModel();
    for (const t of templates) {
      expect(t.isApplicable(model)).toBe(true);
    }
  });

  it("required copilot template is always applicable", () => {
    const templates = getTemplatesForTarget("Copilot").filter((t) => t.required);
    const model = emptyKnowledgeModel();
    expect(templates).toHaveLength(1);
    expect(templates[0].isApplicable(model)).toBe(true);
  });

  it("optional kiro templates are not applicable with empty model", () => {
    const templates = getTemplatesForTarget("Kiro").filter((t) => !t.required);
    const model = emptyKnowledgeModel();
    for (const t of templates) {
      expect(t.isApplicable(model)).toBe(false);
    }
  });

  it("kiro-testing is applicable when testingFramework is set", () => {
    const model = { ...emptyKnowledgeModel(), testingFramework: "Vitest" };
    const testing = getTemplatesForTarget("Kiro").find(
      (t) => t.templateId === "kiro-testing",
    )!;
    expect(testing.isApplicable(model)).toBe(true);
  });

  it("kiro-security is applicable when authenticationMethod is set", () => {
    const model = { ...emptyKnowledgeModel(), authenticationMethod: "OAuth2" };
    const security = getTemplatesForTarget("Kiro").find(
      (t) => t.templateId === "kiro-security",
    )!;
    expect(security.isApplicable(model)).toBe(true);
  });

  it("kiro-workflows is applicable when branchingStrategy is set", () => {
    const model = { ...emptyKnowledgeModel(), branchingStrategy: "trunk-based" };
    const workflows = getTemplatesForTarget("Kiro").find(
      (t) => t.templateId === "kiro-workflows",
    )!;
    expect(workflows.isApplicable(model)).toBe(true);
  });

  it("kiro-ai-boundaries is applicable when developmentOs is set", () => {
    const model = { ...emptyKnowledgeModel(), developmentOs: "Windows" };
    const boundaries = getTemplatesForTarget("Kiro").find(
      (t) => t.templateId === "kiro-ai-boundaries",
    )!;
    expect(boundaries.isApplicable(model)).toBe(true);
  });

  it("kiro-ai-boundaries is applicable when allowedPromptData is set", () => {
    const model = { ...emptyKnowledgeModel(), allowedPromptData: '["Source code"]' };
    const boundaries = getTemplatesForTarget("Kiro").find(
      (t) => t.templateId === "kiro-ai-boundaries",
    )!;
    expect(boundaries.isApplicable(model)).toBe(true);
  });

  it("kiro-ai-boundaries is not applicable with empty model", () => {
    const model = emptyKnowledgeModel();
    const boundaries = getTemplatesForTarget("Kiro").find(
      (t) => t.templateId === "kiro-ai-boundaries",
    )!;
    expect(boundaries.isApplicable(model)).toBe(false);
  });

  it("shared-agents is applicable when productName is set", () => {
    const model = { ...emptyKnowledgeModel(), productName: "My App" };
    const agents = getTemplatesForTarget("Copilot").find(
      (t) => t.templateId === "shared-agents",
    )!;
    expect(agents.isApplicable(model)).toBe(true);
  });

  it("shared-agents is not applicable with empty model", () => {
    const model = emptyKnowledgeModel();
    const agents = getTemplatesForTarget("Copilot").find(
      (t) => t.templateId === "shared-agents",
    )!;
    expect(agents.isApplicable(model)).toBe(false);
  });

  it("each template has a unique templateId", () => {
    const all = getTemplatesForTarget("Both");
    const ids = all.map((t) => t.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template has a unique filePath", () => {
    const all = getTemplatesForTarget("Both");
    const paths = all.map((t) => t.filePath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("returns fresh arrays (not shared references)", () => {
    const a = getTemplatesForTarget("Kiro");
    const b = getTemplatesForTarget("Kiro");
    expect(a).not.toBe(b);
  });
});
