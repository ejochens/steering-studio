# Requirements Document

## Introduction

Steering Studio currently guides users through intake sections covering product context, tech stack, security, and workflows, but it does not capture explicit boundaries for how AI coding agents should behave during development. This feature adds a dedicated "AI Usage, Data Handling, and Access Boundaries" intake section and corresponding output in generated steering documents. The section captures what data may appear in prompts, what local resources an AI agent may access, whether external AI services are permitted, how secrets and sensitive code areas are handled, what developer guardrails apply, what work requires human approval, and what operating system and CLI conventions the development environment uses. When governance fields are omitted, secure defaults are applied automatically. The generated steering documents render these answers as a policy-style section with strong imperative language.

## Glossary

- **Intake_Form**: The guided intake UI in Steering Studio where users fill in structured fields organized by section.
- **AI_Boundaries_Section**: The new intake section titled "AI Usage, Data Handling, and Access Boundaries" that captures all governance, access, and OS context fields defined in this feature.
- **Steering_Document**: A generated markdown file included in the exported starter pack (e.g. `.kiro/steering/security.md` or `.github/copilot-instructions.md`).
- **Boundaries_Output_Section**: The dedicated section rendered inside generated Steering_Documents titled "AI Usage, Data Handling, and Access Boundaries".
- **Secure_Default**: A predefined restrictive value applied automatically when the user does not provide an explicit answer for a governance field.
- **Prompt_Data**: Any content that a developer or AI agent includes in a prompt sent to an AI model, including source code, logs, schemas, and documentation.
- **Sensitive_Code_Category**: A category of code that requires additional review or restrictions when AI generates or modifies it (e.g. authentication, cryptography, payment logic).
- **Approval_Trigger**: A condition or category of work that requires explicit human approval before an AI agent may proceed, before code is merged, or before deployment.
- **Document_Generator**: The server-side module that renders structured intake answers into markdown Steering_Documents using templates.

## Requirements

### Requirement 1: AI Boundaries Intake Section Registration

**User Story:** As a product owner, I want the intake form to include a dedicated AI usage boundaries section, so that governance fields are organized separately from architecture, coding standards, and security non-functionals.

#### Acceptance Criteria

1. THE Intake_Form SHALL include an AI_Boundaries_Section registered in the intake section configuration with a unique sectionKey of "ai-usage-boundaries".
2. THE AI_Boundaries_Section SHALL have a displayName of "AI Usage, Data Handling, and Access Boundaries".
3. THE AI_Boundaries_Section SHALL appear after the "Security and Compliance" section and before the "Workflows and Team Practices" section in the intake sort order.
4. THE AI_Boundaries_Section SHALL include a description explaining that the section captures AI agent access boundaries, data handling restrictions, developer guardrails, human approval triggers, and development OS context.

### Requirement 2: Prompt and Data Handling Boundary Fields

**User Story:** As a product owner, I want to define what data is allowed and prohibited in AI prompts, so that the generated steering documents give AI agents and developers clear data handling rules.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL include a multi-select field with fieldKey "allowed-prompt-data" and label "Allowed Prompt Data" with options: "Source code", "Sanitized logs", "Mock data", "API contracts", "Architecture docs", "Schemas", "Test data".
2. THE AI_Boundaries_Section SHALL include a multi-select field with fieldKey "prohibited-prompt-data" and label "Prohibited Prompt Data" with options: "Customer data", "PHI", "PII", "Secrets and credentials", "Private keys", "Production logs", "Regulated data".
3. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "sensitive-data-redaction" and label "Sensitive Data Redaction Required" with options: "Yes", "No".
4. THE AI_Boundaries_Section SHALL include a tag-list field with fieldKey "allowed-operational-artifacts" and label "Allowed Operational Artifacts" with placeholder text guiding the user to enter items such as masked incident reports, sanitized telemetry, or test data.
5. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "environment-restrictions" and label "Environment-Specific Restrictions" with options: "No production data in prompts", "Lower environments only", "Sandbox-approved content only", "No restrictions".

### Requirement 3: AI Local Access Boundary Fields

**User Story:** As a product owner, I want to define what local resources an AI agent may access, so that the generated steering documents constrain the agent's filesystem scope.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "ai-workspace-scope" and label "AI Workspace Scope" with options: "Current repo only", "Current repo and approved subfolders", "Multiple approved repos", "Explicitly approved workspace paths".
2. THE AI_Boundaries_Section SHALL include a tag-list field with fieldKey "prohibited-local-access" and label "Prohibited Local Access Areas" with placeholder text guiding the user to enter paths such as user profile folders, desktop, downloads, browser data, or unrelated repos.
3. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "inspect-generated-files" and label "Can AI Inspect Generated Files Outside the Repo?" with options: "Yes", "No", "Only approved paths".
4. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "read-local-config" and label "Can AI Read Local Config Files?" with options: "Yes", "No", "Only non-secret config".

### Requirement 4: External AI/Model/Service Usage Fields

