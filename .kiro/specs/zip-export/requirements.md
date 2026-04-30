# Requirements Document

## Introduction

The ZIP Export feature is the final step in the Steering Studio workflow. After a user has completed intake, reviewed their project with the AI assistant, and generated markdown steering documents, the export page lets them package those documents into a ZIP file and download it via the browser. The user then manually extracts the ZIP into their target repository root.

The export page lives at `/projects/[projectId]/export` within the existing workspace layout. It validates that required documents exist and are non-empty, surfaces warnings for incomplete or missing content, lets the user choose an export scope, and triggers a standard browser file download of a ZIP archive with the correct directory structure for the selected target.

## Glossary

- **Export_Page**: The page at `/projects/[projectId]/export` where the user reviews readiness and triggers ZIP downloads.
- **Export_Validator**: The server-side module that checks whether all required Generated_Documents exist, are non-empty, and have correct file paths before allowing export.
- **ZIP_Packager**: The server-side module that assembles Generated_Document content into a ZIP archive with the correct directory structure.
- **Export_Scope**: The user-selected subset of documents to include in the export: "All", "Kiro only", or "Copilot only".
- **Readiness_Report**: A structured summary displayed on the Export_Page showing which documents are ready, which have warnings, and which are missing.
- **Generated_Document**: A persisted record containing rendered markdown content, file path, completeness status, and edit tracking state for a single output file (defined in the document-generation feature).
- **Template_Registry**: The module that returns the set of expected template definitions for a given target output, including which templates are required.
- **Target_Output**: The project-level setting indicating the selected output format: "Kiro", "Copilot", or "Both".

## Requirements

### Requirement 1: Export Page Route and Navigation

**User Story:** As a developer, I want to access the export page from the project workspace navigation, so that exporting fits naturally as the final step in the project workflow.

#### Acceptance Criteria

1. THE Export_Page SHALL be accessible at the route `/projects/[projectId]/export` within the workspace layout.
2. WHEN the user navigates to the Export_Page, THE Export_Page SHALL load within the existing project workspace layout with breadcrumb and sub-navigation intact.
3. WHEN no Generated_Documents exist for the project, THE Export_Page SHALL display guidance prompting the user to generate documents before exporting.

### Requirement 2: Export Scope Selection

**User Story:** As a developer, I want to choose which target's documents to export, so that I can download only the files relevant to my current repository setup.

#### Acceptance Criteria

1. WHEN the project Target_Output is "Both", THE Export_Page SHALL offer three export scope options: "All", "Kiro only", and "Copilot only".
2. WHEN the project Target_Output is "Kiro", THE Export_Page SHALL default the Export_Scope to "Kiro only" and disable scope selection.
3. WHEN the project Target_Output is "Copilot", THE Export_Page SHALL default the Export_Scope to "Copilot only" and disable scope selection.
4. THE Export_Page SHALL default the Export_Scope to "All" when the project Target_Output is "Both".

### Requirement 3: Pre-Export Validation

**User Story:** As a developer, I want the system to verify my documents are complete before export, so that I do not accidentally download an incomplete starter pack.

#### Acceptance Criteria

1. WHEN the user opens the Export_Page, THE Export_Validator SHALL check that every required template for the selected Export_Scope has a corresponding Generated_Document record.
2. WHEN a required Generated_Document is missing, THE Export_Validator SHALL report the missing file path in the Readiness_Report.
3. WHEN a Generated_Document has empty content, THE Export_Validator SHALL report the file path as empty in the Readiness_Report.
4. WHEN a Generated_Document has a completeness status of "partial", THE Export_Validator SHALL include a warning in the Readiness_Report identifying the document and its missing fields.
5. THE Export_Validator SHALL re-run validation when the user changes the Export_Scope.

### Requirement 4: Readiness Report Display

**User Story:** As a developer, I want to see a clear summary of which documents are ready and which have issues, so that I can decide whether to proceed or go back and fix gaps.

#### Acceptance Criteria

1. THE Export_Page SHALL display the Readiness_Report as a list of documents grouped by readiness status: ready, warning, and missing.
2. THE Readiness_Report SHALL show the target file path for each document (e.g., `.kiro/steering/product.md`).
3. WHEN a document has a "partial" completeness status, THE Readiness_Report SHALL display the list of missing fields for that document.
4. THE Readiness_Report SHALL display a summary count of ready, warning, and missing documents.
5. WHEN all required documents are present and non-empty, THE Readiness_Report SHALL indicate that the project is ready for export.
6. WHEN any required documents are missing or empty, THE Readiness_Report SHALL display a link directing the user back to the documents page.

