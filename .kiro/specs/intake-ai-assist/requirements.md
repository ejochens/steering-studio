# Intake AI Assist — Requirements Document

## Introduction

The intake AI assist feature adds a single page-level "AI Answer" button to the intake page. When clicked, the button calls the configured AI provider to generate contextual answers for ALL remaining blank fields across ALL eight intake sections in a single request, using all existing answers as context. Sections that were blank when the button was clicked are auto-filled immediately with AI-generated text (saved with source "ai-inferred"). Sections that already had content enter a per-section review state where the user sees AI suggestions alongside existing answers and can accept or cancel per section. This accelerates the intake process while preserving user control over previously entered content.

## Glossary

- **Intake_Page**: The page rendered at `/projects/[projectId]/intake` that hosts all intake sections, the completeness sidebar, and the page-level AI_Answer_Button.
- **Intake_Section**: One of eight thematic groupings of questions within the intake flow.
- **Intake_Field**: A single input within an Intake_Section, defined by an IntakeFieldDef configuration object.
- **IntakeFieldDef**: The typed configuration object that defines a field's key, label, type, status, helpText, placeholder, and options.
- **AI_Answer_Button**: A page-level button that triggers AI answer generation for all blank fields across all eight Intake_Sections in a single request.
- **Provider_Connection**: The application-level AI provider configuration stored in the ProviderConnection model.
- **Save_Answer_Action**: The existing `saveAnswer` server action that persists an Answer to the database with source attribution.
- **Coverage_Recalculation**: The process of recomputing a section's coverage status after answers are added or changed.
- **Source_Attribution**: A label on each Answer indicating its origin: "user-form", "ai-inferred", or "ai-conversation".
- **Blank_Section**: An Intake_Section where every Intake_Field has no existing Answer value at the moment the AI_Answer_Button is clicked.
- **Non_Blank_Section**: An Intake_Section where at least one Intake_Field has an existing Answer value at the moment the AI_Answer_Button is clicked.
- **Review_State**: A per-section UI state for Non_Blank_Sections where AI-generated suggestions are displayed alongside existing answers, with Accept and Cancel actions.
- **AI_Suggestion**: An AI-generated answer for a field, shown in Review_State for user approval before persisting.

## Requirements

### Requirement 1: AI Answer button placement and layout

**User Story:** As a user, I want a single AI Answer button at the page level so I can generate answers for all remaining blank fields across all sections in one action.

#### Acceptance Criteria

1. THE Intake_Page SHALL display exactly one AI_Answer_Button at the page level, outside any individual Intake_Section.
2. THE AI_Answer_Button SHALL be labeled "AI Answer".
3. THE AI_Answer_Button SHALL be visually positioned in a prominent location on the Intake_Page (such as a page-level toolbar or header area) so the user can find it without scrolling into a specific section.
4. THE AI_Answer_Button SHALL be keyboard accessible, focusable, and activatable via Enter or Space.

### Requirement 2: AI answer generation scope

**User Story:** As a user, I want the AI Answer button to generate answers for all blank fields across all sections at once so I can populate the entire intake form efficiently.

#### Acceptance Criteria

1. WHEN the user clicks the AI_Answer_Button, THE Intake_Page SHALL identify all Intake_Fields across all eight Intake_Sections that have no existing Answer value.
2. WHEN blank fields exist across one or more sections, THE Intake_Page SHALL call a server action that sends the blank field definitions and all existing project answers across all sections to the configured AI provider in a single request.
3. WHEN no blank fields exist across any section, THE Intake_Page SHALL display a brief message indicating all fields already have values.

### Requirement 3: Auto-fill behavior for blank sections

**User Story:** As a user, I want sections that were completely empty to be auto-filled with AI answers immediately so I can see results without extra review steps.

#### Acceptance Criteria

1. WHEN the AI provider returns generated values, THE Intake_Page SHALL identify each Blank_Section (sections where every field had no existing Answer when the button was clicked).
2. FOR each Blank_Section, THE Intake_Page SHALL immediately persist all AI-generated values via the Save_Answer_Action with source "ai-inferred".
3. FOR each Blank_Section, THE Intake_Page SHALL display the AI-generated values in the corresponding Intake_Fields without requiring user review.
4. WHEN AI-generated answers are saved for a Blank_Section, THE Intake_Page SHALL trigger Coverage_Recalculation for that section.

### Requirement 4: Review state for non-blank sections

