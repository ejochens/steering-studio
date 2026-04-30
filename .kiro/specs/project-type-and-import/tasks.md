# Implementation Plan: Project Type and Import

## Overview

This plan implements the document import and AI extraction pipeline for extension projects. The implementation proceeds bottom-up: schema and validation first, then pure transformation modules, then server actions, then UI, then integration points. Each task is small and traceable to specific requirements.

## Tasks

- [x] 1. Database schema and Prisma generation
  - [x] 1.1 Add UploadedDocument model to Prisma schema
    - Add the `UploadedDocument` model to `prisma/schema.prisma` with fields: `id`, `projectId`, `filename`, `content`, `createdAt`
    - Add `onDelete: Cascade` relation from `UploadedDocument` to `Project`
    - Add `uploadedDocuments UploadedDocument[]` relation field to the `Project` model
    - Run `npx prisma db push` and `npx prisma generate` to apply the schema and regenerate the client
    - _Requirements: 3.1, 3.2_

- [x] 2. Validation schemas
  - [x] 2.1 Create upload validation schemas in `src/lib/validation/upload.ts`
    - Define `uploadDocumentsSchema` validating `projectId` (non-empty string) and `files` array (1–20 items, each with `filename` matching `.md` or `.markdown` extension and non-empty `content`)
    - Define `extractionResponseSchema` re-exporting `aiResponseSchema` from intake validation
    - Export inferred types `UploadDocumentsInput`
    - _Requirements: 13.1, 13.2, 3.3, 3.5_

  - [x] 2.2 Re-export upload schemas from the validation barrel file `src/lib/validation/index.ts`
    - Add exports for `uploadDocumentsSchema`, `extractionResponseSchema`, and `UploadDocumentsInput`
    - _Requirements: 13.3_

  - [x] 2.3 Write property test for upload validation schema
    - **Property 2: Upload validation schema accepts valid inputs and rejects invalid ones**
    - **Validates: Requirements 2.5, 2.6, 3.3, 13.1**
    - Test file: `src/lib/validation/__tests__/upload.pbt.test.ts`
    - Use `fast-check` to generate random filenames (valid/invalid extensions), content strings, and file counts
    - Verify schema accepts valid inputs and rejects invalid ones

