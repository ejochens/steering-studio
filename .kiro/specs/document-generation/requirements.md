# Requirements Document

## Introduction

The Document Generation feature enables Steering Studio users to generate, preview, edit, and regenerate markdown steering documents from the canonical project knowledge model. Documents are assembled from structured intake answers and AI-extracted facts using deterministic templates (Layer 1), with optional AI refinement for clarity (Layer 2). The feature lives at the `/projects/[projectId]/documents` route and produces output shaped for the selected target tool (Kiro, Copilot, or Both).

## Glossary

- **Document_Generator**: The server-side module responsible for assembling markdown documents from the canonical knowledge model using templates and optional AI refinement.
- **Document_List_Panel**: The navigable side panel in the documents page that displays all generated documents with metadata.
- **Document_Editor**: The in-browser editing interface that allows users to modify generated markdown before export.
- **Knowledge_Model**: The canonical set of structured project facts derived from intake answers and AI-extracted conversation facts, stored in the database.
- **Template_Renderer**: The deterministic rendering layer that transforms typed knowledge model data into structured markdown sections.
- **AI_Refiner**: The optional second-layer AI module that improves wording and clarity of template-rendered markdown without altering underlying facts.
- **Generated_Document**: A persisted record containing the rendered markdown content, metadata (generation timestamp, template version), and edit tracking state for a single output file.
- **Target_Output**: The user-selected output format for the project: "Kiro", "Copilot", or "Both".
- **Overwrite_Warning**: A confirmation prompt shown to the user before regeneration replaces a document that contains manual edits.
- **Completeness_Indicator**: A visual marker on each document in the list panel showing whether the source knowledge model had sufficient data to fully populate the template.

## Requirements

### Requirement 1: Assemble Documents from Knowledge Model

**User Story:** As a developer, I want documents generated from my structured project data, so that the output reflects confirmed facts rather than freeform AI guesses.

#### Acceptance Criteria

1. WHEN the user triggers document generation, THE Document_Generator SHALL read all confirmed intake answers and accepted review facts for the project from the Knowledge_Model.
2. WHEN the Knowledge_Model contains sufficient data for a template, THE Template_Renderer SHALL produce a complete markdown document using deterministic rendering logic.
3. WHEN the Knowledge_Model is missing data for optional template sections, THE Template_Renderer SHALL omit those sections rather than inserting placeholder text.
4. THE Template_Renderer SHALL preserve user-provided terminology from the Knowledge_Model in the rendered output.
5. IF the Knowledge_Model contains no confirmed data for a required template section, THEN THE Document_Generator SHALL mark the corresponding document with an incomplete completeness status.

### Requirement 2: Target-Specific Document Sets

**User Story:** As an engineering lead, I want documents shaped for my chosen target tool, so that I get output files that match the expected directory structure for Kiro or Copilot.

#### Acceptance Criteria

1. WHEN the project Target_Output is "Kiro", THE Document_Generator SHALL produce at minimum `product.md`, `tech.md`, and `structure.md` with paths under `.kiro/steering/`.
2. WHEN the project Target_Output is "Copilot", THE Document_Generator SHALL produce at minimum `copilot-instructions.md` with path `.github/copilot-instructions.md`.
3. WHEN the project Target_Output is "Both", THE Document_Generator SHALL produce the combined set of documents for Kiro and Copilot targets.
4. WHEN the Knowledge_Model contains sufficient testing data, THE Document_Generator SHALL produce an additional `testing.md` file for the Kiro target.
5. WHEN the Knowledge_Model contains sufficient security data, THE Document_Generator SHALL produce an additional `security.md` file for the Kiro target.
6. WHEN the Knowledge_Model contains sufficient workflow data, THE Document_Generator SHALL produce an additional `workflows.md` file for the Kiro target.
7. WHERE the Copilot target is selected, THE Document_Generator SHALL optionally produce `AGENTS.md` and prompt files under `.github/prompts/` when the Knowledge_Model contains relevant data.

### Requirement 3: Optional AI Refinement

**User Story:** As a developer, I want AI to optionally polish the generated documents, so that the output reads clearly without changing the underlying facts.

#### Acceptance Criteria

1. WHEN document generation is triggered, THE Document_Generator SHALL first produce a Layer 1 template-rendered draft before applying AI refinement.
2. WHEN AI refinement is applied, THE AI_Refiner SHALL improve clarity, remove repetition, and strengthen phrasing of the template-rendered draft.
3. THE AI_Refiner SHALL preserve all factual content from the template-rendered draft without adding, removing, or altering confirmed facts.
4. THE Document_Generator SHALL store the pre-refinement draft alongside the refined version for debugging purposes.
5. IF the AI provider is unavailable or returns an error, THEN THE Document_Generator SHALL use the Layer 1 template-rendered draft as the final output and surface a warning to the user.

### Requirement 4: Document Preview in Side Panel

**User Story:** As a developer, I want to preview all generated documents in a navigable panel, so that I can quickly review the output before editing or exporting.

#### Acceptance Criteria

