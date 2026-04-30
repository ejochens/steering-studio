# Requirements Document

## Introduction

The review clarification feature adds an AI-powered conversation page at `/projects/[id]/review` that reviews the current intake state, identifies gaps and ambiguities across all eight intake sections, asks targeted follow-up questions, extracts structured facts from the conversation, and merges them back into the canonical project model (Answer rows in the database with source `ai-conversation`). The feature bridges the gap between structured form intake and the deeper discovery needed for high-quality document generation.

## Glossary

- **Review_Page**: The React page component rendered at `/projects/[projectId]/review` that hosts the conversation UI and fact extraction controls.
- **Conversation_Session**: A database record representing a single chat conversation thread tied to a Project. A Project has at most one active Conversation_Session at a time.
- **Conversation_Message**: A database record representing one message (user or assistant role) within a Conversation_Session, stored in chronological order.
- **Fact_Extractor**: A server-side module that sends the conversation transcript to the AI provider and receives structured key-value facts mapped to intake section fields.
- **Extracted_Fact**: A single key-value pair produced by the Fact_Extractor, mapped to a specific intake section and field key, presented to the user for review before persistence.
- **Canonical_Model**: The set of Answer rows in the database that represent the authoritative project knowledge. Both form inputs and conversation-derived facts populate the Canonical_Model.
- **Coverage_Calculator**: The existing module (`calculate-coverage.ts`) that computes section coverage status (unknown, partial, complete) based on required field answers.
- **Provider_Adapter**: The existing server-side abstraction (`ProviderAdapter` interface) that normalizes AI provider calls across OpenAI and Azure OpenAI backends.
- **Gap_Analyzer**: A server-side module that inspects the current intake state across all sections and identifies missing required fields, empty optional fields, and potential ambiguities to guide the assistant's questions.
- **System_Prompt_Builder**: A server-side module that constructs the system prompt for the review assistant, incorporating current intake state, identified gaps, and conversation rules.

## Requirements

### Requirement 1: Review Page Routing and Layout

