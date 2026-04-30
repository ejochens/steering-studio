import { prisma } from "@/lib/db/prisma";

// ── KnowledgeModel interface ─────────────────────────────────────────

export interface KnowledgeModel {
  productName: string;
  productPurpose: string;
  targetUsers: string;
  primaryUseCases: string;
  problemStatement: string;
  desiredOutcomes: string;
  successMetrics: string;
  keyValueProposition: string;
  inScopeFeatures: string;
  nonGoals: string;
  mvpBoundaries: string;
  futureConsiderations: string;
  programmingLanguages: string;
  frameworks: string;
  database: string;
  hostingDeployment: string;
  architecturePattern: string;
  folderStructure: string;
  namingConventions: string;
  moduleOrganization: string;
  codingStandards: string;
  testingFramework: string;
  testTypes: string;
  coverageExpectations: string;
  qualityGates: string;
  authenticationMethod: string;
  authorizationModel: string;
  dataSensitivity: string;
  complianceRequirements: string;
  branchingStrategy: string;
  sourceControlPlatform: string;
  ciCdApproach: string;
  codeReviewProcess: string;
  deploymentWorkflow: string;
  // AI Usage Boundaries fields
  allowedPromptData: string;
  prohibitedPromptData: string;
  sensitiveDataRedaction: string;
  allowedOperationalArtifacts: string;
  environmentRestrictions: string;
  aiWorkspaceScope: string;
  prohibitedLocalAccess: string;
  inspectGeneratedFiles: string;
  readLocalConfig: string;
  externalModelCalls: string;
  approvedAiProviders: string;
  consumerAiToolsProhibited: string;
  unmanagedExtensionsProhibited: string;
  networkTenantRestrictions: string;
  secretsInPrompts: string;
  secretHandlingMechanism: string;
  sensitiveCodeCategories: string;
  aiGenerateSensitiveCode: string;
  developerProhibitedContent: string;
  humanValidationAreas: string;
  verifyAiOutputBeforeCommit: string;
  manualReviewInfraSecurity: string;
  approvalBeforeProceed: string;
  approvalBeforeMerge: string;
  approvalBeforeDeploy: string;
  stopOnUnclearBoundaries: string;
  escalationContact: string;
  developmentOs: string;
  preferredShell: string;
  crossPlatformSupport: string;
  examplesDefaultToOs: string;
}

// ── Field mapping ────────────────────────────────────────────────────
// Maps (sectionKey, fieldKey) pairs to KnowledgeModel property names.
// Exported so it can be tested independently.

