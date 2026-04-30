# Requirements Document

## Introduction

Steering Studio currently uses a single ProviderConnection record for all AI functions: intake answer generation, document refinement, and future review tasks. This feature introduces per-function model assignment so users can route different AI tasks to different models. For example, a fast and cheap model for intake chat and a high-quality reasoning model for document generation. The feature also adds the ability to regenerate documents after changing provider settings, so users can easily upgrade output quality when they switch to a better model.

## Glossary

- **Provider_Settings_Page**: The application-level settings page at `/settings/provider` where users configure AI model connections.
- **Model_Assignment**: A record that maps an AI function to a specific ProviderConnection, overriding the default model for that function.
- **AI_Function**: A named category of AI work in the application. Current functions are `intake` (answer generation) and `generation` (document refinement). Future functions include `review` and `extraction`.
- **Default_Model**: The ProviderConnection used when no function-specific Model_Assignment exists.
- **Function_Resolver**: The server-side module that determines which ProviderConfig to use for a given AI_Function by checking for a Model_Assignment and falling back to the Default_Model.
- **Regeneration_Action**: A server action that re-runs document generation for one or all documents in a project, using the currently resolved provider configuration.

## Requirements

### Requirement 1: Default Model Designation

**User Story:** As a user, I want one of my configured provider connections to serve as the default model, so that all AI functions work without requiring per-function configuration.

#### Acceptance Criteria

1. THE Provider_Settings_Page SHALL display a "Default" indicator on the ProviderConnection that is designated as the Default_Model.
2. WHEN only one ProviderConnection exists, THE system SHALL treat that connection as the Default_Model automatically.
3. WHEN a user saves a new ProviderConnection and no Default_Model is set, THE system SHALL designate the new connection as the Default_Model.
4. WHEN the user changes the Default_Model designation, THE system SHALL persist the change and apply the new Default_Model to all AI_Functions that have no Model_Assignment override.
5. IF the user deletes the ProviderConnection that is the Default_Model, THEN THE system SHALL designate the next most recently updated ProviderConnection as the Default_Model, or clear the designation if no connections remain.

### Requirement 2: Per-Function Model Assignment

**User Story:** As a user, I want to assign different models to different AI functions, so that I can use a fast model for intake and a reasoning model for document generation.

#### Acceptance Criteria

1. THE Provider_Settings_Page SHALL display a "Model Assignments" section listing each available AI_Function with its currently assigned model.
2. WHEN no Model_Assignment exists for an AI_Function, THE Provider_Settings_Page SHALL display "Default" as the assigned model for that AI_Function.
3. WHEN the user selects a ProviderConnection for an AI_Function, THE system SHALL persist the Model_Assignment.
4. WHEN the user clears a Model_Assignment for an AI_Function, THE system SHALL revert that AI_Function to use the Default_Model.
5. THE system SHALL support Model_Assignment for at least these AI_Functions: `intake` and `generation`.
6. THE system SHALL validate that the ProviderConnection referenced by a Model_Assignment exists before persisting the assignment.

### Requirement 3: Function-Aware Provider Resolution

**User Story:** As a developer, I want a single resolution function that returns the correct ProviderConfig for any AI function, so that all AI call sites use consistent lookup logic.

#### Acceptance Criteria

1. WHEN an AI call site requests a ProviderConfig for a specific AI_Function, THE Function_Resolver SHALL return the ProviderConfig from the Model_Assignment for that AI_Function if one exists.
2. WHEN no Model_Assignment exists for the requested AI_Function, THE Function_Resolver SHALL return the ProviderConfig from the Default_Model.
3. IF no Default_Model and no Model_Assignment exist for the requested AI_Function, THEN THE Function_Resolver SHALL return null.
4. THE Function_Resolver SHALL decrypt the encryptedSecret field server-side and include the plaintext secret in the returned ProviderConfig.
5. THE Function_Resolver SHALL never expose the plaintext secret to client-side code.

### Requirement 4: Per-Model Connection Testing

**User Story:** As a user, I want to test each configured model connection independently, so that I can verify connectivity before using a model for a specific function.

#### Acceptance Criteria

1. THE Provider_Settings_Page SHALL display a "Test" button for each configured ProviderConnection.
2. WHEN the user clicks "Test" for a ProviderConnection, THE system SHALL send a test request using that connection's configuration and display the result (success, failure, latency).
3. WHEN a connection test completes, THE system SHALL persist the test status and timestamp on the tested ProviderConnection record.
4. THE Provider_Settings_Page SHALL display the last test status and timestamp for each ProviderConnection.

### Requirement 5: Multiple Provider Connections

**User Story:** As a user, I want to configure more than one provider connection, so that I have multiple models available for assignment to different functions.

#### Acceptance Criteria

1. THE Provider_Settings_Page SHALL allow the user to add a new ProviderConnection while keeping existing connections.
2. THE Provider_Settings_Page SHALL display all configured ProviderConnections in a list, each showing provider type, model name, and last test status.
3. WHEN the user edits a ProviderConnection, THE Provider_Settings_Page SHALL load that connection's current values into the form.
4. WHEN the user deletes a ProviderConnection that is referenced by a Model_Assignment, THE system SHALL clear the affected Model_Assignments so those AI_Functions revert to the Default_Model.
5. THE system SHALL store each ProviderConnection as a separate record with its own encrypted secret, endpoint, region, model name, auth mode, and API version.

### Requirement 6: Backward Compatibility

**User Story:** As an existing user, I want the application to work exactly as before if I only configure one model, so that the multi-model feature does not break my current setup.

#### Acceptance Criteria

1. WHEN only one ProviderConnection exists and no Model_Assignments are configured, THE system SHALL use that single connection for all AI_Functions.
2. WHEN the application is upgraded from a single-connection schema, THE system SHALL treat the existing ProviderConnection as the Default_Model without requiring user action.
3. THE Provider_Settings_Page SHALL remain functional for users who only configure a single ProviderConnection, without requiring interaction with the Model_Assignments section.

### Requirement 7: Document Regeneration After Provider Change

**User Story:** As a user, I want to easily regenerate documents after changing my provider or model settings, so that I can see improved output quality without manually re-triggering each document.

#### Acceptance Criteria

1. WHEN the user saves a change to a ProviderConnection or Model_Assignment that affects the `generation` AI_Function, THE Provider_Settings_Page SHALL display a notification indicating that existing documents may benefit from regeneration.
2. THE documents page SHALL provide a "Regenerate All" action that re-runs document generation for all documents in the current project using the currently resolved provider configuration.
3. THE documents page SHALL provide a "Regenerate" action per document that re-runs generation for a single document using the currently resolved provider configuration.
4. WHEN a regeneration is triggered, THE Regeneration_Action SHALL use the Function_Resolver to obtain the ProviderConfig for the `generation` AI_Function.
5. WHEN a document has been manually edited, THE system SHALL warn the user before overwriting the document with regenerated content.
6. WHEN regeneration completes, THE system SHALL update the document's content, draft content, completeness, and generation timestamp.

### Requirement 8: Model Assignment Persistence

**User Story:** As a user, I want my model assignments to persist across application restarts, so that I do not need to reconfigure them each session.

#### Acceptance Criteria

1. THE system SHALL store Model_Assignments in the database with a reference to the AI_Function name and the ProviderConnection ID.
2. THE system SHALL enforce a unique constraint so that each AI_Function has at most one Model_Assignment.
3. WHEN the application starts, THE Function_Resolver SHALL read Model_Assignments from the database without requiring user interaction.
