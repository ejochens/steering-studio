import { describe, it, expect } from "vitest";
import { INTAKE_SECTIONS } from "../sections";

// ── Helpers ──────────────────────────────────────────────────────────

const aiBoundariesSection = INTAKE_SECTIONS.find(
  (s) => s.sectionKey === "ai-usage-boundaries",
)!;

const securitySection = INTAKE_SECTIONS.find(
  (s) => s.sectionKey === "security-and-compliance",
)!;

const workflowsSection = INTAKE_SECTIONS.find(
  (s) => s.sectionKey === "workflows-and-team-practices",
)!;

function findField(fieldKey: string) {
  return aiBoundariesSection.fields.find((f) => f.fieldKey === fieldKey)!;
}

// ── Section-level checks (Req 1) ────────────────────────────────────

describe("AI Boundaries section registration", () => {
  it("has sectionKey 'ai-usage-boundaries'", () => {
    expect(aiBoundariesSection).toBeDefined();
    expect(aiBoundariesSection.sectionKey).toBe("ai-usage-boundaries");
  });

  it("has correct displayName (Req 1.2)", () => {
    expect(aiBoundariesSection.displayName).toBe(
      "AI Usage, Data Handling, and Access Boundaries",
    );
  });

  it("has sortOrder 7 (Req 1.3)", () => {
    expect(aiBoundariesSection.sortOrder).toBe(7);
  });

  it("has a non-empty description (Req 1.4)", () => {
    expect(aiBoundariesSection.description.trim().length).toBeGreaterThan(0);
  });

  it("contains exactly 31 fields", () => {
    expect(aiBoundariesSection.fields).toHaveLength(31);
  });
});

// ── Sort order checks (Req 1.3) ─────────────────────────────────────

describe("Sort order positioning", () => {
  it("appears after security-and-compliance (sortOrder 6)", () => {
    expect(securitySection.sortOrder).toBe(6);
    expect(aiBoundariesSection.sortOrder).toBe(7);
    expect(aiBoundariesSection.sortOrder).toBeGreaterThan(securitySection.sortOrder);
  });

  it("appears before workflows-and-team-practices (sortOrder 8)", () => {
    expect(workflowsSection.sortOrder).toBe(8);
    expect(aiBoundariesSection.sortOrder).toBeLessThan(workflowsSection.sortOrder);
  });

  it("sections are in correct array order", () => {
    const secIdx = INTAKE_SECTIONS.indexOf(securitySection);
    const aiIdx = INTAKE_SECTIONS.indexOf(aiBoundariesSection);
    const wfIdx = INTAKE_SECTIONS.indexOf(workflowsSection);
    expect(aiIdx).toBeGreaterThan(secIdx);
    expect(aiIdx).toBeLessThan(wfIdx);
  });
});

// ── Group 1: Prompt and Data Handling (Req 2) ───────────────────────

describe("Group 1 — Prompt and Data Handling fields", () => {
  it("allowed-prompt-data: multi-select, optional, correct options (Req 2.1)", () => {
    const f = findField("allowed-prompt-data");
    expect(f.label).toBe("Allowed Prompt Data");
    expect(f.type).toBe("multi-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "Source code", "Sanitized logs", "Mock data", "API contracts",
      "Architecture docs", "Schemas", "Test data",
    ]);
  });

  it("prohibited-prompt-data: multi-select, optional, correct options (Req 2.2)", () => {
    const f = findField("prohibited-prompt-data");
    expect(f.label).toBe("Prohibited Prompt Data");
    expect(f.type).toBe("multi-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "Customer data", "PHI", "PII", "Secrets and credentials",
      "Private keys", "Production logs", "Regulated data",
    ]);
  });

  it("sensitive-data-redaction: single-select, optional (Req 2.3)", () => {
    const f = findField("sensitive-data-redaction");
    expect(f.label).toBe("Sensitive Data Redaction Required");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });

  it("allowed-operational-artifacts: tag-list, optional (Req 2.4)", () => {
    const f = findField("allowed-operational-artifacts");
    expect(f.label).toBe("Allowed Operational Artifacts");
    expect(f.type).toBe("tag-list");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });

  it("environment-restrictions: single-select, optional (Req 2.5)", () => {
    const f = findField("environment-restrictions");
    expect(f.label).toBe("Environment-Specific Restrictions");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "No production data in prompts", "Lower environments only",
      "Sandbox-approved content only", "No restrictions",
    ]);
  });
});


