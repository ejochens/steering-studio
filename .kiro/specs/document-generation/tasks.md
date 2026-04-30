# Implementation Plan: Document Generation

## Overview

Build the document generation feature bottom-up: schema and validation first, then pure logic modules (knowledge model assembly, templates, completeness, template registry), then server actions, then React UI components, then integration points. TypeScript throughout, following the existing feature-module pattern under `src/features/document-generation/`.

## Tasks

- [x] 1. Add GeneratedDocument Prisma model and validation schemas
  - [x] 1.1 Add GeneratedDocument model to prisma/schema.prisma
    - Add the `GeneratedDocument` model with fields: `id`, `projectId`, `filePath`, `content`, `draftContent`, `completeness`, `missingFields`, `templateVersion`, `manuallyEdited`, `generatedAt`, `updatedAt`
    - Add `@@unique([projectId, filePath])` constraint
    - Add `generatedDocuments GeneratedDocument[]` relation to the existing `Project` model
    - Run `npx prisma db push` then `npx prisma generate`
    - _Requirements: 9.1, 9.3_

  - [x] 1.2 Create Zod validation schemas for document generation
    - Create `src/lib/validation/generated-document.ts`
    - Define `completenessStatusSchema`, `saveDocumentEditSchema`, `generateDocumentsSchema`, `generateSingleDocumentSchema`
    - Add barrel export in `src/lib/validation/index.ts`
    - _Requirements: 9.1, 5.2_

- [x] 2. Implement knowledge model assembly
  - [x] 2.1 Create KnowledgeModel type and assembleKnowledgeModel function
    - Create `src/features/document-generation/lib/assemble-knowledge-model.ts`
    - Define the `KnowledgeModel` interface with all fields from the design (productName through deploymentWorkflow)
    - Implement `assembleKnowledgeModel(projectId)` that queries all `IntakeSection` + `Answer` rows and maps `(sectionKey, fieldKey)` pairs to `KnowledgeModel` properties
    - Missing answers result in empty strings
    - _Requirements: 1.1_

  - [x] 2.2 Write property test: knowledge model assembly preserves all confirmed answers
    - **Property 1: Knowledge model assembly preserves all confirmed answers**
    - **Validates: Requirements 1.1**

- [x] 3. Implement completeness calculation
  - [x] 3.1 Create calculateDocumentCompleteness function
    - Create `src/features/document-generation/lib/calculate-completeness.ts`
    - Export `CompletenessStatus` type (`"complete" | "partial" | "empty"`)
    - Implement `calculateDocumentCompleteness(requiredFields, model)` returning `{ status, missingFields }`
    - "complete" when all required fields are non-empty, "empty" when all are empty, "partial" otherwise
    - _Requirements: 1.5, 10.1, 10.2_

  - [x] 3.2 Write property test: completeness status invariant
    - **Property 5: Completeness status invariant**
    - **Validates: Requirements 1.5, 10.1, 10.2**

