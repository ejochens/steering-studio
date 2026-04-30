# Implementation Plan: AI Usage Boundaries

## Overview

Add a new "AI Usage, Data Handling, and Access Boundaries" intake section to Steering Studio. Implementation follows the design's module structure: intake config and validation first, then knowledge model extension, secure defaults, shared renderer, Kiro template, Copilot template update, and template registry wiring. Each step builds incrementally so the feature is testable at every stage.

## Tasks

- [x] 1. Register the AI Boundaries intake section and update validation
  - [x] 1.1 Add the `ai-usage-boundaries` section definition to `INTAKE_SECTIONS` in `src/features/intake/config/sections.ts`
    - Define all 31 fields across 8 groups (Prompt/Data, Local Access, External AI, Secrets, Guardrails, Approval, Dev OS) with correct `fieldKey`, `label`, `type`, `status`, and `options` per Requirements 2–8
    - Set `sectionKey: "ai-usage-boundaries"`, `displayName: "AI Usage, Data Handling, and Access Boundaries"`, `sortOrder: 7`
    - Mark only `development-os` as `required`; all other fields `optional`
    - Include the section `description` per Requirement 1.4
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1–2.5, 3.1–3.4, 4.1–4.5, 5.1–5.4, 6.1–6.4, 7.1–7.5, 8.1–8.4_
  - [x] 1.2 Update the `sortOrder` of "Workflows and Team Practices" from 7 to 8 in `src/features/intake/config/sections.ts`
    - _Requirements: 1.3_
  - [x] 1.3 Add `"ai-usage-boundaries"` to the `sectionKeySchema` Zod enum in `src/lib/validation/intake.ts`
    - _Requirements: 1.1, 13.1–13.4_
  - [x] 1.4 Write unit tests for section config validation
    - Verify `sectionKey`, `displayName`, `sortOrder`, field count (31), and field definitions match Requirements 1–8
    - Verify sort order: "ai-usage-boundaries" (7) appears after "security-and-compliance" (6) and before "workflows-and-team-practices" (8)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Extend KnowledgeModel with boundary fields
  - [x] 2.1 Add 31 new string properties to the `KnowledgeModel` interface in `src/features/document-generation/lib/assemble-knowledge-model.ts`
    - Properties: `allowedPromptData`, `prohibitedPromptData`, `sensitiveDataRedaction`, `allowedOperationalArtifacts`, `environmentRestrictions`, `aiWorkspaceScope`, `prohibitedLocalAccess`, `inspectGeneratedFiles`, `readLocalConfig`, `externalModelCalls`, `approvedAiProviders`, `consumerAiToolsProhibited`, `unmanagedExtensionsProhibited`, `networkTenantRestrictions`, `secretsInPrompts`, `secretHandlingMechanism`, `sensitiveCodeCategories`, `aiGenerateSensitiveCode`, `developerProhibitedContent`, `humanValidationAreas`, `verifyAiOutputBeforeCommit`, `manualReviewInfraSecurity`, `approvalBeforeProceed`, `approvalBeforeMerge`, `approvalBeforeDeploy`, `stopOnUnclearBoundaries`, `escalationContact`, `developmentOs`, `preferredShell`, `crossPlatformSupport`, `examplesDefaultToOs`
    - _Requirements: 13.1–13.5_
  - [x] 2.2 Add 31 `FIELD_MAPPING` entries mapping `(sectionKey, fieldKey)` pairs to `KnowledgeModel` properties
    - _Requirements: 13.1–13.5_
  - [x] 2.3 Initialize all 31 new fields to `""` in `emptyKnowledgeModel()`
    - _Requirements: 13.1–13.5_
  - [x] 2.4 Write unit tests for knowledge model mapping
    - Verify all 31 `FIELD_MAPPING` entries exist and map to correct properties
    - Verify `buildKnowledgeModelFromAnswers` populates boundary fields from answer lookup
    - _Requirements: 13.1–13.5_

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement secure defaults module
  - [x] 4.1 Create `src/features/document-generation/lib/ai-boundaries-defaults.ts`
    - Export `SECURE_DEFAULTS` constant with default values per Requirement 9
    - Export `ResolvedBoundaries` interface
    - Export `resolveBoundaries(model: KnowledgeModel): ResolvedBoundaries` pure function
    - Parse JSON string arrays for multi-select/tag-list fields; fall back to defaults on parse failure or empty value
    - Apply conditional `preferredShell` default of `"PowerShell"` only when `developmentOs === "Windows"`
    - _Requirements: 9.1–9.9_
  - [x] 4.2 Write property test for secure defaults (Property 1)
    - **Property 1: Secure defaults are applied for all defaulted fields**
    - Generate random `KnowledgeModel` instances with varying empty/non-empty boundary fields
    - Verify `resolveBoundaries` returns correct defaults for empty fields and preserves user values for non-empty fields
    - Include the conditional Windows/PowerShell case
    - Test file: `src/features/document-generation/__tests__/ai-boundaries-defaults.pbt.test.ts`
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9**
  - [x] 4.3 Write property test for JSON round-trip (Property 6)
    - **Property 6: Answer value JSON round-trip**
    - Generate random answer values (plain strings and JSON arrays of strings)
    - Verify `JSON.stringify`/`JSON.parse` round-trip produces equivalent values
    - Test file: `src/features/document-generation/__tests__/ai-boundaries-defaults.pbt.test.ts`
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

