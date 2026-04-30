import type { SectionKey } from "@/lib/validation/intake";

// ── Field and section definition types ───────────────────────────────

export type FieldType = "short-text" | "long-text" | "single-select" | "multi-select" | "tag-list";
export type FieldStatus = "required" | "optional";

export interface IntakeFieldDef {
  fieldKey: string;
  label: string;
  type: FieldType;
  status: FieldStatus;
  helpText: string;
  placeholder?: string;
  options?: string[];
}

export interface IntakeSectionDef {
  sectionKey: SectionKey;
  displayName: string;
  description: string;
  sortOrder: number;
  fields: IntakeFieldDef[];
}

// ── Section definitions ──────────────────────────────────────────────

export const INTAKE_SECTIONS: IntakeSectionDef[] = [
  // Section 0: Product and Users
  {
    sectionKey: "product-and-users",
    displayName: "Product and Users",
    description:
      "Define what the product is, who it serves, and the primary use cases. This context shapes every downstream document and helps the AI understand the domain.",
    sortOrder: 0,
    fields: [
      {
        fieldKey: "product-name",
        label: "Product Name",
        type: "short-text",
        status: "required",
        helpText: "The working name for the product or project.",
        placeholder: "e.g. Steering Studio",
      },
      {
        fieldKey: "product-purpose",
        label: "Product Purpose",
        type: "long-text",
        status: "required",
        helpText: "A brief summary of what the product does and why it exists.",
        placeholder: "e.g. A web app that helps teams create structured context packs for AI coding tools.",
      },
      {
        fieldKey: "target-users",
        label: "Target Users",
        type: "long-text",
        status: "required",
        helpText: "Describe the primary users and their roles. Who will use this product day-to-day?",
        placeholder: "e.g. Engineering leads, solution architects, senior developers preparing repos for AI-assisted work.",
      },
      {
        fieldKey: "primary-use-cases",
        label: "Primary Use Cases",
        type: "long-text",
        status: "required",
        helpText: "List the top use cases or jobs-to-be-done that the product addresses.",
        placeholder: "e.g. Define project context, generate steering documents, export starter packs.",
      },
    ],
  },
  // Section 1: Problem and Outcomes
  {
    sectionKey: "problem-and-outcomes",
    displayName: "Problem and Outcomes",
    description:
      "Capture the core problem the product solves, the desired outcomes, and how success will be measured. This drives prioritization and keeps generated documents grounded in real goals.",
    sortOrder: 1,
    fields: [
      {
        fieldKey: "problem-statement",
        label: "Problem Statement",
        type: "long-text",
        status: "required",
        helpText: "What specific problem does this product solve? Be concrete about the pain point.",
        placeholder: "e.g. Teams get weak results from AI tools because repositories lack structured context.",
      },
      {
        fieldKey: "desired-outcomes",
        label: "Desired Outcomes",
        type: "long-text",
        status: "required",
        helpText: "What should be true when the product is working well? Describe the end state.",
        placeholder: "e.g. Teams can generate a usable project context pack in one sitting.",
      },
      {
        fieldKey: "success-metrics",
        label: "Success Metrics",
        type: "long-text",
        status: "optional",
        helpText: "How will you measure whether the product is achieving its goals?",
        placeholder: "e.g. Time from project creation to first export, percentage of sections completed.",
      },
      {
        fieldKey: "key-value-proposition",
        label: "Key Value Proposition",
        type: "short-text",
        status: "required",
        helpText: "One sentence that captures the core value the product delivers.",
        placeholder: "e.g. Structured project context that makes AI coding tools effective from day one.",
      },
    ],
  },
  // Section 2: Scope and Non-Goals
  {
    sectionKey: "scope-and-non-goals",
    displayName: "Scope and Non-Goals",
    description:
      "Define what is in scope for the current effort and what is explicitly excluded. Clear boundaries prevent scope creep and help the AI avoid generating irrelevant content.",
    sortOrder: 2,
    fields: [
      {
        fieldKey: "in-scope-features",
        label: "In-Scope Features",
        type: "long-text",
        status: "required",
        helpText: "List the features and capabilities that are included in the current scope.",
        placeholder: "e.g. Guided intake flow, AI chat clarification, document generation, ZIP export.",
      },
      {
        fieldKey: "non-goals",
        label: "Explicit Non-Goals",
        type: "long-text",
        status: "required",
        helpText: "What is deliberately excluded? Being explicit about non-goals prevents misaligned output.",
        placeholder: "e.g. Real-time collaboration, enterprise SSO, autonomous code generation.",
      },
      {
        fieldKey: "mvp-boundaries",
        label: "MVP Boundaries",
        type: "long-text",
        status: "optional",
        helpText: "Where does the MVP end? What is deferred to later phases?",
        placeholder: "e.g. MVP supports local single-user mode only. Multi-tenant hosting is post-MVP.",
      },
      {
        fieldKey: "future-considerations",
        label: "Future Considerations",
        type: "long-text",
        status: "optional",
        helpText: "Things you want to keep in mind for later but are not building now.",
        placeholder: "e.g. Repository scanning, prompt libraries by domain, organization-wide templates.",
      },
    ],
  },
  // Section 3: Tech Stack and Architecture
  {
    sectionKey: "tech-stack-and-architecture",
    displayName: "Tech Stack and Architecture",
    description:
      "Specify the programming languages, frameworks, database, hosting, and architecture patterns. This information is critical for generating accurate technical steering documents.",
    sortOrder: 3,
    fields: [
      {
        fieldKey: "programming-languages",
        label: "Programming Languages",
        type: "tag-list",
        status: "required",
        helpText: "Which programming languages does the project use?",
        placeholder: "e.g. TypeScript, Python, Go",
      },
      {
        fieldKey: "frameworks",
        label: "Frameworks",
        type: "tag-list",
        status: "required",
        helpText: "Which frameworks or libraries are central to the project?",
        placeholder: "e.g. Next.js, React, Tailwind CSS",
      },
      {
        fieldKey: "database",
        label: "Database",
        type: "short-text",
        status: "required",
        helpText: "What database technology does the project use?",
        placeholder: "e.g. PostgreSQL with Prisma ORM, SQLite for local dev",
      },
      {
        fieldKey: "hosting-deployment",
        label: "Hosting and Deployment",
        type: "short-text",
        status: "optional",
        helpText: "Where will the application be hosted and how is it deployed?",
        placeholder: "e.g. AWS with Vercel, local-first for MVP",
      },
      {
        fieldKey: "architecture-pattern",
        label: "Architecture Pattern",
        type: "single-select",
        status: "required",
        helpText: "Which architecture pattern best describes the project?",
        placeholder: "Select the pattern that fits your project",
        options: [
          "Monolith",
          "Modular monolith",
          "Microservices",
          "Serverless",
          "Event-driven",
          "Other",
        ],
      },
    ],
  },
  // Section 4: Project Structure and Conventions
  {
    sectionKey: "project-structure-and-conventions",
    displayName: "Project Structure and Conventions",
    description:
      "Describe how the codebase is organized, naming conventions, and coding standards. This helps generated documents reflect your actual project layout and team norms.",
    sortOrder: 4,
    fields: [
      {
        fieldKey: "folder-structure",
        label: "Folder Structure",
        type: "long-text",
        status: "required",
        helpText: "Describe the top-level folder layout and how code is organized.",
        placeholder: "e.g. src/app for routes, src/features for domain modules, src/lib for shared utilities.",
      },
      {
        fieldKey: "naming-conventions",
        label: "Naming Conventions",
        type: "long-text",
        status: "required",
        helpText: "What naming patterns does the team follow for files, folders, components, and variables?",
        placeholder: "e.g. kebab-case for files, PascalCase for components, camelCase for functions.",
      },
      {
        fieldKey: "module-organization",
        label: "Module Organization",
        type: "single-select",
        status: "required",
        helpText: "How are modules or features organized in the codebase?",
        placeholder: "Select the approach that best fits your project",
        options: [
          "Feature-based (grouped by domain)",
          "Layer-based (grouped by type)",
          "Hybrid (features with shared layers)",
          "Other",
        ],
      },
      {
        fieldKey: "coding-standards",
        label: "Coding Standards",
        type: "long-text",
        status: "optional",
        helpText: "Any specific coding standards, linting rules, or style guides the team follows?",
        placeholder: "e.g. ESLint with strict TypeScript rules, Prettier for formatting, no default exports.",
      },
    ],
  },
  // Section 5: Testing and Quality
  {
    sectionKey: "testing-and-quality",
    displayName: "Testing and Quality",
    description:
      "Specify the testing frameworks, test types, coverage expectations, and quality gates. This ensures generated steering documents include accurate testing guidance.",
    sortOrder: 5,
    fields: [
      {
        fieldKey: "testing-framework",
        label: "Testing Framework",
        type: "short-text",
        status: "required",
        helpText: "Which testing framework(s) does the project use?",
        placeholder: "e.g. Vitest for unit tests, Playwright for E2E",
      },
      {
        fieldKey: "test-types",
        label: "Test Types",
        type: "multi-select",
        status: "required",
        helpText: "Which types of tests does the project include?",
        placeholder: "Select all test types used in the project",
        options: [
          "Unit tests",
          "Integration tests",
          "End-to-end tests (Playwright)",
          "End-to-end tests (Cypress)",
          "End-to-end tests (other)",
          "Property-based tests",
          "Golden-file tests",
          "Snapshot tests",
        ],
      },
      {
        fieldKey: "coverage-expectations",
        label: "Coverage Expectations",
        type: "short-text",
        status: "optional",
        helpText: "What level of test coverage does the team target?",
        placeholder: "e.g. 80% line coverage for core logic, no strict threshold for UI",
      },
      {
        fieldKey: "quality-gates",
        label: "Quality Gates",
        type: "long-text",
        status: "optional",
        helpText: "What checks must pass before code is merged or deployed?",
        placeholder: "e.g. All tests pass, no lint errors, PR review required, build succeeds.",
      },
    ],
  },
  // Section 6: Security and Compliance
  {
    sectionKey: "security-and-compliance",
    displayName: "Security and Compliance",
    description:
      "Capture authentication methods, authorization models, data sensitivity levels, and compliance requirements. This information shapes security-focused steering documents.",
    sortOrder: 6,
    fields: [
      {
        fieldKey: "authentication-method",
        label: "Authentication Method",
        type: "single-select",
        status: "required",
        helpText: "How do users authenticate with the application?",
        placeholder: "Select the primary authentication method",
        options: [
          "Session-based",
          "JWT tokens",
          "OAuth / OIDC",
          "API keys",
          "SSO",
          "None (local-only)",
          "Other",
        ],
      },
      {
        fieldKey: "authorization-model",
        label: "Authorization Model",
        type: "short-text",
        status: "required",
        helpText: "How is access control structured? Describe roles, permissions, or policies.",
        placeholder: "e.g. Role-based access control with admin, editor, and viewer roles.",
      },
      {
        fieldKey: "data-sensitivity",
        label: "Data Sensitivity",
        type: "single-select",
        status: "required",
        helpText: "What is the general sensitivity level of the data the application handles?",
        placeholder: "Select the data sensitivity level",
        options: [
          "Public",
          "Internal",
          "Confidential",
          "Highly confidential",
        ],
      },
      {
        fieldKey: "compliance-requirements",
        label: "Compliance Requirements",
        type: "multi-select",
        status: "optional",
        helpText: "Are there specific compliance standards the project must meet?",
        placeholder: "Select any applicable compliance standards",
        options: [
          "GDPR",
          "SOC 2",
          "HIPAA",
          "PCI DSS",
          "ISO 27001",
          "FedRAMP",
          "None",
        ],
      },
    ],
  },
  // Section 7: AI Usage, Data Handling, and Access Boundaries
  {
    sectionKey: "ai-usage-boundaries",
    displayName: "AI Usage, Data Handling, and Access Boundaries",
    description:
      "Capture AI agent access boundaries, data handling restrictions, developer guardrails, human approval triggers, and development OS context. These fields shape the governance rules rendered in generated steering documents.",
    sortOrder: 7,
    fields: [
      // Group 1 — Prompt and Data Handling (Req 2)
      {
        fieldKey: "allowed-prompt-data",
        label: "Allowed Prompt Data",
        type: "multi-select",
        status: "optional",
        helpText: "Select the types of data that may be included in AI prompts.",
        options: [
          "Source code",
          "Sanitized logs",
          "Mock data",
          "API contracts",
          "Architecture docs",
          "Schemas",
          "Test data",
        ],
      },
      {
        fieldKey: "prohibited-prompt-data",
        label: "Prohibited Prompt Data",
        type: "multi-select",
        status: "optional",
        helpText: "Select the types of data that must never appear in AI prompts.",
        options: [
          "Customer data",
          "PHI",
          "PII",
          "Secrets and credentials",
          "Private keys",
          "Production logs",
          "Regulated data",
        ],
      },
      {
        fieldKey: "sensitive-data-redaction",
        label: "Sensitive Data Redaction Required",
        type: "single-select",
        status: "optional",
        helpText: "Must sensitive data be redacted before inclusion in prompts?",
        options: ["Yes", "No"],
      },
      {
        fieldKey: "allowed-operational-artifacts",
        label: "Allowed Operational Artifacts",
        type: "tag-list",
        status: "optional",
        helpText: "List operational artifacts that may be shared with AI tools.",
        placeholder: "e.g. masked incident reports, sanitized telemetry, test data",
      },
      {
        fieldKey: "environment-restrictions",
        label: "Environment-Specific Restrictions",
        type: "single-select",
        status: "optional",
        helpText: "Select the environment restriction that applies to AI prompt data.",
        options: [
          "No production data in prompts",
          "Lower environments only",
          "Sandbox-approved content only",
          "No restrictions",
        ],
      },
      // Group 2 — AI Local Access (Req 3)
      {
        fieldKey: "ai-workspace-scope",
        label: "AI Workspace Scope",
        type: "single-select",
        status: "optional",
        helpText: "Define the scope of local filesystem access for AI agents.",
        options: [
          "Current repo only",
          "Current repo and approved subfolders",
          "Multiple approved repos",
          "Explicitly approved workspace paths",
        ],
      },
      {
        fieldKey: "prohibited-local-access",
        label: "Prohibited Local Access Areas",
        type: "tag-list",
        status: "optional",
        helpText: "List local paths or areas the AI agent must not access.",
        placeholder: "e.g. user profile folders, desktop, downloads, browser data, unrelated repos",
      },
      {
        fieldKey: "inspect-generated-files",
        label: "Can AI Inspect Generated Files Outside the Repo?",
        type: "single-select",
        status: "optional",
        helpText: "Can the AI agent inspect generated files outside the repository?",
        options: ["Yes", "No", "Only approved paths"],
      },
      {
        fieldKey: "read-local-config",
        label: "Can AI Read Local Config Files?",
        type: "single-select",
        status: "optional",
        helpText: "Can the AI agent read local configuration files?",
        options: ["Yes", "No", "Only non-secret config"],
      },
      // Group 3 — External AI/Model Usage (Req 4)
      {
        fieldKey: "external-model-calls",
        label: "Are External Model Calls Permitted?",
        type: "single-select",
        status: "optional",
        helpText: "Are calls to external AI models or services permitted?",
        options: ["Yes", "No", "Only approved enterprise services"],
      },
      {
        fieldKey: "approved-ai-providers",
        label: "Approved AI Providers or Services",
        type: "tag-list",
        status: "optional",
        helpText: "List the AI providers or services approved for use.",
        placeholder: "e.g. Azure OpenAI, Amazon Bedrock, Google Vertex AI",
      },
      {
        fieldKey: "consumer-ai-tools-prohibited",
        label: "Are Consumer AI Tools Prohibited?",
        type: "single-select",
        status: "optional",
        helpText: "Are consumer-grade AI tools (e.g. free ChatGPT) prohibited?",
        options: ["Yes", "No"],
      },
      {
        fieldKey: "unmanaged-extensions-prohibited",
        label: "Are Unmanaged IDE Extensions or Plugins Prohibited?",
        type: "single-select",
        status: "optional",
        helpText: "Are unmanaged or unapproved IDE extensions and plugins prohibited?",
        options: ["Yes", "No"],
      },
      {
        fieldKey: "network-tenant-restrictions",
        label: "Network or Tenant Restrictions for AI Services",
        type: "short-text",
        status: "optional",
        helpText: "Describe any network or tenant isolation requirements for AI services.",
        placeholder: "e.g. AI traffic must stay within corporate VPN, tenant-isolated endpoints only",
      },
      // Group 4 — Secrets and Sensitive Code (Req 5)
      {
        fieldKey: "secrets-in-prompts",
        label: "May Secrets Appear in Prompts?",
        type: "single-select",
        status: "optional",
        helpText: "May secrets or credentials appear in AI prompts?",
        options: ["No", "Yes with restrictions"],
      },
      {
        fieldKey: "secret-handling-mechanism",
        label: "Permitted Secret-Handling Mechanism",
        type: "multi-select",
        status: "optional",
        helpText: "Select the permitted mechanisms for handling secrets in code.",
        options: [
          "Vault reference only",
          "Environment variables only",
          "Managed identity only",
        ],
      },
      {
        fieldKey: "sensitive-code-categories",
        label: "Sensitive Code Categories Requiring Extra Review",
        type: "multi-select",
        status: "optional",
        helpText: "Select code categories that require extra review when AI-generated.",
        options: [
          "Authentication",
          "Authorization",
          "Cryptography",
          "Tenant isolation",
          "Audit logging",
          "Payment logic",
          "Data access layers",
          "Infrastructure security controls",
        ],
      },
      {
        fieldKey: "ai-generate-sensitive-code",
        label: "Can AI Generate Code in Sensitive Areas?",
        type: "single-select",
        status: "optional",
        helpText: "Can AI generate code in sensitive areas?",
        options: ["Yes with review", "No", "Limited scope only"],
      },
      // Group 5 — Developer Guardrails (Req 6)
      {
        fieldKey: "developer-prohibited-content",
        label: "Developer-Prohibited Content for AI Tools",
        type: "multi-select",
        status: "optional",
        helpText: "Select content types developers must not share with AI tools.",
        options: [
          "Production incidents",
          "Customer records",
          "Raw support tickets",
          "Credentials",
          "Private architecture diagrams",
        ],
      },
      {
        fieldKey: "human-validation-areas",
        label: "Required Human Validation Areas",
        type: "multi-select",
        status: "optional",
        helpText: "Select areas where human validation is required for AI output.",
        options: [
          "Security logic",
          "Access control",
          "Infrastructure changes",
          "Dependency changes",
          "Data handling logic",
          "Compliance-sensitive workflows",
        ],
      },
      {
        fieldKey: "verify-ai-output-before-commit",
        label: "Must Developers Verify AI Output Before Commit?",
        type: "single-select",
        status: "optional",
        helpText: "Must developers verify AI-generated output before committing?",
        options: ["Yes", "No"],
      },
      {
        fieldKey: "manual-review-infra-security",
        label: "Must AI-Generated Infrastructure or Security Changes Be Manually Reviewed?",
        type: "single-select",
        status: "optional",
        helpText: "Must AI-generated infrastructure or security changes be manually reviewed?",
        options: ["Yes", "No"],
      },
      // Group 6 — Approval and Escalation (Req 7)
      {
        fieldKey: "approval-before-proceed",
        label: "Work Requiring Human Approval Before AI Proceeds",
        type: "tag-list",
        status: "optional",
        helpText: "List categories of work that require human approval before the AI proceeds.",
        placeholder: "e.g. security changes, infrastructure modifications, data migrations",
      },
      {
        fieldKey: "approval-before-merge",
        label: "Work Requiring Human Review Before Merge",
        type: "tag-list",
        status: "optional",
        helpText: "List categories of work that require human review before merging.",
        placeholder: "e.g. authentication changes, API contract changes, database schema changes",
      },
      {
        fieldKey: "approval-before-deploy",
        label: "Work Requiring Human Review Before Deployment",
        type: "tag-list",
        status: "optional",
        helpText: "List categories of work that require human review before deployment.",
        placeholder: "e.g. production config changes, secrets rotation, compliance-sensitive features",
      },
      {
        fieldKey: "stop-on-unclear-boundaries",
        label: "Should the Agent Stop When Boundaries Are Unclear?",
        type: "single-select",
        status: "optional",
        helpText: "Should the AI agent stop and ask for guidance when boundaries are unclear?",
        options: ["Yes", "No"],
      },
      {
        fieldKey: "escalation-contact",
        label: "Escalation Contact or Role",
        type: "short-text",
        status: "optional",
        helpText: "Who should be contacted when escalation is needed?",
        placeholder: "e.g. security architect, tech lead, product owner",
      },
      // Group 7 — Development OS (Req 8)
      {
        fieldKey: "development-os",
        label: "Development Operating System",
        type: "single-select",
        status: "required",
        helpText: "Select the primary development operating system.",
        options: ["Windows", "Linux", "macOS", "Mixed/Cross-platform", "Other"],
      },
      {
        fieldKey: "preferred-shell",
        label: "Preferred Shell or CLI Environment",
        type: "single-select",
        status: "optional",
        helpText: "Select the preferred shell or CLI environment.",
        options: ["PowerShell", "Command Prompt", "Bash", "Zsh", "Fish", "Other"],
      },
      {
        fieldKey: "cross-platform-support",
        label: "Cross-Platform Support Required?",
        type: "single-select",
        status: "optional",
        helpText: "Does the project require cross-platform support?",
        options: ["Yes", "No"],
      },
      {
        fieldKey: "examples-default-to-os",
        label: "Should Examples Default to the Developer OS?",
        type: "single-select",
        status: "optional",
        helpText: "Should generated code examples and scripts default to the selected OS?",
        options: ["Yes", "No"],
      },
    ],
  },
  // Section 8: Workflows and Team Practices
  {
    sectionKey: "workflows-and-team-practices",
    displayName: "Workflows and Team Practices",
    description:
      "Describe the team's branching strategy, CI/CD approach, code review process, and deployment workflow. This context helps generated documents reflect how the team actually works.",
    sortOrder: 8,
    fields: [
      {
        fieldKey: "branching-strategy",
        label: "Branching Strategy",
        type: "single-select",
        status: "required",
        helpText: "Which branching model does the team follow?",
        placeholder: "Select the branching strategy",
        options: [
          "GitHub Flow",
          "Git Flow",
          "Trunk-based development",
          "Feature branches with squash merge",
          "Other",
        ],
      },
      {
        fieldKey: "source-control-platform",
        label: "Source Control Platform",
        type: "single-select",
        status: "required",
        helpText: "Where is the source code hosted?",
        placeholder: "Select the source control platform",
        options: [
          "GitHub",
          "Azure DevOps (Git)",
          "GitLab",
          "Bitbucket",
          "AWS CodeCommit",
          "Other",
        ],
      },
      {
        fieldKey: "ci-cd-approach",
        label: "CI/CD Approach",
        type: "long-text",
        status: "required",
        helpText: "Describe the continuous integration and deployment pipeline.",
        placeholder: "e.g. Azure Pipelines for CI/CD, GitHub Actions, or manual deployment.",
      },
      {
        fieldKey: "code-review-process",
        label: "Code Review Process",
        type: "long-text",
        status: "optional",
        helpText: "How does the team handle code reviews? Any specific expectations or tools?",
        placeholder: "e.g. All PRs require one approval, reviewers focus on correctness and maintainability.",
      },
      {
        fieldKey: "deployment-workflow",
        label: "Deployment Workflow",
        type: "long-text",
        status: "optional",
        helpText: "Describe how code moves from development to production.",
        placeholder: "e.g. Merge to main triggers staging deploy, manual approval for production release.",
      },
    ],
  },
];