- [x] 3. Document parser module
  - [x] 3.1 Implement `parseDocuments` in `src/features/upload/lib/document-parser.ts`
    - Accept an array of `{ filename, content }` objects
    - Strip YAML front matter (content between `---` delimiters at the start of each document)
    - Concatenate documents with boundary markers: `\n\n--- Document: {filename} ---\n\n`
    - Preserve markdown headings, lists, and code blocks
    - Truncate combined payload to 100,000 characters and append truncation notice if exceeded
    - Return `{ text, truncated, documentCount }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Write property tests for document parser
    - **Property 3: Document parser preserves all document content with boundary markers**
    - **Property 4: Document parser strips YAML front matter**
    - **Property 5: Document parser truncation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    - Test file: `src/features/upload/lib/__tests__/document-parser.pbt.test.ts`
    - Use `fast-check` to generate random documents with filenames and markdown content

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Import extraction prompt builder
  - [x] 5.1 Implement `buildImportExtractionPrompt` in `src/lib/ai/prompts/import-extraction.ts`
    - Accept `documentPayload` (string) and `fieldDefinitions` (`IntakeSectionDef[]`) as parameters
    - Return a `ChatMessage[]` array
    - System message includes all section keys, field keys, labels, and help text from the intake configuration
    - Instruct the AI to return JSON in `{ sectionKey: { fieldKey: value } }` format
    - Instruct the AI to only extract explicitly stated or strongly implied facts
    - Instruct the AI to use exact field/section keys from the intake configuration
    - Instruct the AI to return empty strings for fields with no relevant information
    - User message includes the parsed document payload
    - _Requirements: 5.2, 5.3, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 5.2 Write property test for import extraction prompt builder
    - **Property 6: Extraction prompt builder includes all intake field definitions and document payload**
    - **Validates: Requirements 5.2, 5.3, 12.2, 12.3, 12.4, 12.5**
    - Test file: `src/lib/ai/prompts/__tests__/import-extraction.pbt.test.ts`
    - Use `fast-check` to generate random document payloads, verify all section/field keys present in output

- [x] 6. Import extractor module
  - [x] 6.1 Implement `extractFacts` in `src/features/upload/lib/import-extractor.ts`
    - Build extraction prompt using `buildImportExtractionPrompt`
    - Call `ProviderAdapter.sendChat` with the prompt
    - Strip markdown code fences from the AI response before parsing JSON
    - Parse JSON and validate against `aiResponseSchema`
    - Filter results to only valid section/field keys from `INTAKE_SECTIONS`
    - Return `{ success, facts, error }`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 6.2 Write property test for extraction response filtering
    - **Property 7: Extraction response filtering discards invalid keys**
    - **Validates: Requirements 5.5**
    - Test file: `src/features/upload/lib/__tests__/import-extractor.pbt.test.ts`
    - Use `fast-check` to generate response objects with random valid and invalid section/field keys

- [x] 7. Server actions
  - [x] 7.1 Implement `uploadDocuments` server action in `src/features/upload/actions/upload-documents.ts`
    - Validate input with `uploadDocumentsSchema`
    - If existing `UploadedDocument` records exist for the project, delete them and all `ai-suggested` Answer rows in a transaction
    - Create `UploadedDocument` rows in a single transaction
    - Revalidate the project path
    - Return `{ success, error?, documentCount? }`
    - _Requirements: 3.3, 3.4, 3.5, 8.2, 8.3_

  - [x] 7.2 Implement `extractImportedFacts` server action in `src/features/upload/actions/extract-imported-facts.ts`
    - Load `UploadedDocument` records for the project
    - Load `ProviderConnection` (return error if not configured)
    - Call `DocumentParser.parseDocuments()` to normalize documents
    - Call `ImportExtractor.extractFacts()` with parsed payload
    - Persist valid facts as `ai-suggested` Answer rows, skipping fields with existing user-confirmed answers (source `user-form` or `ai-conversation`)
    - Recalculate coverage for affected IntakeSections using `calculateCoverage`
    - Revalidate the intake path
    - Return `{ success, error?, factCount?, sectionsAffected? }`
    - _Requirements: 5.1, 5.4, 5.7, 6.1, 6.2, 6.3_

  - [x] 7.3 Write unit tests for fact persistence logic (skipping user-confirmed answers)
    - **Property 8: Extracted facts do not overwrite user-confirmed answers**
    - **Validates: Requirements 6.1, 6.2**
    - Test file: `src/features/upload/lib/__tests__/import-extractor.pbt.test.ts`
    - Use `fast-check` to generate fact sets with overlapping pre-existing confirmed answers

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Upload page route and component
  - [x] 9.1 Create upload page route at `src/app/(workspace)/projects/[projectId]/upload/page.tsx`
    - Server component that loads the project and checks `projectType === "extension" && hasExistingDocs === true`
    - Redirect to `/projects/[projectId]/intake` if conditions are not met
    - Load existing `UploadedDocument` records to show previously uploaded files
    - Render the `UploadForm` client component
    - Display guidance text explaining supported file types and what the system will do
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1_

  - [x] 9.2 Implement `UploadForm` client component in `src/features/upload/components/upload-form.tsx`
    - File picker restricted to `.md` / `.markdown` extensions
    - Drag-and-drop zone for file selection
    - Display list of selected filenames with individual remove actions before confirming upload
    - Client-side validation: reject files > 500 KB, reject > 20 files
    - Read files as text via `FileReader` and send to `uploadDocuments` server action
    - After upload, call `extractImportedFacts` server action
    - Display progress states: "Uploading files..." and "Analyzing documents..."
    - Display extraction summary (fact count, sections affected) on success
    - Display error message with "Retry" button on failure
    - "Continue to Intake" button navigating to `/projects/[projectId]/intake`
    - "Skip" link navigating to `/projects/[projectId]/intake` without extraction
    - Show previously uploaded filenames with "Replace all" option when documents already exist
    - Handle file read errors by identifying the problematic file and excluding it
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.4, 14.1, 14.2, 14.3, 14.4_

  - [x] 9.3 Write property test for upload access control predicate
    - **Property 1: Upload access control predicate**
    - **Validates: Requirements 1.2, 1.3**
    - Test file: `src/features/upload/lib/__tests__/access-control.pbt.test.ts`
    - Use `fast-check` to generate random `{ projectType, hasExistingDocs }` combinations

- [x] 10. Extension prompt adapter
  - [x] 10.1 Implement extension prompt adapter in `src/lib/ai/prompts/extension-prompt-adapter.ts`
    - `adaptIntakePromptForExtension(messages, uploadedDocumentSummary?)` — wraps `buildIntakeAnswerPrompt` output
    - `adaptSectionPromptForExtension(messages, uploadedDocumentSummary?)` — wraps `buildSectionAnswerPrompt` output
    - Prepend extension context to system message: frame suggestions around changes, additions, and overrides
    - If uploaded documents exist, append summary of uploaded document content as additional context
    - Preserve existing JSON response format instructions for compatibility
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 10.2 Write property test for extension prompt adapter
    - **Property 10: Extension prompt adapter injects extension context while preserving format**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
    - Test file: `src/lib/ai/prompts/__tests__/extension-prompt-adapter.pbt.test.ts`
    - Use `fast-check` to generate random `ChatMessage[]` arrays and document summaries

- [x] 11. Setup checklist integration
  - [x] 11.1 Modify project overview page at `src/app/(workspace)/projects/[projectId]/page.tsx`
    - When `projectType === "extension" && hasExistingDocs === true`, insert an "Upload Documents" step between "Project created" and "Intake started"
    - Query for `UploadedDocument` count to determine step completion
    - Step links to `/projects/[projectId]/upload`
    - When conditions are not met, omit the step entirely
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 11.2 Write property test for checklist conditional step
    - **Property 11: Setup checklist conditionally includes upload step**
    - **Validates: Requirements 11.1, 11.2, 11.4**
    - Test file: `src/app/(workspace)/projects/[projectId]/__tests__/checklist.pbt.test.ts`
    - Use `fast-check` to generate random project configs and document counts

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Wire intake actions for extension projects
  - [x] 13.1 Integrate extension prompt adapter into existing intake answer generation actions
    - Modify `generate-all-answers.ts` and `generate-section-answers.ts` to detect extension projects
    - When `projectType === "extension"`, load uploaded document content and call the extension prompt adapter before sending to the AI
    - Preserve existing behavior for `projectType === "new"`
    - _Requirements: 9.1, 9.3, 10.1, 10.4_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Requirement 10 (extension-aware document generation) is deferred — the document generation pipeline does not yet exist in the codebase; it will be addressed when that feature is built
- The existing intake UI already handles `ai-suggested` answers with accept/dismiss controls (Requirements 6.4, 6.5, 6.6), so no intake UI changes are needed
