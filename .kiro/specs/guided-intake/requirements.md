# Guided Intake Requirements

## Introduction

The guided intake feature is the primary data-collection surface of Steering Studio. It provides a structured, section-based form experience at `/projects/[projectId]/intake` where users supply the project context that will later drive document generation. The intake page breaks the knowledge-gathering process into eight thematic sections, uses progressive disclosure to avoid overwhelming the user, tracks completeness per section, and stores all answers in a canonical model that both forms and future AI conversation can populate.

## Glossary

- **Intake_Page**: The page rendered at `/projects/[projectId]/intake` that hosts all intake sections and the completeness sidebar.
- **Intake_Section**: One of eight thematic groupings of questions within the intake flow (e.g., "Product and Users", "Tech Stack and Architecture").
- **Intake_Field**: A single input within an Intake_Section. Each field has a label, a type, a status, and an optional help description.
- **Field_Status**: A label indicating the state of an Intake_Field value: `required`, `optional`, `inferred`, or `unresolved`.
- **Section_Coverage**: A per-section completeness state: `unknown`, `partial`, `complete`, `conflicting`, or `user-reviewed`.
- **Canonical_Model**: The typed, structured knowledge model that stores all confirmed project facts. Forms and AI conversation both write to the Canonical_Model.
- **Completeness_Sidebar**: A persistent UI panel on the Intake_Page that shows Section_Coverage for every Intake_Section and highlights missing or unresolved fields.
- **Answer**: A persisted record linking a user-supplied or AI-inferred value to a specific Intake_Field within a project.
- **Server_Action**: A Next.js server action that performs a server-side data mutation.
- **Zod_Schema**: A Zod validation schema used to validate intake data at the persistence boundary.

## Requirements

### Requirement 1: Intake page route and layout

**User Story:** As a user, I want to navigate to the intake page from the project workspace so I can begin supplying project context.

#### Acceptance Criteria

1. WHEN the user clicks the "Intake" link in the workspace sub-navigation, THE Intake_Page SHALL render at `/projects/[projectId]/intake`.
2. WHEN the Intake_Page loads, THE Intake_Page SHALL display the list of all eight Intake_Sections with their names and current Section_Coverage.
3. WHEN the Intake_Page loads for a project with no saved Answers, THE Intake_Page SHALL default to the first Intake_Section ("Product and Users") in an expanded or active state.
4. WHEN the user is on the Intake_Page, THE Intake_Page SHALL display the Completeness_Sidebar alongside the active section content.

### Requirement 2: Intake section definitions

**User Story:** As a user, I want the intake process broken into clear thematic sections so I can focus on one topic at a time without being overwhelmed.

#### Acceptance Criteria

1. THE Intake_Page SHALL present exactly eight Intake_Sections in the following order: "Product and Users", "Problem and Outcomes", "Scope and Non-Goals", "Tech Stack and Architecture", "Project Structure and Conventions", "Testing and Quality", "Security and Compliance", "Workflows and Team Practices".
2. WHEN an Intake_Section is displayed, THE Intake_Section SHALL show a descriptive heading and a short explanation of what information the section collects and why it matters.
3. WHEN an Intake_Section contains Intake_Fields, THE Intake_Section SHALL render each Intake_Field with its label, input control, help text, and current Field_Status indicator.

### Requirement 3: Progressive disclosure of sections

**User Story:** As a user, I want to see only the section I am working on so the intake process feels manageable rather than overwhelming.

#### Acceptance Criteria

1. WHEN the Intake_Page loads, THE Intake_Page SHALL show only one Intake_Section expanded at a time.
2. WHEN the user completes or skips the active Intake_Section, THE Intake_Page SHALL expand the next Intake_Section in order.
3. WHEN the user clicks on a collapsed Intake_Section header, THE Intake_Page SHALL expand that section and collapse the previously active section.
4. WHEN an Intake_Section is collapsed, THE Intake_Page SHALL display the section name and its current Section_Coverage as a summary.

