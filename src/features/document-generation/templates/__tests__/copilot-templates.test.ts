import { describe, it, expect } from "vitest";
import { emptyKnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { renderCopilotInstructionsMd } from "@/features/document-generation/templates/copilot/copilot-instructions.template";
import { renderAgentsMd } from "@/features/document-generation/templates/shared/agents.template";

function fullCopilotModel() {
  const model = emptyKnowledgeModel();
  model.productName = "Steering Studio";
  model.productPurpose = "Help teams create context packs";
  model.programmingLanguages = "TypeScript";
  model.frameworks = "Next.js, React";
  return model;
}

function fullAgentsModel() {
  const model = emptyKnowledgeModel();
  model.productName = "Steering Studio";
  model.productPurpose = "Help teams create context packs";
  return model;
}

describe("renderCopilotInstructionsMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderCopilotInstructionsMd(fullCopilotModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderCopilotInstructionsMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(4);
  });

  it("returns partial when some required fields are missing", () => {
    const model = emptyKnowledgeModel();
    model.productName = "My App";
    model.productPurpose = "Do things";
    const result = renderCopilotInstructionsMd(model);
    expect(result.completeness).toBe("partial");
    expect(result.missingFields).toContain("programmingLanguages");
    expect(result.missingFields).toContain("frameworks");
  });

  it("preserves user terminology verbatim in markdown", () => {
    const model = fullCopilotModel();
    model.productName = "Zephyr-X Orchestrator";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("Zephyr-X Orchestrator");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderCopilotInstructionsMd(fullCopilotModel());
    expect(result.markdown.startsWith("# Copilot Instructions\n")).toBe(true);
  });

  it("renders project section with name and purpose", () => {
    const result = renderCopilotInstructionsMd(fullCopilotModel());
    expect(result.markdown).toContain("## Project");
    expect(result.markdown).toContain(
      "Steering Studio — Help teams create context packs",
    );
  });

  it("renders tech stack with languages and frameworks", () => {
    const result = renderCopilotInstructionsMd(fullCopilotModel());
    expect(result.markdown).toContain("## Tech Stack");
    expect(result.markdown).toContain("- Languages: TypeScript");
    expect(result.markdown).toContain("- Frameworks: Next.js, React");
  });

  it("includes architecture section when populated", () => {
    const model = fullCopilotModel();
    model.architecturePattern = "Microservices with event bus";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("## Architecture");
    expect(result.markdown).toContain("Microservices with event bus");
  });

  it("includes database section when populated", () => {
    const model = fullCopilotModel();
    model.database = "PostgreSQL with Prisma ORM";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("## Database");
    expect(result.markdown).toContain("PostgreSQL with Prisma ORM");
  });

  it("includes testing section when testingFramework is populated", () => {
    const model = fullCopilotModel();
    model.testingFramework = "Vitest";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("## Testing");
    expect(result.markdown).toContain("Vitest");
  });

  it("combines testingFramework and testTypes with separator", () => {
    const model = fullCopilotModel();
    model.testingFramework = "Vitest";
    model.testTypes = "Unit, integration, e2e";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain(
      "Vitest / Unit, integration, e2e",
    );
  });

  it("includes coding standards section when populated", () => {
    const model = fullCopilotModel();
    model.codingStandards = "ESLint strict, Prettier";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("## Coding Standards");
    expect(result.markdown).toContain("ESLint strict, Prettier");
  });

  it("includes workflow section when branchingStrategy is populated", () => {
    const model = fullCopilotModel();
    model.branchingStrategy = "GitHub Flow";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("## Workflow");
    expect(result.markdown).toContain("GitHub Flow");
  });

  it("combines branchingStrategy and ciCdApproach with separator", () => {
    const model = fullCopilotModel();
    model.branchingStrategy = "GitHub Flow";
    model.ciCdApproach = "GitHub Actions";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("GitHub Flow / GitHub Actions");
  });

  it("includes non-goals section when populated", () => {
    const model = fullCopilotModel();
    model.nonGoals = "No real-time collaboration";
    const result = renderCopilotInstructionsMd(model);
    expect(result.markdown).toContain("## Non-Goals");
    expect(result.markdown).toContain("No real-time collaboration");
  });

  it("omits optional sections when empty", () => {
    const result = renderCopilotInstructionsMd(fullCopilotModel());
    expect(result.markdown).not.toContain("## Architecture");
    expect(result.markdown).not.toContain("## Database");
    expect(result.markdown).not.toContain("## Testing");
    expect(result.markdown).not.toContain("## Coding Standards");
    expect(result.markdown).not.toContain("## Workflow");
    expect(result.markdown).not.toContain("## Non-Goals");
  });

  it("does not contain placeholder text", () => {
    const result = renderCopilotInstructionsMd(fullCopilotModel());
    expect(result.markdown).not.toMatch(/\[TODO\]|\[PLACEHOLDER\]|TBD|N\/A/i);
  });
});

