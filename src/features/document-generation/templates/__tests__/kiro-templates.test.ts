import { describe, it, expect } from "vitest";
import { emptyKnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { renderProductMd } from "@/features/document-generation/templates/kiro/product.template";
import { renderTechMd } from "@/features/document-generation/templates/kiro/tech.template";
import { renderStructureMd } from "@/features/document-generation/templates/kiro/structure.template";
import { renderTestingMd } from "@/features/document-generation/templates/kiro/testing.template";
import { renderSecurityMd } from "@/features/document-generation/templates/kiro/security.template";
import { renderWorkflowsMd } from "@/features/document-generation/templates/kiro/workflows.template";

function fullProductModel() {
  const model = emptyKnowledgeModel();
  model.productName = "Steering Studio";
  model.productPurpose = "Help teams create context packs";
  model.targetUsers = "Engineering leads and architects";
  model.primaryUseCases = "Generate steering documents";
  return model;
}

function fullTechModel() {
  const model = emptyKnowledgeModel();
  model.programmingLanguages = "TypeScript";
  model.frameworks = "Next.js, React";
  model.database = "SQLite via Prisma";
  model.architecturePattern = "Feature-module monolith";
  return model;
}

function fullStructureModel() {
  const model = emptyKnowledgeModel();
  model.folderStructure = "src/features, src/lib, src/app";
  model.namingConventions = "kebab-case files, PascalCase components";
  model.moduleOrganization = "Feature-first with shared lib";
  return model;
}

describe("renderProductMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderProductMd(fullProductModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderProductMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(4);
  });

  it("returns partial when some required fields are missing", () => {
    const model = emptyKnowledgeModel();
    model.productName = "My App";
    model.productPurpose = "Do things";
    const result = renderProductMd(model);
    expect(result.completeness).toBe("partial");
    expect(result.missingFields).toContain("targetUsers");
    expect(result.missingFields).toContain("primaryUseCases");
  });

  it("preserves user terminology verbatim in markdown", () => {
    const model = fullProductModel();
    model.productName = "Zephyr-X Orchestrator";
    const result = renderProductMd(model);
    expect(result.markdown).toContain("Zephyr-X Orchestrator");
  });

  it("includes optional sections when populated", () => {
    const model = fullProductModel();
    model.nonGoals = "No real-time collaboration";
    model.successMetrics = "80% completion rate";
    const result = renderProductMd(model);
    expect(result.markdown).toContain("## Non-Goals");
    expect(result.markdown).toContain("No real-time collaboration");
    expect(result.markdown).toContain("## Success Metrics");
    expect(result.markdown).toContain("80% completion rate");
  });

  it("omits optional sections when empty", () => {
    const result = renderProductMd(fullProductModel());
    expect(result.markdown).not.toContain("## Problem Statement");
    expect(result.markdown).not.toContain("## Non-Goals");
    expect(result.markdown).not.toContain("## Future Considerations");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderProductMd(fullProductModel());
    expect(result.markdown.startsWith("# Product Overview\n")).toBe(true);
  });

  it("does not contain placeholder text", () => {
    const model = fullProductModel();
    model.problemStatement = "   ";
    const result = renderProductMd(model);
    expect(result.markdown).not.toMatch(/\[TODO\]|\[PLACEHOLDER\]|TBD|N\/A/i);
  });
});

describe("renderTechMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderTechMd(fullTechModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderTechMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(4);
  });

  it("preserves user terminology verbatim", () => {
    const model = fullTechModel();
    model.frameworks = "SvelteKit with adapter-node";
    const result = renderTechMd(model);
    expect(result.markdown).toContain("SvelteKit with adapter-node");
  });

  it("includes optional sections when populated", () => {
    const model = fullTechModel();
    model.hostingDeployment = "AWS ECS Fargate";
    model.codingStandards = "ESLint strict, Prettier";
    const result = renderTechMd(model);
    expect(result.markdown).toContain("## Hosting and Deployment");
    expect(result.markdown).toContain("AWS ECS Fargate");
    expect(result.markdown).toContain("## Coding Standards");
    expect(result.markdown).toContain("ESLint strict, Prettier");
  });

  it("omits optional sections when empty", () => {
    const result = renderTechMd(fullTechModel());
    expect(result.markdown).not.toContain("## Hosting and Deployment");
    expect(result.markdown).not.toContain("## Coding Standards");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderTechMd(fullTechModel());
    expect(result.markdown.startsWith("# Technology Stack\n")).toBe(true);
  });
});