- [x] 4. Implement template functions
  - [x] 4.1 Create Kiro required templates (product, tech, structure)
    - Create `src/features/document-generation/templates/kiro/product.template.ts` with `renderProductMd(model): TemplateResult`
    - Create `src/features/document-generation/templates/kiro/tech.template.ts` with `renderTechMd(model): TemplateResult`
    - Create `src/features/document-generation/templates/kiro/structure.template.ts` with `renderStructureMd(model): TemplateResult`
    - Each template: receives `KnowledgeModel`, tracks missing fields, omits empty optional sections, returns `{ markdown, completeness, missingFields }`
    - _Requirements: 1.2, 1.3, 1.4, 2.1_

  - [x] 4.2 Create Kiro optional templates (testing, security, workflows)
    - Create `src/features/document-generation/templates/kiro/testing.template.ts` with `renderTestingMd(model): TemplateResult`
    - Create `src/features/document-generation/templates/kiro/security.template.ts` with `renderSecurityMd(model): TemplateResult`
    - Create `src/features/document-generation/templates/kiro/workflows.template.ts` with `renderWorkflowsMd(model): TemplateResult`
    - Each template only produces output when relevant knowledge model fields are non-empty
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 4.3 Create Copilot templates
    - Create `src/features/document-generation/templates/copilot/copilot-instructions.template.ts` with `renderCopilotInstructionsMd(model): TemplateResult`
    - Create `src/features/document-generation/templates/shared/agents.template.ts` with `renderAgentsMd(model): TemplateResult`
    - Copilot instructions consolidate product purpose, architecture, build/test, coding conventions, workflow expectations
    - _Requirements: 2.2, 2.7_

  - [x] 4.4 Write property tests for template rendering
    - **Property 2: Deterministic template rendering produces valid markdown**
    - **Property 3: Missing optional fields are omitted, never placeholders**
    - **Property 4: User terminology is preserved verbatim**
    - **Validates: Requirements 1.2, 1.3, 1.4**

- [x] 5. Implement template registry
  - [x] 5.1 Create template registry with target-based lookup
    - Create `src/features/document-generation/lib/template-registry.ts`
    - Define `TemplateDefinition` interface with `templateId`, `filePath`, `target`, `required`, `render`, `isApplicable`
    - Implement `getTemplatesForTarget(target: TargetOutput): TemplateDefinition[]`
    - Register all Kiro, Copilot, and shared templates
    - "Both" returns the union of Kiro and Copilot template sets
    - Each optional template has an `isApplicable` guard checking relevant knowledge model fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 5.2 Write property tests for template registry
    - **Property 6: "Both" target is a superset of individual targets**
    - **Property 7: Optional template applicability**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 6. Checkpoint - Ensure all pure logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement AI refiner
  - [x] 7.1 Create AI refiner module
    - Create `src/features/document-generation/lib/ai-refiner.ts`
    - Implement `refineDocument(draft, providerConfig): Promise<RefineResult>`
    - Use existing `sendChat` from provider adapter layer with a system prompt instructing clarity improvement without fact alteration
    - On provider error, return `{ refined: draft, wasRefined: false, error: "..." }`
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 7.2 Write property test: draft content is always stored
    - **Property 8: Draft content is always stored**
    - **Validates: Requirements 3.1, 3.4, 9.4**

- [x] 8. Implement server actions
  - [x] 8.1 Create generateAllDocuments server action
    - Create `src/features/document-generation/actions/generate-documents.ts`
    - Validate input with Zod schema
    - Call `assembleKnowledgeModel`, `getTemplatesForTarget`, render each applicable template
    - Optionally refine via AI refiner if provider is configured
    - Upsert each `GeneratedDocument` by `(projectId, filePath)`, storing both `draftContent` and `content`
    - Reset `manuallyEdited` to false on regenerated documents
    - Return `GenerateResult` with document list, warnings, and completeness summary
    - _Requirements: 1.1, 1.2, 6.1, 6.5, 9.1, 9.3_

  - [x] 8.2 Create generateSingleDocument server action
    - Create `src/features/document-generation/actions/generate-single-document.ts`
    - Validate input with Zod schema
    - Regenerate only the specified document by `filePath`, leaving all others unchanged
    - Upsert the single `GeneratedDocument` record
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 8.3 Create saveDocumentEdit server action
    - Create `src/features/document-generation/actions/save-document-edit.ts`
    - Validate input with Zod schema
    - Update the `GeneratedDocument` content and set `manuallyEdited` to true
    - _Requirements: 5.2, 5.3, 8.1_

  - [x] 8.4 Write property tests for server action invariants
    - **Property 9: Manual edit flag state machine**
    - **Property 11: Regenerate-all updates every document in the target set**
    - **Property 12: Single-document regeneration isolation**
    - **Property 13: Regeneration is idempotent on document count**
    - **Property 14: Persisted documents have all required fields**
    - **Validates: Requirements 5.3, 6.1, 6.5, 7.1, 7.3, 7.4, 8.1, 8.3, 9.1, 9.3**

