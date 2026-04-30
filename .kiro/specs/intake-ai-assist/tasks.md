# Implementation Plan: Intake AI Assist

## Overview

This plan implements a page-level "AI Answer" button on the intake page that generates answers for all blank fields across all eight intake sections in a single AI call. Blank sections are auto-filled immediately; non-blank sections enter a per-section review state with Accept/Cancel actions. The implementation extends the provider adapter with `sendChat`, adds two new server actions, a prompt template, Zod schemas, and updates the intake UI components.

## Tasks

- [x] 1. Extend provider adapter layer with sendChat
  - [x] 1.1 Add ChatMessage, ChatOptions, ChatResult interfaces and sendChat method to ProviderAdapter in `src/lib/ai/adapters/types.ts`
    - Add `ChatMessage` interface with `role` and `content` fields
    - Add `ChatOptions` interface with optional `temperature` and `maxTokens`
    - Add `ChatResult` interface with `content` string
    - Add `sendChat(config, messages, options?)` to the `ProviderAdapter` interface
    - Update the barrel export in `src/lib/ai/adapters/index.ts`
    - _Requirements: 13.4_

  - [x] 1.2 Implement sendChat in OpenAIAdapter in `src/lib/ai/adapters/openai-adapter.ts`
    - Implement `sendChat` using fetch against `${endpoint}/v1/chat/completions`
    - Pass `Authorization: Bearer ${config.secret}` header
    - Send `model`, `messages`, `temperature`, `max_tokens` in the request body
    - Parse the response and return `ChatResult` with the assistant message content
    - Handle errors consistently with `testConnection` (401/403, 404, timeout, network)
    - _Requirements: 13.3, 13.4_

  - [x] 1.3 Write unit tests for OpenAIAdapter.sendChat
    - Test successful chat completion response parsing
    - Test error handling for auth failures, timeouts, and malformed responses
    - Use mocked fetch
    - _Requirements: 13.4_

- [x] 2. Add Zod validation schemas
  - [x] 2.1 Add generateAllAnswers, acceptSectionSuggestions, and aiResponse schemas to `src/lib/validation/intake.ts`
    - Add `generateAllAnswersSchema` validating `projectId` as non-empty string
    - Add `acceptSectionSuggestionsSchema` validating `projectId`, `sectionKey` (using existing `sectionKeySchema`), and `values` as `Record<string, string>`
    - Add `aiResponseSchema` as `z.record(sectionKeySchema, z.record(z.string(), z.string()))`
    - Export inferred types
    - _Requirements: 13.2, 14.2, 8.4_

- [x] 3. Create prompt template and server actions
  - [x] 3.1 Create the intake answer prompt template in `src/lib/ai/prompts/intake-answers.ts`
    - Export `buildIntakeAnswerPrompt(existingAnswers, blankFields)` returning `ChatMessage[]`
    - System message: explain the task, instruct JSON output format `{ [sectionKey]: { [fieldKey]: value } }`
    - Include existing answers grouped by section as context
    - Include blank field definitions with label, helpText, type, and options
    - Instruct the AI to generate contextually relevant values based on existing project answers
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 3.2 Implement the `generateAllAnswers` server action in `src/features/intake/actions/generate-all-answers.ts`
    - Validate input with `generateAllAnswersSchema`
    - Load `ProviderConnection` from DB; return error if none exists
    - Decrypt API key server-side using `decrypt()`
    - Load all `IntakeSection` rows with `Answer` rows for the project
    - Identify blank fields using `INTAKE_SECTIONS` config
    - If no blank fields, return early with empty results
    - Build prompt via `buildIntakeAnswerPrompt`
    - Call AI via `adapter.sendChat()`
    - Parse and validate JSON response with `aiResponseSchema`
    - Classify sections as blank or non-blank based on pre-call state
    - For blank sections: upsert answers with source `"ai-inferred"`, recalculate coverage, call `revalidatePath`
    - For non-blank sections: return suggestions without persisting
    - Return `GenerateAllAnswersResult` with suggestions, autoFilledSections, reviewSections
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 8.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 3.3 Implement the `acceptSectionSuggestions` server action in `src/features/intake/actions/accept-section-suggestions.ts`
    - Validate input with `acceptSectionSuggestionsSchema`
    - Look up `IntakeSection` by `(projectId, sectionKey)`
    - For each `fieldKey → value`, upsert `Answer` with source `"ai-inferred"`
    - Recalculate coverage for the section using `calculateCoverage`
    - Update `IntakeSection.coverageStatus`
    - Call `revalidatePath`
    - Return result with new coverage status
    - _Requirements: 5.1, 5.2, 5.3, 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 3.4 Write integration tests for generateAllAnswers with mocked adapter
    - Test blank-section auto-fill persists answers with source `"ai-inferred"`
    - Test non-blank sections return suggestions without persisting
    - Test validation error when projectId is empty
    - Test error when no ProviderConnection exists
    - Test early return when no blank fields exist
    - Test invalid AI response is handled gracefully
    - _Requirements: 13.1, 13.2, 13.5, 13.6, 13.7, 11.2_

  - [x] 3.5 Write integration tests for acceptSectionSuggestions
    - Test successful accept persists all values with source `"ai-inferred"`
    - Test coverage recalculation after accept
    - Test validation error for invalid sectionKey
    - Test error when section not found
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update intake page server component to pass provider status
  - [x] 5.1 Update the intake page at `src/app/(workspace)/projects/[projectId]/intake/page.tsx`
    - Query `ProviderConnection` to determine if a provider is configured
    - Pass `providerConfigured` boolean prop to `IntakeAccordion`
    - _Requirements: 9.1, 9.3_