### Requirement 5: ZIP Archive Assembly

**User Story:** As a developer, I want the exported ZIP to contain the correct directory structure, so that I can extract it directly into my repository root.

#### Acceptance Criteria

1. WHEN the user triggers export, THE ZIP_Packager SHALL create a ZIP archive containing each Generated_Document at its defined file path within the archive.
2. THE ZIP_Packager SHALL preserve the full directory structure of each document path (e.g., `.kiro/steering/product.md` appears at that path inside the ZIP).
3. WHEN the Export_Scope is "Kiro only", THE ZIP_Packager SHALL include only documents with file paths belonging to the Kiro target.
4. WHEN the Export_Scope is "Copilot only", THE ZIP_Packager SHALL include only documents with file paths belonging to the Copilot target.
5. WHEN the Export_Scope is "All", THE ZIP_Packager SHALL include documents for all targets in a single ZIP archive.
6. THE ZIP_Packager SHALL use the document content from the Generated_Document record without modification.

### Requirement 6: ZIP Filename Convention

**User Story:** As a developer, I want the ZIP filename to identify the project and target, so that I can distinguish exports in my downloads folder.

#### Acceptance Criteria

1. THE ZIP_Packager SHALL name the ZIP file using the pattern `steering-studio-{project-name}-{scope}.zip` where `{project-name}` is the slugified project name and `{scope}` is the lowercase export scope label.
2. THE ZIP_Packager SHALL replace spaces and special characters in the project name with hyphens and convert to lowercase for the filename slug.
3. WHEN the Export_Scope is "All", THE ZIP_Packager SHALL use "both" as the scope segment in the filename.
4. WHEN the Export_Scope is "Kiro only", THE ZIP_Packager SHALL use "kiro" as the scope segment in the filename.
5. WHEN the Export_Scope is "Copilot only", THE ZIP_Packager SHALL use "copilot" as the scope segment in the filename.

### Requirement 7: Browser Download Trigger

**User Story:** As a developer, I want the export to trigger a standard browser file download, so that I receive the ZIP through my normal download flow.

#### Acceptance Criteria

1. WHEN the user clicks the export button, THE Export_Page SHALL request the ZIP archive from the server and trigger a browser file download.
2. THE Export_Page SHALL display a loading indicator while the ZIP archive is being generated and downloaded.
3. WHEN the ZIP download completes, THE Export_Page SHALL display a success confirmation message.
4. IF the ZIP generation fails on the server, THEN THE Export_Page SHALL display an error message describing the failure.
5. THE Export_Page SHALL disable the export button while a download is in progress to prevent duplicate requests.

### Requirement 8: Sensitive Content Warning

**User Story:** As a developer, I want to be reminded that exported documents may contain sensitive project context, so that I store them appropriately.

#### Acceptance Criteria

1. WHEN the user triggers export, THE Export_Page SHALL display a notice informing the user that the exported documents may contain sensitive project context and should be stored in appropriate repositories only.
2. THE Export_Page SHALL display the sensitive content notice before initiating the download.

### Requirement 9: Export with Warnings Allowed

**User Story:** As a developer, I want to proceed with export even when some documents have warnings, so that I can get a partial starter pack and fill in gaps later.

#### Acceptance Criteria

1. WHEN the Readiness_Report contains warnings but no missing required documents, THE Export_Page SHALL allow the user to proceed with export.
2. WHEN the Readiness_Report contains missing required documents, THE Export_Page SHALL disable the export button and display a message indicating which required documents must be generated first.
3. WHEN the user exports with warnings present, THE Export_Page SHALL include all documents in the selected scope regardless of their completeness status.

### Requirement 10: Export Endpoint

**User Story:** As a developer, I want the ZIP generation to happen server-side via an API route, so that document content is assembled securely without exposing it all to the client.

#### Acceptance Criteria

1. THE ZIP_Packager SHALL be invoked through a server-side API route that accepts the project ID and Export_Scope as parameters.
2. THE API route SHALL validate that the project ID exists and that the requested Export_Scope is valid for the project Target_Output.
3. THE API route SHALL return the ZIP archive as a binary response with the appropriate `Content-Type` and `Content-Disposition` headers for browser download.
4. IF the project ID is invalid, THEN THE API route SHALL return an error response with a descriptive message.
5. IF no documents exist for the requested scope, THEN THE API route SHALL return an error response indicating that no documents are available for export.