**User Story:** As a user, I want to review AI suggestions for sections that already had content so I can decide whether to accept or keep my original answers.

#### Acceptance Criteria

1. WHEN the AI provider returns generated values, THE Intake_Page SHALL identify each Non_Blank_Section (sections where at least one field had an existing Answer when the button was clicked).
2. FOR each Non_Blank_Section, THE Intake_Page SHALL enter Review_State, displaying AI_Suggestions alongside the existing Answer values for that section.
3. WHILE a section is in Review_State, THE Intake_Page SHALL display an "Accept" action and a "Cancel" action for that section.
4. WHILE a section is in Review_State, THE Intake_Page SHALL visually distinguish AI_Suggestions from existing Answer values so the user can compare them.
5. WHILE a section is in Review_State, THE Intake_Page SHALL prevent the user from editing fields in that section until the review is resolved via Accept or Cancel.

### Requirement 5: Accept action for reviewed sections

**User Story:** As a user, I want to accept AI suggestions for a section so the AI-generated answers replace my existing content.

#### Acceptance Criteria

1. WHEN the user clicks "Accept" for a section in Review_State, THE Intake_Page SHALL persist all AI_Suggestions for that section via the Save_Answer_Action with source "ai-inferred", overwriting existing Answer values.
2. WHEN the Accept action completes, THE Intake_Page SHALL exit Review_State for that section and display the accepted AI-generated values as the current answers.
3. WHEN the Accept action completes, THE Intake_Page SHALL trigger Coverage_Recalculation for that section.

### Requirement 6: Cancel action for reviewed sections

**User Story:** As a user, I want to cancel AI suggestions for a section so my original answers are preserved unchanged.

#### Acceptance Criteria

1. WHEN the user clicks "Cancel" for a section in Review_State, THE Intake_Page SHALL discard all AI_Suggestions for that section without persisting them.
2. WHEN the Cancel action completes, THE Intake_Page SHALL exit Review_State for that section and display the original Answer values unchanged.
3. THE Cancel action SHALL not modify any existing Answer values or trigger Coverage_Recalculation.

### Requirement 7: Page state after all reviews are resolved

**User Story:** As a user, I want the page to return to its normal state after I have accepted or canceled all pending reviews.

#### Acceptance Criteria

1. WHEN all Non_Blank_Sections have been resolved (each via Accept or Cancel), THE Intake_Page SHALL return to its normal editing state with no sections in Review_State.
2. WHEN the page returns to normal state, THE AI_Answer_Button SHALL be re-enabled (assuming it was disabled during the review cycle).

### Requirement 8: AI prompt context assembly

**User Story:** As a developer, I want the AI prompt to include all existing project answers so the generated values are contextually relevant to the project.

#### Acceptance Criteria

1. WHEN the server action assembles the AI prompt, THE server action SHALL include all existing Answer values from all eight Intake_Sections for the project as context.
2. WHEN the server action assembles the AI prompt, THE server action SHALL include the field definitions (label, helpText, type, options) for each blank field that needs an answer.
3. THE server action SHALL instruct the AI provider to return a structured response mapping each fieldKey to a generated value, grouped by sectionKey.
4. THE server action SHALL validate the AI response to confirm each returned fieldKey matches a valid field in the corresponding section before returning results to the client.

### Requirement 9: Provider connection availability check

**User Story:** As a user, I want clear feedback when no AI provider is configured so I understand why the AI Answer button is unavailable.

#### Acceptance Criteria

1. WHEN no Provider_Connection exists in the database, THE AI_Answer_Button SHALL be rendered in a disabled state.
2. WHEN no Provider_Connection exists, THE AI_Answer_Button SHALL display a tooltip or adjacent message stating that a provider connection is required.
3. WHEN a Provider_Connection exists, THE AI_Answer_Button SHALL be rendered in an enabled state.

### Requirement 10: Loading and progress states

**User Story:** As a user, I want to see loading indicators while AI generation is in progress so I know the action is working.

#### Acceptance Criteria

1. WHEN the AI_Answer_Button is clicked and the AI call is in progress, THE AI_Answer_Button SHALL display a loading indicator and be disabled until the response is received and initial processing completes.
2. WHILE the AI call is in progress, THE Intake_Page SHALL prevent the user from editing any Intake_Fields across all sections.
3. WHILE the AI call is in progress, THE Intake_Page SHALL display a page-level progress indicator communicating that AI generation is underway.
4. WHILE any section is in Review_State, THE AI_Answer_Button SHALL remain disabled until all reviews are resolved.