**User Story:** As a product owner, I want to define whether external AI model calls and consumer AI tools are permitted, so that the generated steering documents enforce enterprise AI service policies.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "external-model-calls" and label "Are External Model Calls Permitted?" with options: "Yes", "No", "Only approved enterprise services".
2. THE AI_Boundaries_Section SHALL include a tag-list field with fieldKey "approved-ai-providers" and label "Approved AI Providers or Services" with placeholder text guiding the user to enter approved provider names.
3. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "consumer-ai-tools-prohibited" and label "Are Consumer AI Tools Prohibited?" with options: "Yes", "No".
4. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "unmanaged-extensions-prohibited" and label "Are Unmanaged IDE Extensions or Plugins Prohibited?" with options: "Yes", "No".
5. THE AI_Boundaries_Section SHALL include a short-text field with fieldKey "network-tenant-restrictions" and label "Network or Tenant Restrictions for AI Services" with placeholder text guiding the user to describe any network or tenant isolation requirements.

### Requirement 5: Secrets and Sensitive Code Handling Fields

**User Story:** As a product owner, I want to define secrets handling rules and identify sensitive code categories, so that the generated steering documents enforce safe practices for AI-generated code in high-risk areas.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "secrets-in-prompts" and label "May Secrets Appear in Prompts?" with options: "No", "Yes with restrictions".
2. THE AI_Boundaries_Section SHALL include a multi-select field with fieldKey "secret-handling-mechanism" and label "Permitted Secret-Handling Mechanism" with options: "Vault reference only", "Environment variables only", "Managed identity only".
3. THE AI_Boundaries_Section SHALL include a multi-select field with fieldKey "sensitive-code-categories" and label "Sensitive Code Categories Requiring Extra Review" with options: "Authentication", "Authorization", "Cryptography", "Tenant isolation", "Audit logging", "Payment logic", "Data access layers", "Infrastructure security controls".
4. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "ai-generate-sensitive-code" and label "Can AI Generate Code in Sensitive Areas?" with options: "Yes with review", "No", "Limited scope only".

### Requirement 6: Developer Guardrail Fields

**User Story:** As a product owner, I want to define what content developers must not share with AI tools and what areas require human validation, so that the generated steering documents include enforceable developer usage rules.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL include a multi-select field with fieldKey "developer-prohibited-content" and label "Developer-Prohibited Content for AI Tools" with options: "Production incidents", "Customer records", "Raw support tickets", "Credentials", "Private architecture diagrams".
2. THE AI_Boundaries_Section SHALL include a multi-select field with fieldKey "human-validation-areas" and label "Required Human Validation Areas" with options: "Security logic", "Access control", "Infrastructure changes", "Dependency changes", "Data handling logic", "Compliance-sensitive workflows".
3. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "verify-ai-output-before-commit" and label "Must Developers Verify AI Output Before Commit?" with options: "Yes", "No".
4. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "manual-review-infra-security" and label "Must AI-Generated Infrastructure or Security Changes Be Manually Reviewed?" with options: "Yes", "No".

### Requirement 7: Approval and Escalation Trigger Fields

**User Story:** As a product owner, I want to define what work requires human approval at different stages, so that the generated steering documents include clear escalation rules for AI-assisted workflows.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL include a tag-list field with fieldKey "approval-before-proceed" and label "Work Requiring Human Approval Before AI Proceeds" with placeholder text guiding the user to enter categories of work.
2. THE AI_Boundaries_Section SHALL include a tag-list field with fieldKey "approval-before-merge" and label "Work Requiring Human Review Before Merge" with placeholder text guiding the user to enter categories of work.
3. THE AI_Boundaries_Section SHALL include a tag-list field with fieldKey "approval-before-deploy" and label "Work Requiring Human Review Before Deployment" with placeholder text guiding the user to enter categories of work.
4. THE AI_Boundaries_Section SHALL include a single-select field with fieldKey "stop-on-unclear-boundaries" and label "Should the Agent Stop When Boundaries Are Unclear?" with options: "Yes", "No".
5. THE AI_Boundaries_Section SHALL include a short-text field with fieldKey "escalation-contact" and label "Escalation Contact or Role" with placeholder text guiding the user to enter a role such as security architect, tech lead, or product owner.

### Requirement 8: Development Operating System Fields

**User Story:** As a product owner, I want to capture the development operating system and shell preferences, so that the generated steering documents include OS-appropriate CLI guidance.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL include a required single-select field with fieldKey "development-os" and label "Development Operating System" with options: "Windows", "Linux", "macOS", "Mixed/Cross-platform", "Other".
2. THE AI_Boundaries_Section SHALL include an optional single-select field with fieldKey "preferred-shell" and label "Preferred Shell or CLI Environment" with options: "PowerShell", "Command Prompt", "Bash", "Zsh", "Fish", "Other".
3. THE AI_Boundaries_Section SHALL include an optional single-select field with fieldKey "cross-platform-support" and label "Cross-Platform Support Required?" with options: "Yes", "No".
4. THE AI_Boundaries_Section SHALL include an optional single-select field with fieldKey "examples-default-to-os" and label "Should Examples Default to the Developer OS?" with options: "Yes", "No".