- [x] 5. Implement shared boundaries markdown renderer
  - [x] 5.1 Create `renderBoundariesMarkdown(resolved: ResolvedBoundaries): string` in `src/features/document-generation/lib/ai-boundaries-defaults.ts` (or a separate shared module)
    - Render 8 subsections in order: "Allowed Prompt Content", "Prohibited Prompt Content", "Local Access Scope", "External AI/Model Usage Rules", "Secrets and Sensitive Code Handling", "Developer Usage Guardrails", "Human Approval and Escalation Rules", "Development Operating System and CLI Conventions"
    - Use imperative policy language: "must", "must not", "only", "prohibited", "requires approval", "out of scope"
    - Avoid soft language: no "should be careful", "preferably", "generally avoid", "try not to"
    - Include OS-aware CLI guidance based on `developmentOs` and `preferredShell` values
    - _Requirements: 10.1–10.5, 11.1–11.5_
  - [x] 5.2 Write property test for subsection ordering (Property 2)
    - **Property 2: Rendered boundaries section contains correct title and ordered subsections**
    - Generate random `ResolvedBoundaries` objects
    - Verify all 8 subsection headings appear in correct order
    - Test file: `src/features/document-generation/templates/__tests__/ai-boundaries.pbt.test.ts`
    - **Validates: Requirements 10.1, 10.2**
  - [x] 5.3 Write property test for imperative language (Property 3)
    - **Property 3: Rendered boundaries section uses imperative language and avoids soft language**
    - Generate random `ResolvedBoundaries` objects with at least one non-empty field
    - Verify at least one imperative term present and no soft phrases
    - Test file: `src/features/document-generation/templates/__tests__/ai-boundaries.pbt.test.ts`
    - **Validates: Requirements 10.3, 10.4**
  - [x] 5.4 Write property test for OS-aware CLI guidance (Property 4)
    - **Property 4: OS-aware CLI guidance matches the development OS**
    - Generate random `ResolvedBoundaries` objects with each possible `developmentOs` value
    - Verify OS-appropriate CLI guidance appears in rendered markdown
    - Test file: `src/features/document-generation/templates/__tests__/ai-boundaries.pbt.test.ts`
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

- [x] 6. Implement Kiro boundaries template
  - [x] 6.1 Create `src/features/document-generation/templates/kiro/ai-boundaries.template.ts`
    - Export `renderAiBoundariesMd(model: KnowledgeModel): TemplateResult`
    - Call `resolveBoundaries(model)` then `renderBoundariesMarkdown(resolved)`
    - Wrap output with `# AI Usage, Data Handling, and Access Boundaries` heading
    - Define `REQUIRED_FIELDS` as `["developmentOs"]` for completeness calculation
    - _Requirements: 10.1–10.5, 11.1–11.5, 12.1_

- [x] 7. Update Copilot template with boundaries section
  - [x] 7.1 Update `src/features/document-generation/templates/copilot/copilot-instructions.template.ts`
    - Import `resolveBoundaries` and `renderBoundariesMarkdown`
    - Append an "AI Usage, Data Handling, and Access Boundaries" section at the end of the generated markdown
    - Only append when at least one boundary field is non-empty or secure defaults apply
    - _Requirements: 10.1–10.5, 11.1–11.5, 12.2_
  - [x] 7.2 Write property test for Kiro/Copilot consistency (Property 5)
    - **Property 5: Kiro and Copilot boundaries content uses the same resolved values**
    - Generate random `KnowledgeModel` instances
    - Verify `renderBoundariesMarkdown` produces identical output for both targets given the same input
    - Test file: `src/features/document-generation/templates/__tests__/ai-boundaries.pbt.test.ts`
    - **Validates: Requirements 12.3**

- [x] 8. Register Kiro template in the template registry
  - [x] 8.1 Update `src/features/document-generation/lib/template-registry.ts`
    - Import `renderAiBoundariesMd` from the new Kiro template
    - Add a `TemplateDefinition` entry with `templateId: "kiro-ai-boundaries"`, `filePath: ".kiro/steering/ai-boundaries.md"`, `target: "kiro"`, `required: false`
    - Implement `isApplicable` to check if any key boundary field is non-empty
    - _Requirements: 12.1_
  - [x] 8.2 Write unit tests for template registry
    - Verify the new template is returned by `getTemplatesForTarget("Kiro")` and `getTemplatesForTarget("Both")`
    - Verify `isApplicable` returns true when boundary fields are populated and false when all are empty
    - _Requirements: 12.1_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- No Prisma schema changes needed — existing IntakeSection/Answer models handle everything
- The shared `renderBoundariesMarkdown` function ensures Kiro and Copilot outputs stay consistent