### Requirement 4: Intake field types and controls

**User Story:** As a user, I want appropriate input controls for each question so I can provide answers efficiently and accurately.

#### Acceptance Criteria

1. THE Intake_Page SHALL support the following Intake_Field input types: short text, long text, single select, multi-select, and tag list.
2. WHEN an Intake_Field is of type "long text", THE Intake_Page SHALL render a multi-line text area with a minimum height of three rows.
3. WHEN an Intake_Field is of type "single select", THE Intake_Page SHALL render a dropdown or radio group with predefined options.
4. WHEN an Intake_Field is of type "multi-select" or "tag list", THE Intake_Page SHALL allow the user to select or enter multiple values.

### Requirement 5: Field status indicators

**User Story:** As a user, I want to see which fields are required, optional, inferred, or unresolved so I know where to focus my effort.

#### Acceptance Criteria

1. WHEN an Intake_Field is rendered, THE Intake_Page SHALL display the Field_Status as a visible label or badge next to the field.
2. WHEN an Intake_Field has Field_Status "required" and no value, THE Intake_Page SHALL visually distinguish the field as incomplete using a high-contrast indicator that does not rely on color alone.
3. WHEN an Intake_Field has Field_Status "inferred", THE Intake_Page SHALL display the inferred value as pre-filled and editable, with a label indicating the value was AI-inferred.
4. WHEN the user edits an Intake_Field with Field_Status "inferred", THE Intake_Page SHALL change the Field_Status to "required" or "optional" (matching the field definition) and persist the user-supplied value as the authoritative answer.

### Requirement 6: Section completeness tracking

**User Story:** As a user, I want to see how complete each section is so I know what is left before I can generate documents.

#### Acceptance Criteria

1. THE Completeness_Sidebar SHALL display each Intake_Section name alongside its current Section_Coverage value.
2. WHEN all required Intake_Fields in an Intake_Section have confirmed values, THE Completeness_Sidebar SHALL set that section's Section_Coverage to `complete`.
3. WHEN some but not all required Intake_Fields in an Intake_Section have values, THE Completeness_Sidebar SHALL set that section's Section_Coverage to `partial`.
4. WHEN no Intake_Fields in an Intake_Section have values, THE Completeness_Sidebar SHALL set that section's Section_Coverage to `unknown`.
5. WHEN the user clicks an Intake_Section name in the Completeness_Sidebar, THE Intake_Page SHALL scroll to and expand that section.
6. THE Completeness_Sidebar SHALL use text labels or icons in addition to color to communicate Section_Coverage, so the indicator does not rely on color alone.

### Requirement 7: Answer persistence

**User Story:** As a user, I want my answers saved automatically so I do not lose work if I navigate away or close the browser.

#### Acceptance Criteria

1. WHEN the user changes the value of an Intake_Field and the field loses focus, THE Intake_Page SHALL persist the Answer to the database via a Server_Action.
2. WHEN the user returns to the Intake_Page for a project with saved Answers, THE Intake_Page SHALL restore all previously saved values into the corresponding Intake_Fields.
3. WHEN a Server_Action persists an Answer, THE Server_Action SHALL validate the value against the Intake_Field's Zod_Schema before writing to the database.
4. IF a Server_Action receives an invalid Answer value, THEN THE Server_Action SHALL return a validation error and THE Intake_Page SHALL display the error message next to the corresponding Intake_Field.

### Requirement 8: Canonical model population

**User Story:** As a developer, I want form answers to populate the same canonical knowledge model that AI conversation will later use, so all project facts live in one place.

#### Acceptance Criteria