describe("renderAgentsMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderAgentsMd(fullAgentsModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderAgentsMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(2);
  });

  it("returns partial when some required fields are missing", () => {
    const model = emptyKnowledgeModel();
    model.productName = "My App";
    const result = renderAgentsMd(model);
    expect(result.completeness).toBe("partial");
    expect(result.missingFields).toContain("productPurpose");
  });

  it("preserves user terminology verbatim in markdown", () => {
    const model = fullAgentsModel();
    model.productName = "Zephyr-X Orchestrator";
    const result = renderAgentsMd(model);
    expect(result.markdown).toContain("Zephyr-X Orchestrator");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderAgentsMd(fullAgentsModel());
    expect(result.markdown.startsWith("# AGENTS.md\n")).toBe(true);
  });

  it("renders project section with name and purpose", () => {
    const result = renderAgentsMd(fullAgentsModel());
    expect(result.markdown).toContain("## Project");
    expect(result.markdown).toContain(
      "Steering Studio — Help teams create context packs",
    );
  });

  it("includes tech stack when languages and frameworks are populated", () => {
    const model = fullAgentsModel();
    model.programmingLanguages = "TypeScript";
    model.frameworks = "Next.js, React";
    const result = renderAgentsMd(model);
    expect(result.markdown).toContain("## Tech Stack");
    expect(result.markdown).toContain("TypeScript, Next.js, React");
  });

  it("includes architecture section when populated", () => {
    const model = fullAgentsModel();
    model.architecturePattern = "Feature-module monolith";
    const result = renderAgentsMd(model);
    expect(result.markdown).toContain("## Architecture");
    expect(result.markdown).toContain("Feature-module monolith");
  });

  it("includes testing section when populated", () => {
    const model = fullAgentsModel();
    model.testingFramework = "Vitest with fast-check";
    const result = renderAgentsMd(model);
    expect(result.markdown).toContain("## Testing");
    expect(result.markdown).toContain("Vitest with fast-check");
  });

  it("includes coding standards section when populated", () => {
    const model = fullAgentsModel();
    model.codingStandards = "ESLint strict, Prettier";
    const result = renderAgentsMd(model);
    expect(result.markdown).toContain("## Coding Standards");
    expect(result.markdown).toContain("ESLint strict, Prettier");
  });

  it("includes non-goals section when populated", () => {
    const model = fullAgentsModel();
    model.nonGoals = "No real-time collaboration";
    const result = renderAgentsMd(model);
    expect(result.markdown).toContain("## Non-Goals");
    expect(result.markdown).toContain("No real-time collaboration");
  });

  it("omits optional sections when empty", () => {
    const result = renderAgentsMd(fullAgentsModel());
    expect(result.markdown).not.toContain("## Tech Stack");
    expect(result.markdown).not.toContain("## Architecture");
    expect(result.markdown).not.toContain("## Testing");
    expect(result.markdown).not.toContain("## Coding Standards");
    expect(result.markdown).not.toContain("## Non-Goals");
  });

  it("does not contain placeholder text", () => {
    const result = renderAgentsMd(fullAgentsModel());
    expect(result.markdown).not.toMatch(/\[TODO\]|\[PLACEHOLDER\]|TBD|N\/A/i);
  });
});
