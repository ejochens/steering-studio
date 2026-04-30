# Implementation Plan: Multi-Model Provider

## Overview

Convert Steering Studio from a single-provider architecture to a multi-provider system where users can configure multiple AI model connections and assign them to specific AI functions. Implementation proceeds bottom-up: schema changes first, then the function resolver, server actions, AI call site updates, and finally the redesigned provider settings UI with model assignments.

## Tasks

- [x] 1. Update Prisma schema and database
  - [x] 1.1 Add `isDefault` field and `ModelAssignment` model to Prisma schema
    - Add `isDefault Boolean @default(false)` to `ProviderConnection` model
    - Add `modelAssignments ModelAssignment[]` relation to `ProviderConnection`
    - Add new `ModelAssignment` model with `id`, `aiFunction` (unique), `providerConnectionId` (FK), `createdAt`, `updatedAt`
    - Add `@@unique([aiFunction])` constraint on `ModelAssignment`
    - Add `onDelete: Cascade` on the `ModelAssignment` → `ProviderConnection` relation
    - Run `npx prisma db push` then `npx prisma generate`
    - _Requirements: 8.1, 8.2, 1.1, 2.5_

- [x] 2. Extend validation schemas
  - [x] 2.1 Add `aiFunctionSchema`, `saveAssignmentSchema`, and `deleteProviderSchema` to `src/lib/validation/provider.ts`
    - Add `aiFunctionSchema = z.enum(["intake", "generation"])` and export `AiFunction` type
    - Add `saveAssignmentSchema = z.object({ aiFunction: aiFunctionSchema, providerConnectionId: z.string().cuid().optional() })`
    - Add `deleteProviderSchema = z.object({ id: z.string().cuid() })`
    - _Requirements: 2.5, 2.6, 5.4_

- [x] 3. Implement function resolver and core server actions
  - [x] 3.1 Create `resolveProvider` function in `src/lib/ai/resolve-provider.ts`
    - Export `AiFunction` type (`"intake" | "generation"`)
    - Implement `resolveProvider(aiFunction: AiFunction): Promise<ProviderConfig | null>`
    - Check `ModelAssignment` for the given `aiFunction` first
    - Fall back to `ProviderConnection` where `isDefault = true`
    - Fall back to most recently updated `ProviderConnection` if no default is set
    - Return `null` if no connections exist
    - Decrypt `encryptedSecret` server-side and include plaintext `secret` in returned `ProviderConfig`
    - Catch decrypt errors and return `null`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Write property tests for `resolveProvider` in `src/lib/ai/__tests__/resolve-provider.pbt.test.ts`
    - **Property 1: Assignment-based resolution** — When a `ModelAssignment` exists for an AI function, `resolveProvider` returns the assigned connection's config fields
    - **Validates: Requirements 3.1**
    - **Property 2: Default fallback resolution** — When no assignment exists, `resolveProvider` returns the default connection's config
    - **Validates: Requirements 3.2**
    - **Property 3: Single-connection backward compatibility** — With one connection (any `isDefault` value) and no assignments, `resolveProvider` returns that connection for all functions
    - **Validates: Requirements 1.2, 6.1, 6.2**
    - Use `fast-check` with minimum 100 iterations per property
    - Mock Prisma calls with in-memory data structures
    - Each test must include comment tag: `// Feature: multi-model-provider, Property {N}: {title}`

  - [x] 3.3 Create `deleteProvider` server action in `src/features/provider-settings/actions/delete-provider.ts`
    - Validate input with `deleteProviderSchema`
    - Delete the `ProviderConnection` by ID (cascading deletes handle `ModelAssignment` rows)
    - If the deleted connection was the default, promote the most recently updated remaining connection to default
    - Wrap in a Prisma transaction
    - Revalidate `/settings/provider`
    - _Requirements: 1.5, 5.4_

  - [x] 3.4 Create `saveAssignment` server action in `src/features/provider-settings/actions/save-assignment.ts`
    - Validate input with `saveAssignmentSchema`
    - If `providerConnectionId` is provided, verify the connection exists, then upsert the `ModelAssignment`
    - If `providerConnectionId` is omitted, delete the `ModelAssignment` for that `aiFunction` (revert to default)
    - Return `{ success: boolean, error?: string }`
    - Revalidate `/settings/provider`
    - _Requirements: 2.3, 2.4, 2.6_

  - [x] 3.5 Update `saveProvider` action to handle `isDefault` logic
    - When creating a new connection and no other connections exist, auto-set `isDefault: true`
    - Add a new `setDefault` server action (or inline logic) that clears `isDefault` on all connections and sets it on the target, within a transaction
    - Existing save logic remains unchanged for field persistence
    - _Requirements: 1.3, 1.4_

  - [x] 3.6 Write property tests for save/delete/assignment actions in `src/features/provider-settings/actions/__tests__/provider-actions.pbt.test.ts`
    - **Property 5: Additive connection save** — Saving a new connection increases count by one, preserves existing connections
    - **Validates: Requirements 5.1, 5.5**
    - **Property 6: Auto-default on first connection** — First connection saved gets `isDefault: true`
    - **Validates: Requirements 1.3**
    - **Property 8: Delete connection cascades correctly** — Deleting a connection removes its assignments and promotes a new default
    - **Validates: Requirements 1.5, 5.4**
    - **Property 9: Assignment uniqueness per function** — Saving assignment twice for same function results in one row
    - **Validates: Requirements 8.2**
    - **Property 10: Clearing assignment reverts to default** — Clearing an assignment makes `resolveProvider` return the default
    - **Validates: Requirements 2.4**
    - **Property 11: Assignment validation rejects invalid connection IDs** — Non-existent IDs fail validation
    - **Validates: Requirements 2.6**
    - Use `fast-check` with minimum 100 iterations per property
    - Each test must include comment tag: `// Feature: multi-model-provider, Property {N}: {title}`