describe("renderStructureMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderStructureMd(fullStructureModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderStructureMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(3);
  });

  it("preserves user terminology verbatim", () => {
    const model = fullStructureModel();
    model.namingConventions = "snake_case for Python modules";
    const result = renderStructureMd(model);
    expect(result.markdown).toContain("snake_case for Python modules");
  });

  it("includes coding standards when populated", () => {
    const model = fullStructureModel();
    model.codingStandards = "Follow Airbnb style guide";
    const result = renderStructureMd(model);
    expect(result.markdown).toContain("## Coding Standards");
    expect(result.markdown).toContain("Follow Airbnb style guide");
  });

  it("omits coding standards when empty", () => {
    const result = renderStructureMd(fullStructureModel());
    expect(result.markdown).not.toContain("## Coding Standards");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderStructureMd(fullStructureModel());
    expect(result.markdown.startsWith("# Project Structure\n")).toBe(true);
  });
});

function fullTestingModel() {
  const model = emptyKnowledgeModel();
  model.testingFramework = "Vitest with fast-check";
  model.testTypes = "Unit, integration, e2e, property-based";
  return model;
}

function fullSecurityModel() {
  const model = emptyKnowledgeModel();
  model.authenticationMethod = "OAuth 2.0 with PKCE";
  model.authorizationModel = "RBAC with resource-level permissions";
  model.dataSensitivity = "PII and financial data require encryption at rest";
  return model;
}

function fullWorkflowsModel() {
  const model = emptyKnowledgeModel();
  model.branchingStrategy = "GitHub Flow with feature branches";
  model.sourceControlPlatform = "GitHub";
  model.ciCdApproach = "GitHub Actions with staging and production environments";
  return model;
}

describe("renderTestingMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderTestingMd(fullTestingModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderTestingMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(2);
  });

  it("returns partial when some required fields are missing", () => {
    const model = emptyKnowledgeModel();
    model.testingFramework = "Jest";
    const result = renderTestingMd(model);
    expect(result.completeness).toBe("partial");
    expect(result.missingFields).toContain("testTypes");
  });

  it("preserves user terminology verbatim", () => {
    const model = fullTestingModel();
    model.testingFramework = "Cypress with component testing";
    const result = renderTestingMd(model);
    expect(result.markdown).toContain("Cypress with component testing");
  });

  it("includes optional sections when populated", () => {
    const model = fullTestingModel();
    model.coverageExpectations = "80% line coverage minimum";
    model.qualityGates = "All tests must pass before merge";
    const result = renderTestingMd(model);
    expect(result.markdown).toContain("## Coverage Expectations");
    expect(result.markdown).toContain("80% line coverage minimum");
    expect(result.markdown).toContain("## Quality Gates");
    expect(result.markdown).toContain("All tests must pass before merge");
  });

  it("omits optional sections when empty", () => {
    const result = renderTestingMd(fullTestingModel());
    expect(result.markdown).not.toContain("## Coverage Expectations");
    expect(result.markdown).not.toContain("## Quality Gates");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderTestingMd(fullTestingModel());
    expect(result.markdown.startsWith("# Testing and Quality\n")).toBe(true);
  });

  it("does not contain placeholder text", () => {
    const result = renderTestingMd(fullTestingModel());
    expect(result.markdown).not.toMatch(/\[TODO\]|\[PLACEHOLDER\]|TBD|N\/A/i);
  });
});