export const FIELD_MAPPING: ReadonlyArray<{
  sectionKey: string;
  fieldKey: string;
  property: keyof KnowledgeModel;
}> = [
  // Product and Users
  { sectionKey: "product-and-users", fieldKey: "product-name", property: "productName" },
  { sectionKey: "product-and-users", fieldKey: "product-purpose", property: "productPurpose" },
  { sectionKey: "product-and-users", fieldKey: "target-users", property: "targetUsers" },
  { sectionKey: "product-and-users", fieldKey: "primary-use-cases", property: "primaryUseCases" },
  // Problem and Outcomes
  { sectionKey: "problem-and-outcomes", fieldKey: "problem-statement", property: "problemStatement" },
  { sectionKey: "problem-and-outcomes", fieldKey: "desired-outcomes", property: "desiredOutcomes" },
  { sectionKey: "problem-and-outcomes", fieldKey: "success-metrics", property: "successMetrics" },
  { sectionKey: "problem-and-outcomes", fieldKey: "key-value-proposition", property: "keyValueProposition" },
  // Scope and Non-Goals
  { sectionKey: "scope-and-non-goals", fieldKey: "in-scope-features", property: "inScopeFeatures" },
  { sectionKey: "scope-and-non-goals", fieldKey: "non-goals", property: "nonGoals" },
  { sectionKey: "scope-and-non-goals", fieldKey: "mvp-boundaries", property: "mvpBoundaries" },
  { sectionKey: "scope-and-non-goals", fieldKey: "future-considerations", property: "futureConsiderations" },
  // Tech Stack and Architecture
  { sectionKey: "tech-stack-and-architecture", fieldKey: "programming-languages", property: "programmingLanguages" },
  { sectionKey: "tech-stack-and-architecture", fieldKey: "frameworks", property: "frameworks" },
  { sectionKey: "tech-stack-and-architecture", fieldKey: "database", property: "database" },
  { sectionKey: "tech-stack-and-architecture", fieldKey: "hosting-deployment", property: "hostingDeployment" },
  { sectionKey: "tech-stack-and-architecture", fieldKey: "architecture-pattern", property: "architecturePattern" },
  // Project Structure and Conventions
  { sectionKey: "project-structure-and-conventions", fieldKey: "folder-structure", property: "folderStructure" },
  { sectionKey: "project-structure-and-conventions", fieldKey: "naming-conventions", property: "namingConventions" },
  { sectionKey: "project-structure-and-conventions", fieldKey: "module-organization", property: "moduleOrganization" },
  { sectionKey: "project-structure-and-conventions", fieldKey: "coding-standards", property: "codingStandards" },
  // Testing and Quality
  { sectionKey: "testing-and-quality", fieldKey: "testing-framework", property: "testingFramework" },
  { sectionKey: "testing-and-quality", fieldKey: "test-types", property: "testTypes" },
  { sectionKey: "testing-and-quality", fieldKey: "coverage-expectations", property: "coverageExpectations" },
  { sectionKey: "testing-and-quality", fieldKey: "quality-gates", property: "qualityGates" },
  // Security and Compliance
  { sectionKey: "security-and-compliance", fieldKey: "authentication-method", property: "authenticationMethod" },
  { sectionKey: "security-and-compliance", fieldKey: "authorization-model", property: "authorizationModel" },
  { sectionKey: "security-and-compliance", fieldKey: "data-sensitivity", property: "dataSensitivity" },
  { sectionKey: "security-and-compliance", fieldKey: "compliance-requirements", property: "complianceRequirements" },
  // Workflows and Team Practices
  { sectionKey: "workflows-and-team-practices", fieldKey: "branching-strategy", property: "branchingStrategy" },
  { sectionKey: "workflows-and-team-practices", fieldKey: "source-control-platform", property: "sourceControlPlatform" },
  { sectionKey: "workflows-and-team-practices", fieldKey: "ci-cd-approach", property: "ciCdApproach" },
  { sectionKey: "workflows-and-team-practices", fieldKey: "code-review-process", property: "codeReviewProcess" },
  { sectionKey: "workflows-and-team-practices", fieldKey: "deployment-workflow", property: "deploymentWorkflow" },
  // AI Usage, Data Handling, and Access Boundaries
  { sectionKey: "ai-usage-boundaries", fieldKey: "allowed-prompt-data", property: "allowedPromptData" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "prohibited-prompt-data", property: "prohibitedPromptData" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "sensitive-data-redaction", property: "sensitiveDataRedaction" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "allowed-operational-artifacts", property: "allowedOperationalArtifacts" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "environment-restrictions", property: "environmentRestrictions" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "ai-workspace-scope", property: "aiWorkspaceScope" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "prohibited-local-access", property: "prohibitedLocalAccess" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "inspect-generated-files", property: "inspectGeneratedFiles" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "read-local-config", property: "readLocalConfig" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "external-model-calls", property: "externalModelCalls" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "approved-ai-providers", property: "approvedAiProviders" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "consumer-ai-tools-prohibited", property: "consumerAiToolsProhibited" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "unmanaged-extensions-prohibited", property: "unmanagedExtensionsProhibited" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "network-tenant-restrictions", property: "networkTenantRestrictions" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "secrets-in-prompts", property: "secretsInPrompts" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "secret-handling-mechanism", property: "secretHandlingMechanism" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "sensitive-code-categories", property: "sensitiveCodeCategories" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "ai-generate-sensitive-code", property: "aiGenerateSensitiveCode" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "developer-prohibited-content", property: "developerProhibitedContent" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "human-validation-areas", property: "humanValidationAreas" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "verify-ai-output-before-commit", property: "verifyAiOutputBeforeCommit" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "manual-review-infra-security", property: "manualReviewInfraSecurity" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "approval-before-proceed", property: "approvalBeforeProceed" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "approval-before-merge", property: "approvalBeforeMerge" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "approval-before-deploy", property: "approvalBeforeDeploy" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "stop-on-unclear-boundaries", property: "stopOnUnclearBoundaries" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "escalation-contact", property: "escalationContact" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "development-os", property: "developmentOs" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "preferred-shell", property: "preferredShell" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "cross-platform-support", property: "crossPlatformSupport" },
  { sectionKey: "ai-usage-boundaries", fieldKey: "examples-default-to-os", property: "examplesDefaultToOs" },
];

