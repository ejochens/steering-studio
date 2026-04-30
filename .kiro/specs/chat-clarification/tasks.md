# Implementation Plan: Chat Clarification (Review)

## Overview

This plan implements the AI-powered review conversation feature. The implementation proceeds bottom-up: database schema first, then validation, then pure modules (gap analyzer, system prompt builder, fact extractor), then server actions, then UI, then integration points. Each task is small and traceable to specific requirements.

## Tasks

- [x] 1. Database schema for conversations
  - [x] 1.1 Add ConversationSession and ConversationMessage models to Prisma schema
    - Add `ConversationSession` model with `id`, `projectId` (unique), `createdAt`, `updatedAt`
    - Add `ConversationMessage` model with `id`, `sessionId`, `role`, `content`, `createdAt`
    - Add `onDelete: Cascade` from `ConversationSession` to `Project`
    - Add `onDelete: Cascade` from `ConversationMessage` to `ConversationSession`
    - Add `@@index([sessionId])` on `ConversationMessage`
    - Add `conversationSession ConversationSession?` relation to `Project` model
    - Run `npx prisma db push` and `npx prisma generate`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 2. Validation schemas
  - [x] 2.1 Create review validation schemas in `src/lib/validation/review.ts`
    - Define `sendReviewMessageSchema` validating `projectId` (non-empty) and `content` (non-empty, max 10000 chars)
    - Define `extractReviewFactsSchema` validating `projectId` (non-empty)
    - Define `acceptReviewFactSchema` validating `projectId`, `sectionKey` (from `sectionKeySchema`), `fieldKey` (non-empty), `value` (non-empty)
    - Export inferred types
    - _Requirements: 5.1, 7.3, 8.5_

  - [x] 2.2 Re-export review schemas from `src/lib/validation/index.ts`
    - _Requirements: validation barrel consistency_

  - [x] 2.3 Write property test for review validation schemas
    - Test file: `src/lib/validation/__tests__/review.pbt.test.ts`
    - Verify schemas accept valid inputs and reject invalid ones
    - _Validates: Requirements 5.1, 7.3_

- [x] 3. Gap analyzer module
  - [x] 3.1 Implement `analyzeGaps` in `src/features/review/lib/gap-analyzer.ts`
    - Accept IntakeSection rows with their Answer rows
    - Identify required fields with no answer or empty value across all eight sections
    - Identify optional fields in partial/unknown sections
    - Collect confirmed answers (source "user-form" or "ai-conversation") as context
    - Return structured `GapSummary` with `missingRequired`, `missingOptional`, `confirmedAnswers`, `sectionStatuses`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Write property test for gap analyzer
    - **Property 1: Gap analyzer identifies all missing required fields**
    - Test file: `src/features/review/lib/__tests__/gap-analyzer.pbt.test.ts`
    - Use `fast-check` to generate random section/answer combinations
    - _Validates: Requirements 3.1, 3.2, 3.3_

- [x] 4. System prompt builder module
  - [x] 4.1 Implement `buildReviewSystemPrompt` in `src/features/review/lib/system-prompt-builder.ts`
    - Accept `GapSummary` and `projectName`
    - Include current intake state summary (confirmed answers, missing fields)
    - Instruct assistant to prioritize one question at a time
    - Instruct assistant to explain why questions matter
    - Instruct assistant to avoid re-asking confirmed information
    - Instruct assistant to summarize learnings at milestones
    - Instruct assistant to avoid inventing constraints
    - Include valid section keys and field keys for fact mapping
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 4.2 Write property test for system prompt builder
    - **Property 2: System prompt includes confirmed answers and missing fields**
    - Test file: `src/features/review/lib/__tests__/system-prompt-builder.pbt.test.ts`
    - Verify all confirmed answer values and missing field keys appear in the prompt
    - _Validates: Requirements 4.1, 4.4, 4.7_

- [x] 5. Fact extractor module
  - [x] 5.1 Implement `buildFactExtractionPrompt` and `parseFactExtractionResponse` in `src/features/review/lib/fact-extractor.ts`
    - Build extraction prompt with all valid section/field keys from `INTAKE_SECTIONS`
    - Instruct JSON response format: `{ sectionKey: { fieldKey: value } }`
    - Parse and validate AI response against known keys
    - Enrich facts with display names (sectionName, fieldLabel)
    - Return validated `ExtractedFact[]`
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 5.2 Write property test for fact extractor
    - **Property 3: Fact extraction validates against known keys**
    - Test file: `src/features/review/lib/__tests__/fact-extractor.pbt.test.ts`
    - Generate response objects with valid and invalid keys, verify filtering
    - _Validates: Requirements 7.4_