- [x] 9. Checkpoint - Ensure all server action tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement overwrite warning logic
  - [x] 10.1 Create overwrite check utility
    - Create `src/features/document-generation/lib/check-overwrite.ts`
    - Implement `getEditedDocumentsInScope(projectId, filePaths?): Promise<GeneratedDocument[]>` that returns documents with `manuallyEdited === true` in the regeneration scope
    - Used by UI to determine whether to show the overwrite warning dialog
    - _Requirements: 6.2, 7.2, 8.2, 8.4_

  - [x] 10.2 Write property test: overwrite warning condition
    - **Property 10: Overwrite warning is shown if and only if edited documents exist in scope**
    - **Validates: Requirements 6.2, 7.2, 8.2, 8.4**

- [x] 11. Build React UI components
  - [x] 11.1 Create GenerationEmptyState component
    - Create `src/features/document-generation/components/generation-empty-state.tsx`
    - Display guidance prompting the user to trigger generation when no documents exist
    - Show message about provider configuration for AI refinement
    - _Requirements: 10.3, 11.4_

  - [x] 11.2 Create CompletenessSummary component
    - Create `src/features/document-generation/components/completeness-summary.tsx`
    - Display summary counts of complete, partial, and empty documents
    - _Requirements: 10.4_

  - [x] 11.3 Write property test: summary counts are consistent
    - **Property 15: Summary counts are consistent**
    - **Validates: Requirements 10.4**

  - [x] 11.4 Create DocumentListPanel component
    - Create `src/features/document-generation/components/document-list-panel.tsx`
    - Display list of all generated documents for the project
    - Show completeness indicator, last generation timestamp, and target file path for each document
    - Include "Regenerate All" button and per-document "Regenerate" button
    - Integrate `CompletenessSummary` at the top
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 6.1, 7.1_

  - [x] 11.5 Create DocumentPreview component
    - Create `src/features/document-generation/components/document-preview.tsx`
    - Render selected document's markdown content in a read-only preview area
    - Include "Edit" button to switch to editor mode
    - _Requirements: 4.4_

  - [x] 11.6 Create DocumentEditor component
    - Create `src/features/document-generation/components/document-editor.tsx`
    - Provide editable textarea for modifying document content
    - Include "Save" and "Cancel" actions
    - Cancel reverts to last saved version
    - Save calls `saveDocumentEdit` server action
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 11.7 Create OverwriteWarningDialog component
    - Create `src/features/document-generation/components/overwrite-warning-dialog.tsx`
    - Confirmation dialog shown before regeneration overwrites manually edited documents
    - Clearly identify which documents contain manual edits
    - Confirm proceeds with regeneration, cancel aborts
    - _Requirements: 6.2, 6.3, 6.4, 8.2_

- [x] 12. Build documents page route
  - [x] 12.1 Create documents page at /projects/[projectId]/documents
    - Create `src/app/(workspace)/projects/[projectId]/documents/page.tsx`
    - Two-column layout: left `DocumentListPanel`, right `DocumentPreview` or `DocumentEditor`
    - Load existing `GeneratedDocument` records for the project on mount
    - Show `GenerationEmptyState` when no documents exist
    - Wire up regenerate-all and regenerate-single flows with overwrite warning check
    - Display provider configuration message when no provider is set up, but allow template-only generation
    - _Requirements: 4.4, 9.2, 10.3, 11.1, 11.3, 11.4_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after pure logic and server action milestones
- Property tests validate universal correctness properties from the design document
- The workspace navigation already includes a "Documents" link — no nav changes needed
- All templates are pure TypeScript functions, no external templating engine required
- AI refinement is opt-in and gracefully falls back to Layer 1 drafts on provider errors