1. THE Document_List_Panel SHALL display a list of all Generated_Documents for the current project.
2. THE Document_List_Panel SHALL display a Completeness_Indicator for each document showing whether the source data was sufficient.
3. THE Document_List_Panel SHALL display the last generation timestamp for each document.
4. WHEN the user selects a document from the Document_List_Panel, THE documents page SHALL display the full markdown content of the selected document in a preview area.
5. THE Document_List_Panel SHALL display the target file path for each document (e.g., `.kiro/steering/product.md`).

### Requirement 5: In-Browser Document Editing

**User Story:** As a developer, I want to edit generated documents in the browser, so that I can refine the output before exporting without leaving the application.

#### Acceptance Criteria

1. WHEN the user activates edit mode on a previewed document, THE Document_Editor SHALL display the markdown content in an editable text area.
2. WHEN the user saves edits, THE Document_Editor SHALL persist the modified content to the Generated_Document record.
3. WHEN the user saves edits, THE Document_Editor SHALL record that the document has been manually edited.
4. THE Document_Editor SHALL allow the user to cancel editing and revert to the last saved version.

### Requirement 6: Regenerate All Documents

**User Story:** As a developer, I want to regenerate all documents at once after updating my project data, so that the full output set reflects the latest knowledge model.

#### Acceptance Criteria

1. WHEN the user triggers "regenerate all", THE Document_Generator SHALL regenerate every document in the target-specific document set using the current Knowledge_Model.
2. WHEN any of the existing Generated_Documents have been manually edited, THE Overwrite_Warning SHALL prompt the user for confirmation before proceeding with regeneration.
3. WHEN the user confirms the Overwrite_Warning, THE Document_Generator SHALL replace all existing Generated_Documents with newly generated versions.
4. WHEN the user cancels the Overwrite_Warning, THE Document_Generator SHALL abort the regeneration and preserve existing documents unchanged.
5. WHEN regeneration completes, THE Document_Generator SHALL update the generation timestamp on each regenerated document.

### Requirement 7: Regenerate Single Document

**User Story:** As a developer, I want to regenerate one specific document without affecting the others, so that I can refresh a single file after targeted data changes.

#### Acceptance Criteria

1. WHEN the user triggers regeneration for a single document, THE Document_Generator SHALL regenerate only the selected document using the current Knowledge_Model.
2. WHEN the selected document has been manually edited, THE Overwrite_Warning SHALL prompt the user for confirmation before proceeding.
3. WHEN single-document regeneration completes, THE Document_Generator SHALL update the generation timestamp on the regenerated document only.
4. THE Document_Generator SHALL leave all other Generated_Documents unchanged during single-document regeneration.

### Requirement 8: Overwrite Protection for Manual Edits

**User Story:** As a developer, I want to be warned before regeneration overwrites my manual edits, so that I do not accidentally lose work.

#### Acceptance Criteria

1. THE Document_Generator SHALL track whether each Generated_Document has been manually edited since its last generation.
2. WHEN regeneration targets a document that has been manually edited, THE Overwrite_Warning SHALL clearly identify which documents contain manual edits.
3. WHEN the user confirms the Overwrite_Warning, THE Document_Generator SHALL clear the manual-edit flag on the regenerated document.
4. IF no documents in the regeneration scope have been manually edited, THEN THE Document_Generator SHALL proceed without showing the Overwrite_Warning.

### Requirement 9: Persist Generated Documents

**User Story:** As a developer, I want generated documents saved to the database, so that I can return to the documents page later and see my previously generated output.

#### Acceptance Criteria

1. WHEN document generation completes, THE Document_Generator SHALL persist each Generated_Document to the database with the project association, file path, markdown content, generation timestamp, and template version.
2. WHEN the user navigates to the documents page for a project with existing Generated_Documents, THE documents page SHALL load and display the persisted documents.
3. THE Document_Generator SHALL use stable file paths so that regeneration updates existing records rather than creating duplicate entries.
4. THE Document_Generator SHALL store the pre-refinement draft content alongside the final content for each Generated_Document.

### Requirement 10: Generation Completeness Feedback

**User Story:** As a developer, I want to see which documents are fully populated and which have gaps, so that I know whether to go back and add more project data.

#### Acceptance Criteria

1. THE Completeness_Indicator SHALL reflect one of the following states for each document: "complete", "partial", or "empty".
2. WHEN a document is marked "partial", THE Document_List_Panel SHALL indicate which knowledge model sections were missing or insufficient.
3. WHEN no documents have been generated yet, THE documents page SHALL display guidance prompting the user to trigger generation.
4. THE documents page SHALL display a summary count of complete, partial, and empty documents.

### Requirement 11: Documents Page Route and Navigation

**User Story:** As a developer, I want to access the documents page from the project workspace navigation, so that document generation fits naturally into the project workflow.

#### Acceptance Criteria

1. THE documents page SHALL be accessible at the route `/projects/[projectId]/documents` within the workspace layout.
2. THE workspace navigation SHALL include a "Documents" link that routes to the documents page.
3. WHEN the user navigates to the documents page, THE documents page SHALL load within the existing project workspace layout with breadcrumb and sub-navigation intact.
4. WHILE no provider connection is configured, THE documents page SHALL display a message directing the user to configure a provider before AI refinement can be used, but SHALL allow template-only generation.