**User Story:** As a user, I want to navigate to a review page within my project workspace, so that I can have a conversation with the AI assistant about my project.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[projectId]/review`, THE Review_Page SHALL render within the existing workspace layout with project sub-navigation visible.
2. THE Review_Page SHALL display the project name in the workspace breadcrumb.
3. WHEN the Review_Page loads, THE Review_Page SHALL display any existing Conversation_Message records for the active Conversation_Session in chronological order.
4. WHEN no Conversation_Session exists for the project, THE Review_Page SHALL display a welcome state that explains the purpose of the review conversation and provides a button to start the conversation.

### Requirement 2: Conversation Session Persistence

**User Story:** As a user, I want my conversation to be saved, so that I can leave and return without losing context.

#### Acceptance Criteria

1. WHEN a user starts a new conversation and no active Conversation_Session exists, THE Review_Page SHALL create a new Conversation_Session record linked to the Project.
2. WHEN a user sends a message, THE Review_Page SHALL persist the user Conversation_Message to the database before sending the request to the AI provider.
3. WHEN the AI assistant responds, THE Review_Page SHALL persist the assistant Conversation_Message to the database.
4. THE Conversation_Session SHALL store a `createdAt` and `updatedAt` timestamp.
5. THE Conversation_Message SHALL store the `role` (user or assistant), `content`, and `createdAt` timestamp.

### Requirement 3: Intake Gap Analysis

**User Story:** As a user, I want the AI assistant to know what information is missing from my intake, so that it asks relevant questions instead of redundant ones.

#### Acceptance Criteria

1. WHEN a conversation is initiated or resumed, THE Gap_Analyzer SHALL load all IntakeSection and Answer records for the project.
2. THE Gap_Analyzer SHALL identify required fields with no Answer or an empty Answer value across all eight intake sections.
3. THE Gap_Analyzer SHALL identify optional fields with no Answer when the corresponding section has coverage status of "partial" or "unknown".
4. THE Gap_Analyzer SHALL produce a structured summary of missing fields grouped by section key, including each field's label, type, and help text.
5. THE Gap_Analyzer SHALL include existing confirmed answers (source "user-form" or "ai-conversation") as context so the assistant does not re-ask for confirmed information.

### Requirement 4: System Prompt Construction

**User Story:** As a user, I want the AI assistant to ask focused, useful questions, so that the conversation efficiently fills gaps in my project context.

#### Acceptance Criteria

1. THE System_Prompt_Builder SHALL construct a system prompt that includes the current intake state summary from the Gap_Analyzer.
2. THE System_Prompt_Builder SHALL instruct the assistant to prioritize one clarifying question at a time.
3. THE System_Prompt_Builder SHALL instruct the assistant to explain why a question matters when the relevance is not obvious.
4. THE System_Prompt_Builder SHALL instruct the assistant to avoid asking for information that is already confirmed in the intake answers.
5. THE System_Prompt_Builder SHALL instruct the assistant to summarize what it has learned after important milestones in the conversation.
6. THE System_Prompt_Builder SHALL instruct the assistant to avoid inventing company-specific constraints or claiming information is final when required data is missing.
7. THE System_Prompt_Builder SHALL include the list of valid section keys and field keys so extracted facts can be mapped correctly.

### Requirement 5: Review Message Exchange

**User Story:** As a user, I want to send messages and receive AI responses in real time, so that I can have a natural conversation about my project.

#### Acceptance Criteria

1. THE Review_Page SHALL provide a text input and a send button for composing messages.
2. WHEN the user submits a message, THE Review_Page SHALL display the message in the conversation thread immediately.
3. WHEN the user submits a message, THE Review_Page SHALL send the full conversation history (system prompt plus all Conversation_Message records) to the Provider_Adapter via a server action.
4. WHILE the AI provider is processing a request, THE Review_Page SHALL display a loading indicator in the conversation thread.
5. WHEN the Provider_Adapter returns a response, THE Review_Page SHALL display the assistant message in the conversation thread.
6. THE Review_Page SHALL auto-scroll to the most recent message after each new message is added.
7. WHILE the AI provider is processing a request, THE Review_Page SHALL disable the send button to prevent duplicate submissions.

### Requirement 6: Server-Side Review Action

**User Story:** As a developer, I want all AI provider calls to happen server-side, so that API keys are never exposed to the browser.

#### Acceptance Criteria

1. THE Review_Page SHALL use a server action to send messages to the AI provider.
2. THE server action SHALL load the ProviderConnection from the database and decrypt the secret server-side.
3. THE server action SHALL construct the message array using the System_Prompt_Builder output and all persisted Conversation_Message records.
4. THE server action SHALL call the Provider_Adapter `sendChat` method with the constructed messages.
5. THE server action SHALL persist both the user message and the assistant response as Conversation_Message records.
6. IF no ProviderConnection is configured, THEN THE server action SHALL return an error indicating that a provider must be configured in Settings.

### Requirement 7: Structured Fact Extraction

**User Story:** As a user, I want the system to extract concrete facts from my conversation, so that my answers can populate the project model without manual re-entry.

#### Acceptance Criteria

1. THE Review_Page SHALL provide an "Extract Facts" action that the user can trigger after a meaningful exchange.
2. WHEN the user triggers fact extraction, THE Fact_Extractor SHALL send the conversation transcript to the AI provider with a structured extraction prompt.
3. THE Fact_Extractor SHALL request facts as a JSON object mapping section keys to field key-value pairs, using the same section keys and field keys defined in the intake configuration.
4. THE Fact_Extractor SHALL validate the extracted JSON against the known section keys and field keys, discarding any entries that do not match valid keys.
5. THE Fact_Extractor SHALL return the validated Extracted_Fact list to the Review_Page for user review.
6. IF the AI provider returns invalid JSON, THEN THE Fact_Extractor SHALL return an error message to the user.

### Requirement 8: Fact Review and Approval

**User Story:** As a user, I want to review extracted facts before they are saved, so that I maintain control over what goes into my project model.

#### Acceptance Criteria

1. WHEN the Fact_Extractor returns Extracted_Fact entries, THE Review_Page SHALL display each fact with its target section name, field label, and proposed value.
2. THE Review_Page SHALL provide an "Accept" action for each individual Extracted_Fact.
3. THE Review_Page SHALL provide a "Dismiss" action for each individual Extracted_Fact.
4. THE Review_Page SHALL provide an "Accept All" action to accept all displayed Extracted_Fact entries at once.
5. WHEN the user accepts an Extracted_Fact, THE Review_Page SHALL persist the value as an Answer row with source "ai-conversation" via a server action.
6. WHEN an accepted Extracted_Fact targets a field that already has an Answer with source "user-form", THE Review_Page SHALL display the existing value alongside the proposed value and require explicit confirmation before overwriting.

### Requirement 9: Canonical Model Merge

**User Story:** As a user, I want accepted review facts to update the same project model that forms use, so that all my project information stays in one place.

#### Acceptance Criteria

1. WHEN an Extracted_Fact is accepted, THE server action SHALL upsert an Answer row with the matching `intakeSectionId` and `fieldKey`, setting source to "ai-conversation".
2. WHEN an Answer is upserted, THE server action SHALL recalculate the coverage status for the affected IntakeSection using the Coverage_Calculator.
3. WHEN an Answer is upserted, THE server action SHALL update the IntakeSection `coverageStatus` field in the database.
4. THE server action SHALL use a database transaction to ensure the Answer upsert and coverage status update are atomic.
5. WHEN the user navigates from the Review_Page to the intake page, THE intake page SHALL reflect all accepted Extracted_Fact values in the form fields.

### Requirement 10: Completeness Sidebar Integration

**User Story:** As a user, I want to see section completeness while in review, so that I know which areas still need attention.

#### Acceptance Criteria

1. THE Review_Page SHALL display the existing CompletenessSidebar component showing all eight intake sections with their current coverage status.
2. WHEN an Extracted_Fact is accepted and coverage status changes, THE Review_Page SHALL update the CompletenessSidebar to reflect the new status.
3. WHEN the user clicks a section in the CompletenessSidebar on the Review_Page, THE Review_Page SHALL scroll the conversation to the most recent message related to that section or indicate that no messages address that section yet.

### Requirement 11: Error Handling

**User Story:** As a user, I want clear feedback when something goes wrong, so that I can take corrective action.

#### Acceptance Criteria

1. IF no ProviderConnection is configured, THEN THE Review_Page SHALL display a message directing the user to configure a provider in Settings, with a link to the provider settings page.
2. IF the Provider_Adapter call fails due to a network or API error, THEN THE Review_Page SHALL display an error message in the conversation thread and allow the user to retry the last message.
3. IF the Fact_Extractor receives an unparseable response from the AI provider, THEN THE Review_Page SHALL display an error message and allow the user to retry extraction.
4. IF a server action fails during Answer persistence, THEN THE Review_Page SHALL display an error message and preserve the Extracted_Fact entries so the user can retry acceptance.
5. WHILE an error is displayed, THE Review_Page SHALL provide a dismiss action to clear the error message.

### Requirement 12: Conversation Context Window Management

**User Story:** As a user, I want the assistant to maintain context throughout a long conversation, so that it does not repeat questions or lose track of what was discussed.

#### Acceptance Criteria

1. THE server action SHALL include all persisted Conversation_Message records for the active session when calling the Provider_Adapter.
2. WHEN the total message token count approaches the provider model's context limit, THE server action SHALL summarize older messages and replace them with a condensed summary message while preserving the most recent messages in full.
3. THE server action SHALL preserve the system prompt and the five most recent message pairs (user + assistant) at minimum when summarizing.

### Requirement 13: Database Schema for Conversations

**User Story:** As a developer, I want conversation data stored in the database, so that sessions persist across page reloads and server restarts.

#### Acceptance Criteria

1. THE database schema SHALL include a ConversationSession model with fields: `id`, `projectId` (foreign key to Project), `createdAt`, `updatedAt`.
2. THE database schema SHALL include a ConversationMessage model with fields: `id`, `sessionId` (foreign key to ConversationSession), `role` (string: "user" or "assistant"), `content` (text), `createdAt`.
3. THE ConversationSession model SHALL have a unique constraint on `projectId` to enforce one active session per project.
4. THE ConversationMessage model SHALL have an index on `sessionId` for efficient message retrieval.
5. WHEN a Project is deleted, THE database SHALL cascade-delete the associated ConversationSession and ConversationMessage records.

### Requirement 14: Project Progress Bar

**User Story:** As a user, I want to see a visual progress indicator at the top of every project page, so that I always know where I am in the workflow and what steps are complete.

#### Acceptance Criteria

1. THE project workspace layout SHALL display a progress bar above the tab navigation on every project page.
2. THE progress bar SHALL show five sequential steps: Details, Intake, Review, Documents, Export.
3. THE progress bar SHALL visually distinguish between completed steps, the current active step, and upcoming steps.
4. EACH step in the progress bar SHALL be clickable and navigate to the corresponding project page.
5. THE "Details" step SHALL be marked complete when the project has a name, working title, and target output set.
6. THE "Intake" step SHALL be marked complete when all eight intake sections have coverage status of "complete".
7. THE "Review" step SHALL be marked complete when at least one Conversation_Session exists with at least one Conversation_Message for the project.
8. THE "Documents" step SHALL be marked complete when generated documents exist for the project (future feature — initially always incomplete).
9. THE "Export" step SHALL be marked complete when an export has been performed for the project (future feature — initially always incomplete).
10. THE progress bar SHALL update dynamically when navigating between project pages without a full page reload.