- [x] 6. Checkpoint — Ensure all tests pass

- [x] 7. Server actions
  - [x] 7.1 Implement `sendReviewMessage` in `src/features/review/actions/send-review-message.ts`
    - Validate input with `sendReviewMessageSchema`
    - Create `ConversationSession` if none exists (upsert pattern)
    - Persist user `ConversationMessage`
    - Load all messages for the session, ordered by `createdAt`
    - Build system prompt via `SystemPromptBuilder` (using `GapAnalyzer` with fresh intake data)
    - Call `ProviderAdapter.sendChat` with system prompt + message history
    - Persist assistant `ConversationMessage`
    - Return `{ success, assistantMessage, sessionId }`
    - _Requirements: 2.1, 2.2, 2.3, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.2 Implement `extractReviewFacts` in `src/features/review/actions/extract-review-facts.ts`
    - Load conversation transcript for the project
    - Build extraction prompt via `FactExtractor`
    - Call `ProviderAdapter.sendChat`
    - Parse and validate response
    - Return `{ success, facts }` with enriched `ExtractedFact[]`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.3 Implement `acceptReviewFact` in `src/features/review/actions/accept-review-fact.ts`
    - Validate input with `acceptReviewFactSchema`
    - Upsert Answer row with `source: "ai-conversation"` in a transaction
    - Recalculate coverage for the affected IntakeSection
    - Revalidate review and intake paths
    - Return `{ success, error? }`
    - _Requirements: 8.2, 8.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 7.4 Implement `acceptAllReviewFacts` in `src/features/review/actions/accept-all-review-facts.ts`
    - Accept an array of facts
    - Upsert all Answer rows in a transaction
    - Recalculate coverage for all affected sections
    - _Requirements: 8.4_

- [x] 8. Checkpoint — Ensure all tests pass

- [x] 9. Review page route and components
  - [x] 9.1 Create review page route at `src/app/(workspace)/projects/[projectId]/review/page.tsx`
    - Server component that loads the project, conversation session, messages, and intake sections
    - Renders `ReviewChat` and `CompletenessSidebar` in a two-column layout
    - Shows welcome state when no session exists
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1_

  - [x] 9.2 Implement `ReviewChat` client component in `src/features/review/components/review-chat.tsx`
    - Display messages in chronological order
    - Welcome state with "Start Conversation" button
    - Text input with send button (disabled while loading)
    - Loading indicator during AI processing
    - Auto-scroll to latest message
    - Error display with retry
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 11.2, 11.5_

  - [x] 9.3 Implement `FactReviewPanel` component in `src/features/review/components/fact-review-panel.tsx`
    - "Extract Facts" button (enabled after at least 2 exchanges)
    - Display extracted facts with section name, field label, proposed value
    - Accept/Dismiss per fact
    - Accept All button
    - Overwrite confirmation when existing user-form answer exists
    - _Requirements: 7.1, 8.1, 8.2, 8.3, 8.4, 8.6_

- [x] 10. Completeness sidebar integration
  - [x] 10.1 Wire `CompletenessSidebar` on the review page
    - Display all eight sections with current coverage status
    - Update sidebar when facts are accepted (revalidation)
    - _Requirements: 10.1, 10.2_

- [x] 11. Progress bar integration
  - [x] 11.1 Update workspace layout to compute review step completion
    - Query for `ConversationSession` with at least one message
    - Set `review: true` in `StepStatus` when condition is met
    - _Requirements: 14.7_

- [x] 12. Checkpoint — Ensure all tests pass

- [x] 13. Error handling and edge cases
  - [x] 13.1 Handle no-provider state on review page
    - Display message directing user to configure provider with link to `/settings/provider`
    - _Requirements: 11.1_

  - [x] 13.2 Handle provider API errors in chat
    - Display error in conversation thread with retry button
    - _Requirements: 11.2_

  - [x] 13.3 Handle extraction errors
    - Display error message with retry button, preserve any partial state
    - _Requirements: 11.3, 11.4_

- [x] 14. Final checkpoint — Ensure all tests pass

## Notes

- Context window management (Requirement 12.2) is deferred to a follow-up — for MVP, send all messages and rely on provider truncation
- Requirement 10.3 (sidebar click scrolls to related message) is deferred — requires message-to-section tagging which adds complexity without core value
- The existing `CompletenessSidebar` component is reused as-is
- The progress bar already has the "Review" step wired in the layout — just needs the completion query
- Requirement 14 (progress bar) steps 8 and 9 (Documents, Export) remain always-incomplete as those features don't exist yet
