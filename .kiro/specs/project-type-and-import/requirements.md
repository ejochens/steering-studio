# Requirements Document

## Introduction

This feature adds the document import and AI analysis pipeline to Steering Studio. When a user creates an "extension" project with "has existing docs" enabled, the system allows them to upload existing steering/context markdown files, extracts structured facts from those files using the AI provider, and pre-fills the intake form with the extracted values. The intake experience adapts to extension projects by framing prompts around "what's changing?" rather than "what are you building?". Document generation incorporates both existing context and new changes.

The project type dropdown, "has existing docs" toggle, schema fields, and validation are already implemented. This spec covers the pipeline from upload through extraction to pre-filled intake and extension-aware generation.

## Glossary

- **Upload_Page**: A UI page rendered at `/projects/[projectId]/upload` where the user selects and uploads markdown files for analysis. Displayed when `projectType` is "extension" and `hasExistingDocs` is true.
- **Uploaded_Document**: A database record representing a single uploaded markdown file, storing the original filename and raw text content, linked to a Project.
- **Document_Parser**: A server-side module that reads raw markdown content from Uploaded_Document records and normalizes it into a single text payload suitable for AI extraction.
- **Import_Extractor**: A server-side module that sends parsed document content to the AI provider with a structured extraction prompt and receives key-value facts mapped to intake section fields.
- **Extracted_Fact**: A single key-value pair produced by the Import_Extractor, mapped to a specific intake section key and field key.
- **Provider_Adapter**: The existing server-side abstraction (`ProviderAdapter` interface) that normalizes AI provider calls across OpenAI and Azure OpenAI backends.
- **Intake_Form**: The existing guided intake UI at `/projects/[projectId]/intake` that displays sections and fields with per-field accept/dismiss controls for AI-suggested content.
- **Canonical_Model**: The set of Answer rows in the database that represent the authoritative project knowledge. Source values include "user-form", "ai-inferred", "ai-conversation", and "ai-suggested".
- **Coverage_Calculator**: The existing module (`calculate-coverage.ts`) that computes section coverage status based on required field answers.
- **Extension_Prompt_Adapter**: A server-side module that modifies AI prompts for extension projects to focus on changes and additions rather than greenfield definitions.

## Requirements

### Requirement 1: Upload Page Routing and Access Control

