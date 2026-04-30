import type { KnowledgeModel } from "./assemble-knowledge-model";

// ── Secure defaults ──────────────────────────────────────────────────

export const SECURE_DEFAULTS = {
  prohibitedPromptData: ["Customer data", "Secrets and credentials", "Production logs"],
  externalModelCalls: "Only approved enterprise services",
  aiWorkspaceScope: "Current repo only",
  secretsInPrompts: "No",
  humanValidationAreas: ["Security logic", "Access control", "Infrastructure changes"],
  stopOnUnclearBoundaries: "Yes",
  verifyAiOutputBeforeCommit: "Yes",
  manualReviewInfraSecurity: "Yes",
} as const;

// ── ResolvedBoundaries interface ─────────────────────────────────────

export interface ResolvedBoundaries {
  allowedPromptData: string[];
  prohibitedPromptData: string[];
  sensitiveDataRedaction: string;
  allowedOperationalArtifacts: string[];
  environmentRestrictions: string;
  aiWorkspaceScope: string;
  prohibitedLocalAccess: string[];
  inspectGeneratedFiles: string;
  readLocalConfig: string;
  externalModelCalls: string;
  approvedAiProviders: string[];
  consumerAiToolsProhibited: string;
  unmanagedExtensionsProhibited: string;
  networkTenantRestrictions: string;
  secretsInPrompts: string;
  secretHandlingMechanism: string[];
  sensitiveCodeCategories: string[];
  aiGenerateSensitiveCode: string;
  developerProhibitedContent: string[];
  humanValidationAreas: string[];
  verifyAiOutputBeforeCommit: string;
  manualReviewInfraSecurity: string;
  approvalBeforeProceed: string[];
  approvalBeforeMerge: string[];
  approvalBeforeDeploy: string[];
  stopOnUnclearBoundaries: string;
  escalationContact: string;
  developmentOs: string;
  preferredShell: string;
  crossPlatformSupport: string;
  examplesDefaultToOs: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseJsonArray(value: string, fallback: string[]): string[] {
  if (!value.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

function resolveString(value: string, fallback: string): string {
  return value.trim() ? value : fallback;
}

function renderBulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n") + "\n";
}

function renderPolicyStatement(label: string, value: string): string {
  return `- ${label}: ${value}\n`;
}

// ── Resolve boundaries ───────────────────────────────────────────────

export function resolveBoundaries(model: KnowledgeModel): ResolvedBoundaries {
  const developmentOs = model.developmentOs.trim() ? model.developmentOs : "";

  // Conditional default: PowerShell when OS is Windows and shell is empty
  const preferredShellDefault =
    developmentOs === "Windows" ? "PowerShell" : "";

  return {
    allowedPromptData: parseJsonArray(model.allowedPromptData, []),
    prohibitedPromptData: parseJsonArray(
      model.prohibitedPromptData,
      [...SECURE_DEFAULTS.prohibitedPromptData],
    ),
    sensitiveDataRedaction: resolveString(model.sensitiveDataRedaction, ""),
    allowedOperationalArtifacts: parseJsonArray(model.allowedOperationalArtifacts, []),
    environmentRestrictions: resolveString(model.environmentRestrictions, ""),
    aiWorkspaceScope: resolveString(model.aiWorkspaceScope, SECURE_DEFAULTS.aiWorkspaceScope),
    prohibitedLocalAccess: parseJsonArray(model.prohibitedLocalAccess, []),
    inspectGeneratedFiles: resolveString(model.inspectGeneratedFiles, ""),
    readLocalConfig: resolveString(model.readLocalConfig, ""),
    externalModelCalls: resolveString(model.externalModelCalls, SECURE_DEFAULTS.externalModelCalls),
    approvedAiProviders: parseJsonArray(model.approvedAiProviders, []),
    consumerAiToolsProhibited: resolveString(model.consumerAiToolsProhibited, ""),
    unmanagedExtensionsProhibited: resolveString(model.unmanagedExtensionsProhibited, ""),
    networkTenantRestrictions: resolveString(model.networkTenantRestrictions, ""),
    secretsInPrompts: resolveString(model.secretsInPrompts, SECURE_DEFAULTS.secretsInPrompts),
    secretHandlingMechanism: parseJsonArray(model.secretHandlingMechanism, []),
    sensitiveCodeCategories: parseJsonArray(model.sensitiveCodeCategories, []),
    aiGenerateSensitiveCode: resolveString(model.aiGenerateSensitiveCode, ""),
    developerProhibitedContent: parseJsonArray(model.developerProhibitedContent, []),
    humanValidationAreas: parseJsonArray(
      model.humanValidationAreas,
      [...SECURE_DEFAULTS.humanValidationAreas],
    ),
    verifyAiOutputBeforeCommit: resolveString(
      model.verifyAiOutputBeforeCommit,
      SECURE_DEFAULTS.verifyAiOutputBeforeCommit,
    ),
    manualReviewInfraSecurity: resolveString(
      model.manualReviewInfraSecurity,
      SECURE_DEFAULTS.manualReviewInfraSecurity,
    ),
    approvalBeforeProceed: parseJsonArray(model.approvalBeforeProceed, []),
    approvalBeforeMerge: parseJsonArray(model.approvalBeforeMerge, []),
    approvalBeforeDeploy: parseJsonArray(model.approvalBeforeDeploy, []),
    stopOnUnclearBoundaries: resolveString(
      model.stopOnUnclearBoundaries,
      SECURE_DEFAULTS.stopOnUnclearBoundaries,
    ),
    escalationContact: resolveString(model.escalationContact, ""),
    developmentOs,
    preferredShell: resolveString(model.preferredShell, preferredShellDefault),
    crossPlatformSupport: resolveString(model.crossPlatformSupport, ""),
    examplesDefaultToOs: resolveString(model.examplesDefaultToOs, ""),
  };
}

// ── Shared boundaries markdown renderer ──────────────────────────────

export function renderBoundariesMarkdown(resolved: ResolvedBoundaries): string {
  let md = "# AI Usage, Data Handling, and Access Boundaries\n";

  // 1. Allowed Prompt Content
  md += "\n## Allowed Prompt Content\n\n";
  if (resolved.allowedPromptData.length > 0) {
    md += "The following data types are allowed in prompts:\n\n";
    md += renderBulletList(resolved.allowedPromptData);
  } else {
    md += "No specific allowed prompt data defined.\n";
  }

  // 2. Prohibited Prompt Content
  md += "\n## Prohibited Prompt Content\n\n";
  if (resolved.prohibitedPromptData.length > 0) {
    md += "The following data must not appear in prompts:\n\n";
    md += renderBulletList(resolved.prohibitedPromptData);
  }
  if (resolved.sensitiveDataRedaction === "Yes") {
    md += "\nSensitive data redaction is required. All sensitive data must be redacted before inclusion in any prompt.\n";
  }
  if (resolved.environmentRestrictions) {
    md += `\nEnvironment restriction: ${resolved.environmentRestrictions}.\n`;
  }
  if (resolved.allowedOperationalArtifacts.length > 0) {
    md += "\nThe following operational artifacts are allowed:\n\n";
    md += renderBulletList(resolved.allowedOperationalArtifacts);
  }

  // 3. Local Access Scope
  md += "\n## Local Access Scope\n\n";
  md += `AI workspace scope: ${resolved.aiWorkspaceScope}. Access outside this scope is prohibited.\n`;
  if (resolved.prohibitedLocalAccess.length > 0) {
    md += "\nThe following local paths are prohibited and must not be accessed:\n\n";
    md += renderBulletList(resolved.prohibitedLocalAccess);
  }
  if (resolved.inspectGeneratedFiles) {
    md += `\nInspecting generated files outside the repo: ${resolved.inspectGeneratedFiles}.\n`;
  }
  if (resolved.readLocalConfig) {
    md += `\nReading local config files: ${resolved.readLocalConfig}.\n`;
  }

  // 4. External AI/Model Usage Rules
  md += "\n## External AI/Model Usage Rules\n\n";
  md += `External model calls: ${resolved.externalModelCalls}.\n`;
  if (resolved.approvedAiProviders.length > 0) {
    md += "\nApproved AI providers (only these providers must be used):\n\n";
    md += renderBulletList(resolved.approvedAiProviders);
  }
  if (resolved.consumerAiToolsProhibited === "Yes") {
    md += "\nConsumer AI tools are prohibited and must not be used.\n";
  }
  if (resolved.unmanagedExtensionsProhibited === "Yes") {
    md += "\nUnmanaged IDE extensions or plugins are prohibited and must not be installed.\n";
  }
  if (resolved.networkTenantRestrictions) {
    md += `\nNetwork/tenant restrictions: ${resolved.networkTenantRestrictions}.\n`;
  }

  // 5. Secrets and Sensitive Code Handling
  md += "\n## Secrets and Sensitive Code Handling\n\n";
  md += `Secrets in prompts: ${resolved.secretsInPrompts}. Secrets must not be included in prompts unless explicitly permitted.\n`;
  if (resolved.secretHandlingMechanism.length > 0) {
    md += "\nPermitted secret-handling mechanisms (only these must be used):\n\n";
    md += renderBulletList(resolved.secretHandlingMechanism);
  }
  if (resolved.sensitiveCodeCategories.length > 0) {
    md += "\nThe following sensitive code categories require extra review and must not be modified without approval:\n\n";
    md += renderBulletList(resolved.sensitiveCodeCategories);
  }
  if (resolved.aiGenerateSensitiveCode) {
    md += `\nAI generating code in sensitive areas: ${resolved.aiGenerateSensitiveCode}.\n`;
  }

  // 6. Developer Usage Guardrails
  md += "\n## Developer Usage Guardrails\n\n";
  if (resolved.developerProhibitedContent.length > 0) {
    md += "The following content is prohibited from being shared with AI tools:\n\n";
    md += renderBulletList(resolved.developerProhibitedContent);
  }
  if (resolved.humanValidationAreas.length > 0) {
    md += "\nThe following areas require human validation and must not be accepted without review:\n\n";
    md += renderBulletList(resolved.humanValidationAreas);
  }
  md += `\nDevelopers must verify AI output before commit: ${resolved.verifyAiOutputBeforeCommit}.\n`;
  md += `AI-generated infrastructure or security changes must be manually reviewed: ${resolved.manualReviewInfraSecurity}.\n`;

  // 7. Human Approval and Escalation Rules
  md += "\n## Human Approval and Escalation Rules\n\n";
  if (resolved.approvalBeforeProceed.length > 0) {
    md += "Work requiring human approval before AI proceeds:\n\n";
    md += renderBulletList(resolved.approvalBeforeProceed);
  }
  if (resolved.approvalBeforeMerge.length > 0) {
    md += "\nWork requiring human review before merge:\n\n";
    md += renderBulletList(resolved.approvalBeforeMerge);
  }
  if (resolved.approvalBeforeDeploy.length > 0) {
    md += "\nWork requiring human review before deployment:\n\n";
    md += renderBulletList(resolved.approvalBeforeDeploy);
  }
  md += `\nAgent must stop when boundaries are unclear: ${resolved.stopOnUnclearBoundaries}.\n`;
  if (resolved.escalationContact) {
    md += `\nEscalation contact: ${resolved.escalationContact}. Requires approval from this role for boundary decisions.\n`;
  }

  // 8. Development Operating System and CLI Conventions
  md += "\n## Development Operating System and CLI Conventions\n\n";
  if (resolved.developmentOs) {
    md += `Development OS: ${resolved.developmentOs}.\n`;
  }

  // OS-aware CLI guidance
  if (resolved.developmentOs === "Windows") {
    md += "\nCLI examples must use PowerShell syntax. Commands must use semicolons (`;`) to chain commands instead of `&&`. Use PowerShell cmdlets (e.g. `Remove-Item`, `Copy-Item`) instead of Unix equivalents.\n";
  } else if (resolved.developmentOs === "Linux" || resolved.developmentOs === "macOS") {
    const shell = resolved.preferredShell || "Bash";
    md += `\nCLI examples must use ${shell} syntax. All scripts and commands must target ${shell} by default.\n`;
  } else if (resolved.developmentOs === "Mixed/Cross-platform") {
    md += "\nCLI examples must use cross-platform compatible commands or provide OS-specific variants. Avoid OS-specific syntax unless alternatives are documented.\n";
  }

  if (resolved.preferredShell) {
    md += `\nPreferred shell: ${resolved.preferredShell}.\n`;
  }
  if (resolved.crossPlatformSupport === "Yes") {
    md += "\nCross-platform support is required. All commands and scripts must be compatible across supported operating systems.\n";
  }
  if (resolved.examplesDefaultToOs === "Yes") {
    md += `\nAll code examples, scripts, and file path conventions must default to the ${resolved.developmentOs || "selected"} operating system.\n`;
  }

  return md;
}