### Requirement 11: Error handling for AI answer generation

**User Story:** As a user, I want clear feedback when AI answer generation fails so I can understand the issue and retry.

#### Acceptance Criteria

1. IF the AI provider call fails due to a network or provider error, THEN THE Intake_Page SHALL display a page-level error message describing the failure.
2. IF the AI provider returns a response that cannot be parsed into valid field values, THEN THE server action SHALL return an error and THE Intake_Page SHALL display a message indicating the AI response was invalid.
3. IF one or more Save_Answer_Action calls fail during auto-fill of Blank_Sections, THEN THE Intake_Page SHALL display an error message indicating which sections failed to save.
4. WHEN an error occurs, THE Intake_Page SHALL restore the AI_Answer_Button to its enabled state so the user can retry.
5. IF an error occurs during auto-fill, THEN THE Intake_Page SHALL not enter Review_State for any section.

### Requirement 12: Error handling for accept action

**User Story:** As a user, I want clear feedback if saving accepted AI suggestions fails so I can retry without losing the suggestions.

#### Acceptance Criteria

1. IF one or more Save_Answer_Action calls fail during the Accept action for a section, THEN THE Intake_Page SHALL display an inline error message for that section indicating the save failed.
2. IF the Accept action fails, THEN THE section SHALL remain in Review_State with the AI_Suggestions still visible so the user can retry.

### Requirement 13: Server action for AI answer generation

**User Story:** As a developer, I want a dedicated server action for page-level AI answer generation so the AI call happens server-side and provider secrets are not exposed to the client.

#### Acceptance Criteria

1. THE system SHALL define a server action `generateAllAnswers` that accepts a projectId as input.
2. THE `generateAllAnswers` action SHALL validate the input using a Zod schema before proceeding.
3. THE `generateAllAnswers` action SHALL retrieve the Provider_Connection from the database and decrypt the API key server-side.
4. THE `generateAllAnswers` action SHALL call the AI provider through the provider adapter layer, not directly.
5. THE `generateAllAnswers` action SHALL return a structured result containing generated values grouped by sectionKey, along with a classification of which sections were blank and which were non-blank at the time of the call.
6. THE `generateAllAnswers` action SHALL persist answers for Blank_Sections server-side and call `revalidatePath` after persisting so the page reflects the auto-filled state.
7. THE `generateAllAnswers` action SHALL return AI_Suggestions for Non_Blank_Sections without persisting them, so the client can present them for review.

### Requirement 14: Server action for accepting reviewed suggestions

**User Story:** As a developer, I want a server action for accepting AI suggestions for a section so the persistence happens server-side with proper validation.

#### Acceptance Criteria

1. THE system SHALL define a server action `acceptSectionSuggestions` that accepts a projectId, sectionKey, and a map of fieldKey-to-value pairs as input.
2. THE `acceptSectionSuggestions` action SHALL validate the input using a Zod schema before proceeding.
3. THE `acceptSectionSuggestions` action SHALL persist each value via the Save_Answer_Action pattern with source "ai-inferred", overwriting existing values.
4. THE `acceptSectionSuggestions` action SHALL trigger Coverage_Recalculation for the section.
5. THE `acceptSectionSuggestions` action SHALL call `revalidatePath` after persisting so the page reflects the accepted state.

### Requirement 15: Accessibility of AI Answer button and review UI

**User Story:** As a user who relies on assistive technology, I want the AI Answer button and review UI to be fully accessible so I can use them with a keyboard or screen reader.

#### Acceptance Criteria

1. THE AI_Answer_Button SHALL have an accessible label that describes its purpose.
2. WHEN the AI_Answer_Button is in a disabled state, THE button SHALL communicate the disabled state and reason to assistive technology via `aria-disabled` and an accessible description.
3. WHEN the AI_Answer_Button is in a loading state, THE button SHALL communicate the loading state to assistive technology via `aria-busy` and a live region announcement.
4. WHEN a section enters Review_State, THE Intake_Page SHALL announce the review state to assistive technology via a live region.
5. THE Accept and Cancel buttons in Review_State SHALL have accessible labels that identify the section they apply to.
6. THE review UI SHALL not introduce focus traps and SHALL allow standard Tab navigation.