**User Story:** As a user with an extension project, I want a dedicated upload step so that I can provide my existing context documents before starting intake.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[projectId]/upload`, THE Upload_Page SHALL render within the existing workspace layout with project sub-navigation visible.
2. WHEN the project has `projectType` equal to "new" or `hasExistingDocs` equal to false, THE Upload_Page SHALL redirect the user to `/projects/[projectId]/intake`.
3. WHEN the project has `projectType` equal to "extension" and `hasExistingDocs` equal to true, THE Upload_Page SHALL display the file upload interface.
4. THE Upload_Page SHALL display guidance text explaining which file types are supported and what the system will do with the uploaded files.

### Requirement 2: Markdown File Upload

**User Story:** As a user, I want to upload one or more markdown files from my existing project so that the system can extract context from them.

#### Acceptance Criteria

1. THE Upload_Page SHALL provide a file picker that accepts files with `.md` and `.markdown` extensions.
2. THE Upload_Page SHALL allow the user to select multiple files in a single upload action.
3. THE Upload_Page SHALL allow the user to drag and drop files onto a drop zone as an alternative to the file picker.
4. WHEN files are selected, THE Upload_Page SHALL display a list of selected filenames with individual remove actions before the user confirms the upload.
5. THE Upload_Page SHALL reject files larger than 500 KB each and display a validation message identifying the oversized file.
6. THE Upload_Page SHALL reject uploads containing more than 20 files and display a validation message stating the limit.
7. WHEN the user confirms the upload, THE Upload_Page SHALL read each file as text on the client and send the filename and content to a server action for persistence.

### Requirement 3: Uploaded Document Persistence

**User Story:** As a developer, I want uploaded documents stored in the database so that extraction can run server-side and documents can be re-processed if needed.

#### Acceptance Criteria

1. THE database schema SHALL include an UploadedDocument model with fields: `id`, `projectId` (foreign key to Project), `filename` (string), `content` (text), `createdAt`.
2. WHEN a Project is deleted, THE database SHALL cascade-delete all associated UploadedDocument records.
3. WHEN the user confirms an upload, THE server action SHALL validate that each file has a `.md` or `.markdown` extension and non-empty content.
4. WHEN the user confirms an upload, THE server action SHALL create one UploadedDocument record per file within a single database transaction.
5. THE server action SHALL validate all inputs using a Zod schema before persisting.

### Requirement 4: Document Parsing and Normalization

**User Story:** As a developer, I want uploaded markdown normalized into a consistent format so that the AI extraction prompt receives clean input.

#### Acceptance Criteria

1. THE Document_Parser SHALL concatenate all UploadedDocument records for a project into a single text payload, separated by a document boundary marker that includes the original filename.
2. THE Document_Parser SHALL strip front matter (YAML between `---` delimiters) from each document before concatenation.
3. THE Document_Parser SHALL preserve markdown headings, lists, and code blocks as-is so the AI can interpret document structure.
4. THE Document_Parser SHALL truncate the combined payload to 100,000 characters and append a truncation notice if the limit is exceeded.

### Requirement 5: AI Fact Extraction from Uploaded Documents

**User Story:** As a user, I want the system to automatically extract structured facts from my uploaded documents so that I do not have to re-enter information manually.

#### Acceptance Criteria

1. WHEN all files are persisted, THE Upload_Page SHALL automatically trigger the Import_Extractor via a server action.
2. THE Import_Extractor SHALL construct a prompt that includes the parsed document payload and the full list of intake section keys and field keys with their labels and help text.
3. THE Import_Extractor SHALL instruct the AI to return a JSON object mapping section keys to field key-value pairs, using the same keys defined in the intake configuration.
4. THE Import_Extractor SHALL call the Provider_Adapter `sendChat` method server-side, loading and decrypting the ProviderConnection credentials on the server.
5. THE Import_Extractor SHALL validate the AI response against the known section keys and field keys, discarding entries that do not match valid keys.
6. THE Import_Extractor SHALL strip markdown code fences from the AI response before parsing JSON.
7. IF no ProviderConnection is configured, THEN THE Import_Extractor SHALL return an error indicating that a provider must be configured in Settings.
8. IF the AI returns invalid JSON, THEN THE Import_Extractor SHALL return an error message and allow the user to retry extraction.

### Requirement 6: Pre-fill Intake with Extracted Facts

**User Story:** As a user, I want extracted facts to appear as suggestions in my intake form so that I can review and accept them using the existing accept/dismiss pattern.

#### Acceptance Criteria

1. WHEN the Import_Extractor returns valid Extracted_Fact entries, THE server action SHALL persist each fact as an Answer row with source "ai-suggested".
2. THE server action SHALL only create Answer rows for fields that do not already have a user-confirmed answer (source "user-form" or "ai-conversation").
3. WHEN Answer rows with source "ai-suggested" are created, THE server action SHALL recalculate the coverage status for each affected IntakeSection using the Coverage_Calculator.
4. WHEN the user navigates to the intake page, THE Intake_Form SHALL display "ai-suggested" answers with the existing per-field accept/dismiss controls.
5. WHEN the user accepts an "ai-suggested" answer, THE Intake_Form SHALL update the Answer source to "ai-inferred" using the existing `acceptFieldSuggestion` action.
6. WHEN the user dismisses an "ai-suggested" answer, THE Intake_Form SHALL delete the Answer row using the existing `cancelFieldSuggestion` action.

### Requirement 7: Upload Status and Progress Feedback

**User Story:** As a user, I want to see clear progress during upload and extraction so that I know what the system is doing and when it is ready.

#### Acceptance Criteria

1. WHILE files are being uploaded to the server, THE Upload_Page SHALL display a progress indicator with the text "Uploading files...".
2. WHILE the Import_Extractor is processing, THE Upload_Page SHALL display a progress indicator with the text "Analyzing documents...".
3. WHEN extraction completes successfully, THE Upload_Page SHALL display a summary showing the number of facts extracted and the number of intake sections affected.
4. WHEN extraction completes successfully, THE Upload_Page SHALL provide a "Continue to Intake" button that navigates to `/projects/[projectId]/intake`.
5. WHEN extraction fails, THE Upload_Page SHALL display the error message and provide a "Retry" button.
6. THE Upload_Page SHALL provide a "Skip" link that navigates to `/projects/[projectId]/intake` without running extraction, allowing the user to proceed with an empty intake.

### Requirement 8: Re-upload and Replace

**User Story:** As a user, I want to re-upload documents if I selected the wrong files so that I can correct mistakes without creating a new project.

#### Acceptance Criteria

1. WHEN UploadedDocument records already exist for the project, THE Upload_Page SHALL display the list of previously uploaded filenames with an option to replace all files.
2. WHEN the user chooses to replace files, THE server action SHALL delete all existing UploadedDocument records for the project within a transaction before inserting the new records.
3. WHEN the user replaces files, THE server action SHALL delete all Answer rows with source "ai-suggested" for the project so stale suggestions do not persist.
4. WHEN the user replaces files and re-extraction completes, THE Upload_Page SHALL display the updated extraction summary.

### Requirement 9: Extension-Aware Intake Prompts

**User Story:** As a user extending an existing project, I want intake prompts that focus on what is changing rather than asking me to define everything from scratch.

#### Acceptance Criteria

1. WHEN the project has `projectType` equal to "extension", THE Extension_Prompt_Adapter SHALL modify the AI intake answer generation prompts to include context that the user is extending an existing project.
2. THE Extension_Prompt_Adapter SHALL instruct the AI to frame suggestions around changes, additions, and overrides rather than greenfield definitions.
3. WHEN the project has uploaded documents, THE Extension_Prompt_Adapter SHALL include a summary of the uploaded document content as additional context in intake answer generation prompts.
4. THE Extension_Prompt_Adapter SHALL preserve the existing prompt structure and JSON response format so that existing validation and persistence logic remains compatible.

### Requirement 10: Extension-Aware Document Generation

**User Story:** As a user, I want generated steering documents to incorporate both my existing context and the new changes so that the output is a complete, updated context pack.

#### Acceptance Criteria

1. WHEN generating documents for an extension project with uploaded documents, THE document generation pipeline SHALL include the uploaded document content as baseline context.
2. THE document generation pipeline SHALL instruct the AI to merge existing context with new intake answers, preserving existing guidance that is not contradicted by new answers.
3. THE document generation pipeline SHALL clearly mark sections that represent changes or additions compared to the uploaded baseline when the distinction is meaningful.
4. WHEN generating documents for a "new" project, THE document generation pipeline SHALL use the existing generation behavior with no changes.

### Requirement 11: Project Setup Flow Integration

**User Story:** As a user, I want the project setup checklist to guide me through the upload step when applicable so that I do not miss the import opportunity.

#### Acceptance Criteria

1. WHEN the project has `projectType` equal to "extension" and `hasExistingDocs` equal to true, THE project overview page SHALL include an "Upload Documents" step in the setup checklist between "Project Details" and "Intake".
2. THE "Upload Documents" checklist step SHALL be marked complete when at least one UploadedDocument record exists for the project.
3. THE "Upload Documents" checklist step SHALL link to `/projects/[projectId]/upload`.
4. WHEN the project has `projectType` equal to "new" or `hasExistingDocs` equal to false, THE project overview page SHALL omit the "Upload Documents" step from the checklist.

### Requirement 12: Extraction Prompt Design

**User Story:** As a developer, I want the extraction prompt to be modular and testable so that it can be improved independently of the upload and persistence logic.

#### Acceptance Criteria

1. THE Import_Extractor prompt SHALL be defined in a dedicated module at `src/lib/ai/prompts/import-extraction.ts`, separate from the intake answer generation prompts.
2. THE prompt builder function SHALL accept the parsed document payload and the intake field definitions as parameters and return a `ChatMessage[]` array.
3. THE prompt SHALL instruct the AI to return only facts that are explicitly stated or strongly implied in the uploaded documents, avoiding invention of details not present in the source material.
4. THE prompt SHALL instruct the AI to use the exact field keys and section keys from the intake configuration.
5. THE prompt SHALL instruct the AI to return empty strings for fields where no relevant information is found in the uploaded documents rather than omitting the field.

### Requirement 13: Validation Schemas for Upload

**User Story:** As a developer, I want all upload-related data validated with Zod schemas so that the persistence boundary is type-safe and consistent with the rest of the application.

#### Acceptance Criteria

1. THE validation layer SHALL include a Zod schema for the upload server action input, validating `projectId`, and an array of file objects each containing `filename` (string, ending in `.md` or `.markdown`) and `content` (non-empty string).
2. THE validation layer SHALL include a Zod schema for the Import_Extractor AI response, reusing the existing `aiResponseSchema` pattern that maps section keys to field key-value pairs.
3. THE validation schemas SHALL be defined in `src/lib/validation/upload.ts` and re-exported from the validation barrel file.

### Requirement 14: Error Handling

**User Story:** As a user, I want clear feedback when something goes wrong during upload or extraction so that I can take corrective action.

#### Acceptance Criteria

1. IF no ProviderConnection is configured when extraction is triggered, THEN THE Upload_Page SHALL display a message directing the user to configure a provider in Settings, with a link to the provider settings page.
2. IF the Provider_Adapter call fails due to a network or API error, THEN THE Upload_Page SHALL display the error message and provide a "Retry" button that re-triggers extraction using the already-persisted documents.
3. IF a file cannot be read as text on the client, THEN THE Upload_Page SHALL display an error identifying the problematic file and exclude it from the upload.
4. IF the server action fails during document persistence, THEN THE Upload_Page SHALL display an error message and allow the user to retry the upload.