// ── Helper: build lookup key ─────────────────────────────────────────

export function fieldLookupKey(sectionKey: string, fieldKey: string): string {
  return `${sectionKey}::${fieldKey}`;
}

// ── Empty knowledge model ────────────────────────────────────────────

export function emptyKnowledgeModel(): KnowledgeModel {
  return {
    productName: "",
    productPurpose: "",
    targetUsers: "",
    primaryUseCases: "",
    problemStatement: "",
    desiredOutcomes: "",
    successMetrics: "",
    keyValueProposition: "",
    inScopeFeatures: "",
    nonGoals: "",
    mvpBoundaries: "",
    futureConsiderations: "",
    programmingLanguages: "",
    frameworks: "",
    database: "",
    hostingDeployment: "",
    architecturePattern: "",
    folderStructure: "",
    namingConventions: "",
    moduleOrganization: "",
    codingStandards: "",
    testingFramework: "",
    testTypes: "",
    coverageExpectations: "",
    qualityGates: "",
    authenticationMethod: "",
    authorizationModel: "",
    dataSensitivity: "",
    complianceRequirements: "",
    branchingStrategy: "",
    sourceControlPlatform: "",
    ciCdApproach: "",
    codeReviewProcess: "",
    deploymentWorkflow: "",
    // AI Usage Boundaries fields
    allowedPromptData: "",
    prohibitedPromptData: "",
    sensitiveDataRedaction: "",
    allowedOperationalArtifacts: "",
    environmentRestrictions: "",
    aiWorkspaceScope: "",
    prohibitedLocalAccess: "",
    inspectGeneratedFiles: "",
    readLocalConfig: "",
    externalModelCalls: "",
    approvedAiProviders: "",
    consumerAiToolsProhibited: "",
    unmanagedExtensionsProhibited: "",
    networkTenantRestrictions: "",
    secretsInPrompts: "",
    secretHandlingMechanism: "",
    sensitiveCodeCategories: "",
    aiGenerateSensitiveCode: "",
    developerProhibitedContent: "",
    humanValidationAreas: "",
    verifyAiOutputBeforeCommit: "",
    manualReviewInfraSecurity: "",
    approvalBeforeProceed: "",
    approvalBeforeMerge: "",
    approvalBeforeDeploy: "",
    stopOnUnclearBoundaries: "",
    escalationContact: "",
    developmentOs: "",
    preferredShell: "",
    crossPlatformSupport: "",
    examplesDefaultToOs: "",
  };
}

// ── Build KnowledgeModel from a lookup map ───────────────────────────
// Pure function that maps answer values to KnowledgeModel properties.
// Exported for independent testing.

export function buildKnowledgeModelFromAnswers(
  answerLookup: Map<string, string>,
): KnowledgeModel {
  const model = emptyKnowledgeModel();

  for (const { sectionKey, fieldKey, property } of FIELD_MAPPING) {
    const key = fieldLookupKey(sectionKey, fieldKey);
    const value = answerLookup.get(key);
    if (value !== undefined) {
      model[property] = value;
    }
  }

  return model;
}

// ── Main: assemble from database ─────────────────────────────────────

export async function assembleKnowledgeModel(
  projectId: string,
): Promise<KnowledgeModel> {
  const sections = await prisma.intakeSection.findMany({
    where: { projectId },
    include: { answers: true },
  });

  const answerLookup = new Map<string, string>();

  for (const section of sections) {
    for (const answer of section.answers) {
      const key = fieldLookupKey(section.sectionKey, answer.fieldKey);
      answerLookup.set(key, answer.value);
    }
  }

  return buildKnowledgeModelFromAnswers(answerLookup);
}