// ── Group 2: AI Local Access (Req 3) ────────────────────────────────

describe("Group 2 — AI Local Access fields", () => {
  it("ai-workspace-scope: single-select, optional (Req 3.1)", () => {
    const f = findField("ai-workspace-scope");
    expect(f.label).toBe("AI Workspace Scope");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "Current repo only", "Current repo and approved subfolders",
      "Multiple approved repos", "Explicitly approved workspace paths",
    ]);
  });

  it("prohibited-local-access: tag-list, optional (Req 3.2)", () => {
    const f = findField("prohibited-local-access");
    expect(f.label).toBe("Prohibited Local Access Areas");
    expect(f.type).toBe("tag-list");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });

  it("inspect-generated-files: single-select, optional (Req 3.3)", () => {
    const f = findField("inspect-generated-files");
    expect(f.label).toBe("Can AI Inspect Generated Files Outside the Repo?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No", "Only approved paths"]);
  });

  it("read-local-config: single-select, optional (Req 3.4)", () => {
    const f = findField("read-local-config");
    expect(f.label).toBe("Can AI Read Local Config Files?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No", "Only non-secret config"]);
  });
});

// ── Group 3: External AI/Model Usage (Req 4) ────────────────────────

describe("Group 3 — External AI/Model Usage fields", () => {
  it("external-model-calls: single-select, optional (Req 4.1)", () => {
    const f = findField("external-model-calls");
    expect(f.label).toBe("Are External Model Calls Permitted?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No", "Only approved enterprise services"]);
  });

  it("approved-ai-providers: tag-list, optional (Req 4.2)", () => {
    const f = findField("approved-ai-providers");
    expect(f.label).toBe("Approved AI Providers or Services");
    expect(f.type).toBe("tag-list");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });

  it("consumer-ai-tools-prohibited: single-select, optional (Req 4.3)", () => {
    const f = findField("consumer-ai-tools-prohibited");
    expect(f.label).toBe("Are Consumer AI Tools Prohibited?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });

  it("unmanaged-extensions-prohibited: single-select, optional (Req 4.4)", () => {
    const f = findField("unmanaged-extensions-prohibited");
    expect(f.label).toBe("Are Unmanaged IDE Extensions or Plugins Prohibited?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });

  it("network-tenant-restrictions: short-text, optional (Req 4.5)", () => {
    const f = findField("network-tenant-restrictions");
    expect(f.label).toBe("Network or Tenant Restrictions for AI Services");
    expect(f.type).toBe("short-text");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });
});

// ── Group 4: Secrets and Sensitive Code (Req 5) ─────────────────────

describe("Group 4 — Secrets and Sensitive Code fields", () => {
  it("secrets-in-prompts: single-select, optional (Req 5.1)", () => {
    const f = findField("secrets-in-prompts");
    expect(f.label).toBe("May Secrets Appear in Prompts?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["No", "Yes with restrictions"]);
  });

  it("secret-handling-mechanism: multi-select, optional (Req 5.2)", () => {
    const f = findField("secret-handling-mechanism");
    expect(f.label).toBe("Permitted Secret-Handling Mechanism");
    expect(f.type).toBe("multi-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "Vault reference only", "Environment variables only", "Managed identity only",
    ]);
  });

  it("sensitive-code-categories: multi-select, optional (Req 5.3)", () => {
    const f = findField("sensitive-code-categories");
    expect(f.label).toBe("Sensitive Code Categories Requiring Extra Review");
    expect(f.type).toBe("multi-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "Authentication", "Authorization", "Cryptography", "Tenant isolation",
      "Audit logging", "Payment logic", "Data access layers",
      "Infrastructure security controls",
    ]);
  });

  it("ai-generate-sensitive-code: single-select, optional (Req 5.4)", () => {
    const f = findField("ai-generate-sensitive-code");
    expect(f.label).toBe("Can AI Generate Code in Sensitive Areas?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes with review", "No", "Limited scope only"]);
  });
});

// ── Group 5: Developer Guardrails (Req 6) ───────────────────────────

describe("Group 5 — Developer Guardrails fields", () => {
  it("developer-prohibited-content: multi-select, optional (Req 6.1)", () => {
    const f = findField("developer-prohibited-content");
    expect(f.label).toBe("Developer-Prohibited Content for AI Tools");
    expect(f.type).toBe("multi-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "Production incidents", "Customer records", "Raw support tickets",
      "Credentials", "Private architecture diagrams",
    ]);
  });

  it("human-validation-areas: multi-select, optional (Req 6.2)", () => {
    const f = findField("human-validation-areas");
    expect(f.label).toBe("Required Human Validation Areas");
    expect(f.type).toBe("multi-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "Security logic", "Access control", "Infrastructure changes",
      "Dependency changes", "Data handling logic", "Compliance-sensitive workflows",
    ]);
  });

  it("verify-ai-output-before-commit: single-select, optional (Req 6.3)", () => {
    const f = findField("verify-ai-output-before-commit");
    expect(f.label).toBe("Must Developers Verify AI Output Before Commit?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });

  it("manual-review-infra-security: single-select, optional (Req 6.4)", () => {
    const f = findField("manual-review-infra-security");
    expect(f.label).toBe(
      "Must AI-Generated Infrastructure or Security Changes Be Manually Reviewed?",
    );
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });
});


// ── Group 6: Approval and Escalation (Req 7) ────────────────────────

describe("Group 6 — Approval and Escalation fields", () => {
  it("approval-before-proceed: tag-list, optional (Req 7.1)", () => {
    const f = findField("approval-before-proceed");
    expect(f.label).toBe("Work Requiring Human Approval Before AI Proceeds");
    expect(f.type).toBe("tag-list");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });

  it("approval-before-merge: tag-list, optional (Req 7.2)", () => {
    const f = findField("approval-before-merge");
    expect(f.label).toBe("Work Requiring Human Review Before Merge");
    expect(f.type).toBe("tag-list");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });

  it("approval-before-deploy: tag-list, optional (Req 7.3)", () => {
    const f = findField("approval-before-deploy");
    expect(f.label).toBe("Work Requiring Human Review Before Deployment");
    expect(f.type).toBe("tag-list");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });

  it("stop-on-unclear-boundaries: single-select, optional (Req 7.4)", () => {
    const f = findField("stop-on-unclear-boundaries");
    expect(f.label).toBe("Should the Agent Stop When Boundaries Are Unclear?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });

  it("escalation-contact: short-text, optional (Req 7.5)", () => {
    const f = findField("escalation-contact");
    expect(f.label).toBe("Escalation Contact or Role");
    expect(f.type).toBe("short-text");
    expect(f.status).toBe("optional");
    expect(f.placeholder).toBeDefined();
  });
});

// ── Group 7: Development OS (Req 8) ─────────────────────────────────

describe("Group 7 — Development OS fields", () => {
  it("development-os: single-select, REQUIRED (Req 8.1)", () => {
    const f = findField("development-os");
    expect(f.label).toBe("Development Operating System");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("required");
    expect(f.options).toEqual([
      "Windows", "Linux", "macOS", "Mixed/Cross-platform", "Other",
    ]);
  });

  it("preferred-shell: single-select, optional (Req 8.2)", () => {
    const f = findField("preferred-shell");
    expect(f.label).toBe("Preferred Shell or CLI Environment");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual([
      "PowerShell", "Command Prompt", "Bash", "Zsh", "Fish", "Other",
    ]);
  });

  it("cross-platform-support: single-select, optional (Req 8.3)", () => {
    const f = findField("cross-platform-support");
    expect(f.label).toBe("Cross-Platform Support Required?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });

  it("examples-default-to-os: single-select, optional (Req 8.4)", () => {
    const f = findField("examples-default-to-os");
    expect(f.label).toBe("Should Examples Default to the Developer OS?");
    expect(f.type).toBe("single-select");
    expect(f.status).toBe("optional");
    expect(f.options).toEqual(["Yes", "No"]);
  });
});

// ── Only development-os is required ─────────────────────────────────

describe("Required field constraint", () => {
  it("only development-os is marked required", () => {
    const requiredFields = aiBoundariesSection.fields.filter(
      (f) => f.status === "required",
    );
    expect(requiredFields).toHaveLength(1);
    expect(requiredFields[0].fieldKey).toBe("development-os");
  });
});