- [x] 6. Update IntakeAccordion with AI Answer button and review state
  - [x] 6.1 Add AI state management and AI Answer button to `src/features/intake/components/intake-accordion.tsx`
    - Add `providerConfigured` to `IntakeAccordionProps`
    - Add state: `aiState` (`"idle" | "loading" | "reviewing" | "error"`), `suggestions`, `reviewSections`, `autoFilledSections`, `errorMessage`
    - Render "AI Answer" button in a prominent page-level position above the sections
    - Disable button when `providerConfigured` is false, with tooltip explaining provider is required
    - Disable button during loading and reviewing states
    - Show loading indicator on button and page-level progress indicator during AI call
    - On click: call `generateAllAnswers`, process result, set review state for non-blank sections
    - Handle errors: display page-level error message, restore button to enabled
    - When all reviews resolved, return to idle state and re-enable button
    - Disable field editing during loading state
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 7.1, 7.2, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4, 11.1, 11.4, 11.5_

  - [x] 6.2 Pass review props to IntakeSection components
    - Pass `reviewSuggestions`, `isInReview`, `onAccept`, `onCancel` props to each `IntakeSection`
    - Wire `onAccept` to call `acceptSectionSuggestions` server action and remove section from review set
    - Wire `onCancel` to discard suggestions and remove section from review set
    - Handle accept errors: show inline error, keep section in review state
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 12.1, 12.2_

- [x] 7. Update IntakeSection with review overlay UI
  - [x] 7.1 Add review overlay to `src/features/intake/components/intake-section.tsx`
    - Add `reviewSuggestions`, `isInReview`, `onAccept`, `onCancel` to `IntakeSectionProps`
    - When `isInReview` is true, display AI suggestions alongside existing values with visual distinction
    - Show "Accept" and "Cancel" buttons with accessible labels identifying the section
    - Prevent field editing while in review state
    - Show inline error message if accept fails
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 6.1, 6.2, 12.1, 12.2_

- [x] 8. Add accessibility attributes
  - [x] 8.1 Add ARIA attributes to AI Answer button and review UI
    - Add accessible label to AI Answer button
    - Add `aria-disabled` and accessible description when button is disabled (no provider)
    - Add `aria-busy` and live region announcement during loading state
    - Add live region announcement when sections enter review state
    - Add accessible labels to Accept/Cancel buttons identifying their section
    - Ensure no focus traps in review UI, standard Tab navigation works
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design uses TypeScript throughout; all implementation follows existing project conventions
- Server actions handle all AI provider communication; no secrets are exposed to the client
- The review state is entirely client-side; no new database models are needed