describe("renderSecurityMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderSecurityMd(fullSecurityModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderSecurityMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(3);
  });

  it("returns partial when some required fields are missing", () => {
    const model = emptyKnowledgeModel();
    model.authenticationMethod = "JWT tokens";
    const result = renderSecurityMd(model);
    expect(result.completeness).toBe("partial");
    expect(result.missingFields).toContain("authorizationModel");
    expect(result.missingFields).toContain("dataSensitivity");
  });

  it("preserves user terminology verbatim", () => {
    const model = fullSecurityModel();
    model.authenticationMethod = "SAML 2.0 with Azure AD";
    const result = renderSecurityMd(model);
    expect(result.markdown).toContain("SAML 2.0 with Azure AD");
  });

  it("includes optional sections when populated", () => {
    const model = fullSecurityModel();
    model.complianceRequirements = "SOC 2 Type II, GDPR";
    const result = renderSecurityMd(model);
    expect(result.markdown).toContain("## Compliance Requirements");
    expect(result.markdown).toContain("SOC 2 Type II, GDPR");
  });

  it("omits optional sections when empty", () => {
    const result = renderSecurityMd(fullSecurityModel());
    expect(result.markdown).not.toContain("## Compliance Requirements");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderSecurityMd(fullSecurityModel());
    expect(result.markdown.startsWith("# Security and Compliance\n")).toBe(true);
  });

  it("does not contain placeholder text", () => {
    const result = renderSecurityMd(fullSecurityModel());
    expect(result.markdown).not.toMatch(/\[TODO\]|\[PLACEHOLDER\]|TBD|N\/A/i);
  });
});

describe("renderWorkflowsMd", () => {
  it("returns complete when all required fields are present", () => {
    const result = renderWorkflowsMd(fullWorkflowsModel());
    expect(result.completeness).toBe("complete");
    expect(result.missingFields).toEqual([]);
  });

  it("returns empty when no fields are populated", () => {
    const result = renderWorkflowsMd(emptyKnowledgeModel());
    expect(result.completeness).toBe("empty");
    expect(result.missingFields).toHaveLength(3);
  });

  it("returns partial when some required fields are missing", () => {
    const model = emptyKnowledgeModel();
    model.branchingStrategy = "Trunk-based development";
    const result = renderWorkflowsMd(model);
    expect(result.completeness).toBe("partial");
    expect(result.missingFields).toContain("sourceControlPlatform");
    expect(result.missingFields).toContain("ciCdApproach");
  });

  it("preserves user terminology verbatim", () => {
    const model = fullWorkflowsModel();
    model.branchingStrategy = "GitFlow with release branches";
    const result = renderWorkflowsMd(model);
    expect(result.markdown).toContain("GitFlow with release branches");
  });

  it("includes optional sections when populated", () => {
    const model = fullWorkflowsModel();
    model.codeReviewProcess = "Two approvals required, CODEOWNERS enforced";
    model.deploymentWorkflow = "Blue-green deployment via ArgoCD";
    const result = renderWorkflowsMd(model);
    expect(result.markdown).toContain("## Code Review Process");
    expect(result.markdown).toContain("Two approvals required, CODEOWNERS enforced");
    expect(result.markdown).toContain("## Deployment Workflow");
    expect(result.markdown).toContain("Blue-green deployment via ArgoCD");
  });

  it("omits optional sections when empty", () => {
    const result = renderWorkflowsMd(fullWorkflowsModel());
    expect(result.markdown).not.toContain("## Code Review Process");
    expect(result.markdown).not.toContain("## Deployment Workflow");
  });

  it("starts with the correct top-level heading", () => {
    const result = renderWorkflowsMd(fullWorkflowsModel());
    expect(result.markdown.startsWith("# Workflows and Team Practices\n")).toBe(true);
  });

  it("does not contain placeholder text", () => {
    const result = renderWorkflowsMd(fullWorkflowsModel());
    expect(result.markdown).not.toMatch(/\[TODO\]|\[PLACEHOLDER\]|TBD|N\/A/i);
  });
});