- [x] 4. Checkpoint - Ensure schema, resolver, and actions work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update AI call sites to use function resolver
  - [x] 5.1 Update `generate-all-answers.ts` to use `resolveProvider("intake")`
    - Replace `prisma.providerConnection.findFirst()` and inline `ProviderConfig` construction with `resolveProvider("intake")`
    - Remove `decrypt` import (now handled by resolver)
    - Keep error handling for `null` return (no provider configured)
    - _Requirements: 3.1, 3.2, 6.1_

  - [x] 5.2 Update `generate-section-answers.ts` to use `resolveProvider("intake")`
    - Replace `prisma.providerConnection.findFirst()` and inline `ProviderConfig` construction with `resolveProvider("intake")`
    - Remove `decrypt` import
    - _Requirements: 3.1, 3.2, 6.1_

  - [x] 5.3 Update `generate-documents.ts` to use `resolveProvider("generation")`
    - Replace `prisma.providerConnection.findFirst()` and inline `ProviderConfig` construction with `resolveProvider("generation")`
    - Remove `decrypt` import
    - _Requirements: 3.1, 3.2, 7.4_

  - [x] 5.4 Update `generate-single-document.ts` to use `resolveProvider("generation")`
    - Replace `prisma.providerConnection.findFirst()` and inline `ProviderConfig` construction with `resolveProvider("generation")`
    - Remove `decrypt` import
    - _Requirements: 3.1, 3.2, 7.4_

  - [x] 5.5 Write property test for secret round-trip in `src/lib/utils/__tests__/crypto.pbt.test.ts`
    - **Property 4: Secret encrypt/decrypt round-trip** — For any non-empty string, `decrypt(encrypt(s)) === s`
    - **Validates: Requirements 3.4**
    - Use `fast-check` with minimum 100 iterations
    - Comment tag: `// Feature: multi-model-provider, Property 4: Secret encrypt/decrypt round-trip`