### Requirement 9: Secure Defaults for Omitted Fields

**User Story:** As a product owner, I want secure defaults applied when optional governance fields are left blank, so that generated steering documents are restrictive by default rather than permissive.

#### Acceptance Criteria

1. WHEN the "prohibited-prompt-data" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default that prohibits customer data, secrets and credentials, and production logs in prompts.
2. WHEN the "external-model-calls" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default of "Only approved enterprise services".
3. WHEN the "ai-workspace-scope" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default of "Current repo only".
4. WHEN the "secrets-in-prompts" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default of "No".
5. WHEN the "human-validation-areas" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default that requires human validation for "Security logic", "Access control", and "Infrastructure changes".
6. WHEN the "stop-on-unclear-boundaries" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default of "Yes".
7. WHEN the "verify-ai-output-before-commit" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default of "Yes".
8. WHEN the "manual-review-infra-security" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default of "Yes".
9. WHEN the "development-os" field value is "Windows" and the "preferred-shell" field has no user-provided value, THE Document_Generator SHALL apply a Secure_Default of "PowerShell" for the preferred shell.

### Requirement 10: Steering Document Output — Boundaries Section Rendering

**User Story:** As a product owner, I want the generated steering documents to include a dedicated AI boundaries section rendered in policy-style language, so that AI agents and developers receive clear, enforceable instructions.

#### Acceptance Criteria

1. WHEN generating Steering_Documents, THE Document_Generator SHALL include a Boundaries_Output_Section titled "AI Usage, Data Handling, and Access Boundaries".
2. THE Boundaries_Output_Section SHALL contain the following subsections in order: "Allowed Prompt Content", "Prohibited Prompt Content", "Local Access Scope", "External AI/Model Usage Rules", "Secrets and Sensitive Code Handling", "Developer Usage Guardrails", "Human Approval and Escalation Rules", "Development Operating System and CLI Conventions".
3. THE Boundaries_Output_Section SHALL use imperative policy-style language with terms such as "must", "must not", "only", "prohibited", "requires approval", and "out of scope".
4. THE Boundaries_Output_Section SHALL avoid soft language such as "should be careful", "preferably", "generally avoid", and "try not to".
5. THE Document_Generator SHALL render the Boundaries_Output_Section using the user's intake answers combined with any applicable Secure_Defaults for omitted fields.

### Requirement 11: OS-Aware CLI Guidance in Steering Documents

**User Story:** As a developer, I want the generated steering documents to include CLI conventions matching my development OS, so that AI agents produce commands I can run directly.

#### Acceptance Criteria

1. WHEN the "development-os" field value is "Windows", THE Document_Generator SHALL include guidance in the Boundaries_Output_Section stating that CLI examples must use PowerShell syntax.
2. WHEN the "development-os" field value is "Windows", THE Document_Generator SHALL include guidance stating that commands must use semicolons to chain commands instead of "&&", and must use PowerShell cmdlets (e.g. Remove-Item, Copy-Item) instead of Unix equivalents.
3. WHEN the "development-os" field value is "Linux" or "macOS", THE Document_Generator SHALL include guidance stating that CLI examples must use the preferred shell or default to Bash.
4. WHEN the "development-os" field value is "Mixed/Cross-platform", THE Document_Generator SHALL include guidance stating that CLI examples must use cross-platform compatible commands or provide OS-specific variants.
5. WHEN the "examples-default-to-os" field value is "Yes", THE Document_Generator SHALL include guidance stating that all code examples, scripts, and file path conventions must default to the selected development OS.

### Requirement 12: Boundaries Section Placement in Kiro and Copilot Outputs

**User Story:** As a product owner, I want the AI boundaries section to appear in both Kiro and Copilot output targets, so that governance rules are included regardless of the chosen export format.

#### Acceptance Criteria

1. WHEN the target output includes Kiro, THE Document_Generator SHALL render the Boundaries_Output_Section inside the `.kiro/steering/security.md` file or as a separate `.kiro/steering/ai-boundaries.md` file.
2. WHEN the target output includes Copilot, THE Document_Generator SHALL render the Boundaries_Output_Section inside the `.github/copilot-instructions.md` file.
3. THE Document_Generator SHALL use the same structured intake answers and Secure_Defaults for both Kiro and Copilot renderings of the Boundaries_Output_Section.

### Requirement 13: Structured Field Storage

**User Story:** As a developer, I want AI boundaries intake values stored as structured typed fields, so that the system can apply defaults, validate inputs, support conditional generation, and enable future policy pack features.

#### Acceptance Criteria

1. THE AI_Boundaries_Section SHALL store single-select field values as string Answer records with the selected option value.
2. THE AI_Boundaries_Section SHALL store multi-select field values as JSON-serialized string arrays in Answer records.
3. THE AI_Boundaries_Section SHALL store tag-list field values as JSON-serialized string arrays in Answer records.
4. THE AI_Boundaries_Section SHALL store short-text field values as plain string Answer records.
5. FOR ALL Answer records in the AI_Boundaries_Section, serializing the value to JSON then deserializing SHALL produce an equivalent value (round-trip property).
