# Tasks: Codebase Scan Intake

## Task 1: Schema and Validation Changes

- [x] 1.1 Add nullable `codebasePath String?` column to the `Project` model in `prisma/schema.prisma`
- [x] 1.2 Run `npx prisma db push` and `npx prisma generate` to apply the schema change
- [x] 1.3 Add `codebasePath` field to `updateProjectSettingsSchema` in `src/lib/validation/project.ts` as `z.string().optional()`
- [x] 1.4 Update `updateProjectSettings` server action to persist `codebasePath`
- [x] 1.5 Create `src/lib/validation/scan.ts` with `scanCodebaseSchema` and `scanFactSchema` Zod schemas

## Task 2: Core Types and Data Structures

- [x] 2.1 Create `src/features/codebase-scan/lib/types.ts` with `ScanFact`, `ScanResult`, `ScanSummary`, `PathValidationResult`, `DiscoveredFiles`, `PersistResult` interfaces
- [x] 2.2 Write property test for ScanResult JSON round-trip (Property 14)

## Task 3: Path Validation

- [x] 3.1 Create `src/features/codebase-scan/lib/validate-path.ts` implementing `validateCodebasePath`
- [x] 3.2 Write property test for path validation (Property 1)
- [x] 3.3 Write unit tests for path validation edge cases (system roots, symlinks, relative paths)

## Task 4: Security — File Filtering and Path Containment

- [x] 4.1 Create `src/features/codebase-scan/lib/security.ts` with `isSensitiveFile(filename)` and `isWithinDirectory(filePath, rootPath)` helpers
- [x] 4.2 Write property test for sensitive file exclusion (Property 10)
- [x] 4.3 Write property test for path containment (Property 11)

## Task 5: File Discovery

- [x] 5.1 Create `src/features/codebase-scan/lib/discover-files.ts` implementing `discoverFiles`
- [x] 5.2 Write property test for file discovery correctness (Property 2)
- [x] 5.3 Write property test for file read size limits (Property 3)

## Task 6: Deterministic Parsers

- [x] 6.1 Create `src/features/codebase-scan/lib/parsers/package-json.ts`
- [x] 6.2 Write property test for package.json parser (Property 4)
- [x] 6.3 Create `src/features/codebase-scan/lib/parsers/tsconfig.ts`
- [x] 6.4 Write property test for tsconfig parser (Property 5)
- [x] 6.5 Create `src/features/codebase-scan/lib/parsers/prisma-schema.ts`
- [x] 6.6 Write property test for Prisma schema parser (Property 6)
- [x] 6.7 Create `src/features/codebase-scan/lib/parsers/ci-cd.ts`
- [x] 6.8 Write property test for CI/CD parser (Property 7)
- [x] 6.9 Create `src/features/codebase-scan/lib/parsers/dockerfile.ts`
- [x] 6.10 Write property test for Docker parser (Property 8)
- [x] 6.11 Create `src/features/codebase-scan/lib/parsers/readme.ts`
- [x] 6.12 Create `src/features/codebase-scan/lib/parsers/directory-structure.ts`
- [x] 6.13 Write property test for directory structure analysis (Property 9)
- [x] 6.14 Create `src/features/codebase-scan/lib/parsers/steering-docs.ts`
- [x] 6.15 Write unit tests for each parser with realistic fixture files

## Task 7: Result Merger

- [x] 7.1 Create `src/features/codebase-scan/lib/merge-results.ts` implementing `mergeResults`
- [x] 7.2 Write property test for deterministic precedence over AI (Property 12)
- [x] 7.3 Write property test for merge deduplication (Property 13)

## Task 8: AI Analyzer

- [x] 8.1 Create `src/features/codebase-scan/lib/ai-analyzer.ts` implementing `analyzeUnrecognizedFiles`
- [x] 8.2 Write unit tests for AI analyzer with mocked provider (prompt construction, response parsing, error handling)

## Task 9: Answer Persistence

- [x] 9.1 Create `src/features/codebase-scan/lib/persist-scan.ts` implementing `persistScanResults`
- [x] 9.2 Write property test for persistence source precedence (Property 15)
- [x] 9.3 Write unit tests for coverage recalculation after scan

## Task 10: Server Action

- [x] 10.1 Create `src/features/codebase-scan/actions/scan-codebase.ts` orchestrating the full scan pipeline
- [x] 10.2 Write integration test for full scan pipeline with temp directory

## Task 11: UI — Settings Form Changes

- [x] 11.1 Add codebasePath text input to `project-settings-form.tsx` (visible only when projectType is "extension")
- [x] 11.2 Add "Scan Codebase" button that triggers the `scanCodebase` server action
- [x] 11.3 Add scan status display (loading indicator, summary, error states)
- [x] 11.4 Update settings page to pass `codebasePath` prop to the form
- [x] 11.5 Write unit test verifying codebasePath input visibility toggles with projectType

## Task 12: UI — Intake Form Source Badges

- [x] 12.1 Update `intake-field.tsx` to display "Auto-detected" badge when answer source is "codebase-scan"
- [x] 12.2 Update `intake-field.tsx` to display "AI-detected" badge when answer source is "ai-codebase-scan"
- [x] 12.3 Verify existing `saveAnswer` action correctly sets source to "user-form" on edit (existing behavior)