- [x] 6. Checkpoint - Ensure all call sites use resolver
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Redesign provider settings page
  - [x] 7.1 Update server component `src/app/(workspace)/settings/provider/page.tsx`
    - Load all `ProviderConnection` records (sanitized, no secrets)
    - Load all `ModelAssignment` records
    - Pass both lists to the new client component
    - _Requirements: 5.2, 2.1_

  - [x] 7.2 Create `src/features/provider-settings/components/provider-settings-page.tsx` client component
    - Render three sections: Connection List, Add/Edit Form, Model Assignments
    - Connection List: display each connection with provider type, model name, default indicator, last test status/timestamp, Test button, Delete button, Set as Default button
    - Add/Edit Form: reuse existing form field logic from `provider-settings-form.tsx`, with Save and Cancel buttons
    - Model Assignments section: list each AI function (`intake`, `generation`) with a dropdown to select a connection or "Default"
    - Wire up `saveProvider`, `deleteProvider`, `saveAssignment`, `setDefault`, and `testConnection` actions
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.4, 5.1, 5.2, 5.3_

  - [x] 7.3 Write property tests for UI display logic in `src/features/provider-settings/components/__tests__/provider-settings.pbt.test.ts`
    - **Property 12: Connection list displays required fields** — For any list of connections, the rendered output includes provider type, model name, test status, and default indicator on exactly the default connection
    - **Validates: Requirements 1.1, 4.4, 5.2**
    - **Property 13: Unassigned functions show default label** — For any AI function with no assignment, the UI shows "Default"
    - **Validates: Requirements 2.2**
    - Use `fast-check` with minimum 100 iterations per property
    - Each test must include comment tag: `// Feature: multi-model-provider, Property {N}: {title}`

- [x] 8. Implement regeneration notification and actions
  - [x] 8.1 Add regeneration notification logic to provider settings
    - When saving a `ProviderConnection` or `ModelAssignment` that affects the `generation` function, display a notification that existing documents may benefit from regeneration
    - Implement as a pure function that compares old vs new assignment/default state for the `generation` function
    - Show notification banner in the provider settings page after save
    - _Requirements: 7.1_

  - [x] 8.2 Update documents page with regeneration actions
    - Ensure "Regenerate All" and per-document "Regenerate" actions use `resolveProvider("generation")` via the existing `generateAllDocuments` and `generateSingleDocument` actions (already updated in task 5)
    - Add overwrite warning for documents where `manuallyEdited = true` before regeneration
    - After regeneration, update `content`, `draftContent`, `completeness`, and `generatedAt` fields
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 8.3 Write property tests for regeneration logic in `src/features/document-generation/actions/__tests__/regeneration.pbt.test.ts`
    - **Property 14: Regeneration notification on generation function change** — Any save affecting the `generation` function triggers a notification signal
    - **Validates: Requirements 7.1**
    - **Property 15: Overwrite warning for manually edited documents** — Regeneration of a `manuallyEdited = true` document produces a warning
    - **Validates: Requirements 7.5**
    - Use `fast-check` with minimum 100 iterations per property
    - Each test must include comment tag: `// Feature: multi-model-provider, Property {N}: {title}`

- [x] 9. Backward compatibility verification
  - [x] 9.1 Ensure single-connection behavior is preserved
    - Verify that when only one `ProviderConnection` exists and no `ModelAssignment` records exist, all AI functions use that single connection
    - Verify the provider settings page works without interacting with the Model Assignments section
    - Verify existing `ProviderConnection` records are treated as default without user action (fallback logic in resolver)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Write property test for default fallback change in `src/lib/ai/__tests__/resolve-provider.pbt.test.ts`
    - **Property 7: Default change applies to unassigned functions** — After changing the default, `resolveProvider` returns the new default for unassigned functions
    - **Validates: Requirements 1.4**
    - Use `fast-check` with minimum 100 iterations
    - Comment tag: `// Feature: multi-model-provider, Property 7: Default change applies to unassigned functions`

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations per property
- All CLI commands use PowerShell syntax (`;` to chain, not `&&`)
- Schema changes use `npx prisma db push` (additive, no data loss) followed by `npx prisma generate`
- The function resolver is the central change — all other tasks depend on or build upon it
- Checkpoints ensure incremental validation at key integration points
