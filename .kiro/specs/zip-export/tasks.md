# Implementation Plan: ZIP Export

## Overview

Build the ZIP export feature bottom-up: install dependencies, create validation schemas, implement pure logic modules with tests, wire up the API route, then build the React UI layer. Each pure module is tested with both unit tests and property-based tests before moving to the next layer.

## Tasks

- [x] 1. Install dependencies and create Zod validation schemas
  - [x] 1.1 Install `fflate` as a production dependency
    - Run `npm install fflate` to add it to `package.json` dependencies
    - _Requirements: 5.1_

  - [x] 1.2 Create Zod validation schemas at `src/lib/validation/export.ts`
    - Define `exportScopeSchema` as `z.enum(["all", "kiro", "copilot"])`
    - Define `exportRequestSchema` with `projectId` (string, min 1) and `scope` (exportScopeSchema)
    - Export `ExportScope` and `ExportRequestInput` types
    - Import `z` from `zod/v4`
    - _Requirements: 10.1, 10.2_

  - [x] 1.3 Add barrel exports to `src/lib/validation/index.ts`
    - Re-export `exportScopeSchema`, `exportRequestSchema`, `ExportScope`, and `ExportRequestInput` from `./export`
    - _Requirements: 10.1, 10.2_

- [x] 2. Implement scope resolution module
  - [x] 2.1 Create `src/features/export/lib/scope.ts`
    - Implement `getAllowedScopes(targetOutput)`: "Kiro" → ["kiro"], "Copilot" → ["copilot"], "Both" → ["all", "kiro", "copilot"]
    - Implement `getDefaultScope(targetOutput)`: "Kiro" → "kiro", "Copilot" → "copilot", "Both" → "all"
    - Implement `getTemplatesForScope(scope, targetOutput)` using `getTemplatesForTarget()` from template-registry, filtering by target field
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.3, 5.4, 5.5_

  - [x] 2.2 Write unit tests at `src/features/export/lib/__tests__/scope.test.ts`
    - Test each TargetOutput → allowed scopes mapping
    - Test each TargetOutput → default scope mapping
    - Test template filtering for each scope value
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.3 Write property test for scope filtering
    - **Property 5: Scope filtering includes only target-appropriate documents**
    - Test file: `src/features/export/lib/__tests__/scope.pbt.test.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [x] 3. Implement slugify module
  - [x] 3.1 Create `src/features/export/lib/slugify.ts`
    - Implement `slugify(input)`: lowercase, replace non-alphanumeric with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens, fallback to "project" for empty result
    - Implement `buildExportFilename(projectName, scope)`: returns `steering-studio-{slug}-{scopeSegment}.zip` with scope mapping "all" → "both", "kiro" → "kiro", "copilot" → "copilot"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Write unit tests at `src/features/export/lib/__tests__/slugify.test.ts`
    - Test slugify with spaces, special characters, unicode, consecutive hyphens, empty-ish strings
    - Test buildExportFilename for each scope value
    - _Requirements: 6.1, 6.2_

  - [x] 3.3 Write property test for slugify
    - **Property 6: Slugify produces valid filename segments**
    - Test file: `src/features/export/lib/__tests__/slugify.pbt.test.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 6.2**

  - [x] 3.4 Write property test for export filename
    - **Property 7: Export filename follows the naming convention**
    - Test file: `src/features/export/lib/__tests__/slugify.pbt.test.ts` (same file, second property)
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 6.1, 6.3, 6.4, 6.5**