1. WHEN an Answer is persisted, THE Server_Action SHALL write the value to the Canonical_Model for the project, keyed by Intake_Section and Intake_Field identifiers.
2. THE Canonical_Model SHALL store each fact with its source attribution: "user-form", "ai-inferred", or "ai-conversation".
3. WHEN a user-form Answer conflicts with an existing AI-inferred value for the same field, THE Canonical_Model SHALL replace the AI-inferred value with the user-form value.
4. THE Canonical_Model SHALL be queryable by section to support completeness calculations and downstream document generation.

### Requirement 9: Data model for intake

**User Story:** As a developer, I want database models for intake sections and answers so the intake feature has stable persistence.

#### Acceptance Criteria

1. THE database schema SHALL include an IntakeSection model with at least: id, projectId (foreign key to Project), sectionKey (unique per project), displayName, sortOrder, and coverageStatus.
2. THE database schema SHALL include an Answer model with at least: id, intakeSectionId (foreign key to IntakeSection), fieldKey, value (stored as text or JSON), source ("user-form", "ai-inferred", "ai-conversation"), and timestamps (createdAt, updatedAt).
3. THE database schema SHALL enforce a unique constraint on (projectId, sectionKey) for IntakeSection and on (intakeSectionId, fieldKey) for Answer.
4. WHEN a new project enters the intake phase, THE system SHALL create the eight IntakeSection records for that project with Section_Coverage set to `unknown`.

### Requirement 10: Intake validation schemas

**User Story:** As a developer, I want Zod schemas for all intake mutations so data integrity is enforced at the boundary.

#### Acceptance Criteria

1. THE system SHALL define a Zod_Schema for each Intake_Section that validates the expected fields, types, and constraints for that section.
2. THE system SHALL define a Zod_Schema for the save-answer Server_Action input that validates projectId, sectionKey, fieldKey, and value.
3. WHEN a mutation is received, THE Server_Action SHALL validate the input against the corresponding Zod_Schema before performing any database write.

### Requirement 11: Project status transition

**User Story:** As a user, I want the project status to reflect that intake has started so the dashboard and checklist show accurate progress.

#### Acceptance Criteria

1. WHEN the first Answer is saved for a project that has status "setup", THE Server_Action SHALL update the project status to "intake".
2. WHEN the user views the project overview page, THE setup checklist SHALL reflect whether intake has been started based on the project status.

### Requirement 12: Starter content seeding

**User Story:** As a user, I want each section to start with clear starter questions and guidance so I am never dropped into an empty form.

#### Acceptance Criteria

1. WHEN an Intake_Section is expanded for the first time, THE Intake_Page SHALL display pre-defined starter questions and placeholder guidance for each Intake_Field in that section.
2. THE starter content SHALL explain what kind of information is expected and why it matters for document generation.
3. THE starter content SHALL be defined in code as a typed configuration, not fetched from the AI provider.

### Requirement 13: Keyboard accessibility

**User Story:** As a user who navigates with a keyboard, I want the intake forms and section navigation to be fully keyboard accessible.

#### Acceptance Criteria

1. THE Intake_Page SHALL support keyboard navigation between Intake_Sections using standard focus management (Tab, Shift+Tab, Enter, Escape).
2. WHEN an Intake_Section header receives focus and the user presses Enter, THE Intake_Page SHALL expand or collapse that section.
3. THE Intake_Page SHALL provide accessible labels for all Intake_Fields, status indicators, and interactive controls.
4. THE Completeness_Sidebar SHALL be navigable by keyboard with each section link focusable and activatable.

### Requirement 14: Error handling and resilience

**User Story:** As a user, I want clear feedback when something goes wrong during intake so I can fix the issue without losing my work.

#### Acceptance Criteria

1. IF a Server_Action fails to persist an Answer due to a network or database error, THEN THE Intake_Page SHALL display an inline error message and retain the unsaved value in the form field.
2. IF the Intake_Page fails to load saved Answers for a project, THEN THE Intake_Page SHALL display an error state with a retry action instead of showing an empty form.
3. IF the user navigates to an intake page for a non-existent project, THEN THE Intake_Page SHALL return a 404 response.