- [x] 4. Implement export validation module
  - [x] 4.1 Create `src/features/export/lib/validate-export.ts`
    - Define types: `DocumentStatus`, `DocumentReadiness`, `ReadinessResult`
    - Implement `validateExportReadiness(generatedDocs, expectedTemplates)` with status logic: missing → "missing", empty content → "empty", partial completeness → "warning" with parsed missingFields, otherwise → "ready"
    - Compute `summary` counts, `canExport` (no required missing/empty), `allReady` (all "ready")
    - Handle edge cases: invalid JSON in missingFields → empty array, unknown completeness → "ready"
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.4, 4.5, 9.1, 9.2_

  - [x] 4.2 Write unit tests at `src/features/export/lib/__tests__/validate-export.test.ts`
    - Test each document status assignment (ready, warning, missing, empty)
    - Test canExport and allReady flags
    - Test edge cases: invalid JSON missingFields, unknown completeness values
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.3 Write property test for validator status assignment
    - **Property 1: Validator assigns correct document status**
    - Test file: `src/features/export/lib/__tests__/validate-export.pbt.test.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 4.4 Write property test for validator summary consistency
    - **Property 2: Validator summary counts are consistent**
    - Test file: `src/features/export/lib/__tests__/validate-export.pbt.test.ts` (same file, second property)
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 4.4**

  - [x] 4.5 Write property test for canExport logic
    - **Property 3: canExport is true iff no required document is missing or empty**
    - Test file: `src/features/export/lib/__tests__/validate-export.pbt.test.ts` (same file, third property)
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 4.5, 9.1, 9.2**

- [x] 5. Implement ZIP packager module
  - [x] 5.1 Create `src/features/export/lib/zip-packager.ts`
    - Implement `buildZipArchive(files)` using `fflate.zipSync()` with `TextEncoder` for content encoding
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 5.2 Write unit tests at `src/features/export/lib/__tests__/zip-packager.test.ts`
    - Test with known file entries, decompress with `fflate.unzipSync`, verify paths and content match
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 5.3 Write property test for ZIP round-trip
    - **Property 4: ZIP archive round-trip preserves paths and content**
    - Test file: `src/features/export/lib/__tests__/zip-packager.pbt.test.ts`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 5.1, 5.2, 5.6**

- [x] 6. Checkpoint - Pure logic modules
  - Ensure all tests pass by running `npx vitest --run src/features/export/lib`. Ask the user if questions arise.

- [x] 7. Implement API route
  - [x] 7.1 Create `src/app/api/export/[projectId]/route.ts`
    - Implement GET handler: parse projectId from route params, parse scope from query string using Zod schemas
    - Load project from Prisma (select name, targetOutput), return 404 if not found
    - Validate scope is allowed for project targetOutput, return 400 if not
    - Resolve templates via `getTemplatesForScope()`, load generated documents from Prisma
    - Filter documents to scope file paths, return 404 if no documents match
    - Build ZIP via `buildZipArchive()`, build filename via `buildExportFilename()`
    - Return NextResponse with ZIP body, `Content-Type: application/zip`, `Content-Disposition: attachment; filename="..."`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 7.2 Write integration tests at `src/app/api/export/[projectId]/__tests__/route.test.ts`
    - Test success path: valid project and scope → 200 with ZIP binary and correct headers
    - Test 404: invalid project ID
    - Test 400: invalid scope, scope not allowed for target
    - Test 404: no documents for scope
    - Mock Prisma client for all tests
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8. Checkpoint - API route tests
  - Ensure all tests pass by running `npx vitest --run src/app/api/export`. Ask the user if questions arise.

- [x] 9. Implement React UI components
  - [x] 9.1 Create `ExportEmptyState` at `src/features/export/components/export-empty-state.tsx`
    - Display guidance prompting user to generate documents before exporting
    - Include link to the documents page (`/projects/[projectId]/documents`)
    - _Requirements: 1.3_

  - [x] 9.2 Create `ScopeSelector` at `src/features/export/components/scope-selector.tsx`
    - Render radio buttons for allowed scopes
    - Disable when only one scope is allowed (single-target projects)
    - Accept `scope`, `allowedScopes`, and `onChange` props
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 9.3 Create `ReadinessReport` at `src/features/export/components/readiness-report.tsx`
    - Display documents grouped by status: ready, warning, missing
    - Show file path for each document
    - Show missing fields for warning documents
    - Display summary counts (ready / warning / missing)
    - Show "Ready for export" banner when `allReady` is true
    - Show "Go to Documents" link when required docs are missing or empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 9.4 Create `ExportWorkspace` at `src/features/export/components/export-workspace.tsx`
    - Client component orchestrating ScopeSelector, ReadinessReport, and export button
    - Manage state: scope, isDownloading, downloadStatus, errorMessage, showWarning
    - On scope change: re-validate readiness client-side
    - On export click: show sensitive content warning, fetch `/api/export/[projectId]?scope=...`, trigger browser download via blob URL
    - Show loading indicator during download, success message on completion, error message on failure
    - Disable export button while downloading or when `canExport` is false
    - Display message about missing required documents when export is blocked
    - _Requirements: 3.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 9.1, 9.2, 9.3_

- [x] 10. Implement export page route
  - [x] 10.1 Create `src/app/(workspace)/projects/[projectId]/export/page.tsx`
    - Server component: load project (name, targetOutput) and generated documents from Prisma
    - Compute defaultScope, allowedScopes via scope module
    - Compute readiness via `validateExportReadiness()` with default scope templates
    - Render `ExportEmptyState` if no documents exist
    - Otherwise render `ExportWorkspace` with all computed props
    - _Requirements: 1.1, 1.2, 1.3, 3.1_

- [x] 11. Final checkpoint - All tests pass
  - Ensure all tests pass by running `npx vitest --run`. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All CLI commands use PowerShell syntax (`;` separators, not `&&`)
- Use `npx vitest --run` for single-execution test runs
