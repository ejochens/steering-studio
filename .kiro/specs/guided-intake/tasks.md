# Guided Intake — Tasks

## Task 1: Database schema and migrations

- [x] 1.1 Add IntakeSection and Answer models to prisma/schema.prisma with relations to Project, unique constraints, and cascade deletes
- [x] 1.2 Add intakeSections relation to the existing Project model
- [x] 1.3 Run `npx prisma generate` to regenerate the Prisma client

## Task 2: Validation schemas

- [x] 2.1 Create `src/lib/validation/intake.ts` with sectionKeySchema, fieldSourceSchema, coverageStatusSchema, and saveAnswerSchema
- [x] 2.2 Export intake schemas from `src/lib/validation/index.ts`

## Task 3: Section configuration

- [x] 3.1 Create `src/features/intake/config/sections.ts` with typed IntakeFieldDef, IntakeSectionDef interfaces and the INTAKE_SECTIONS constant defining all 8 sections with their fields, help text, and placeholders

## Task 4: Coverage calculation logic

- [x] 4.1 Create `src/features/intake/lib/calculate-coverage.ts` with the pure calculateCoverage function
- [x] 4.2 Write unit tests for calculateCoverage in `src/features/intake/lib/__tests__/calculate-coverage.test.ts`
- [x] 4.3 [PBT] Write property-based test: Coverage calculation correctness — *For any* set of field definitions and answer maps, calculateCoverage returns the correct status based on required field completion

## Task 5: Server actions

- [x] 5.1 Create `src/features/intake/actions/init-intake-sections.ts` — creates 8 IntakeSection rows for a project if they don't exist
- [x] 5.2 Create `src/features/intake/actions/save-answer.ts` — validates input, upserts Answer, recalculates coverage, transitions project status
- [x] 5.3 Write integration test for initIntakeSections in `tests/integration/init-intake-sections.test.ts`
- [x] 5.4 Write integration test for saveAnswer in `tests/integration/save-answer.test.ts`
- [x] 5.5 [PBT] Write property-based test: Answer persistence round trip — *For any* valid answer input, saving and reading back returns the same value with source "user-form"
- [x] 5.6 [PBT] Write property-based test: Validation rejects invalid inputs — *For any* invalid saveAnswer input, the action returns an error and no DB write occurs
- [x] 5.7 [PBT] Write property-based test: User-form overrides AI-inferred — *For any* field with an AI-inferred answer, saving a user-form value replaces it and updates the source
- [x] 5.8 [PBT] Write property-based test: Intake initialization creates eight sections — *For any* project, initIntakeSections creates exactly 8 sections with correct keys, order, and "unknown" coverage
- [x] 5.9 [PBT] Write property-based test: Project status transition on first answer — *For any* project in "setup" status, saving the first answer transitions status to "intake"; later statuses are unchanged

## Task 6: Intake page route and data loading

- [x] 6.1 Create `src/app/(workspace)/projects/[projectId]/intake/page.tsx` as a server component that fetches the project, initializes intake sections, loads answers, and renders the intake client components
- [x] 6.2 Handle not-found project with notFound() and error states with a retry UI

## Task 7: Client components

- [x] 7.1 Create `src/features/intake/components/intake-field.tsx` — renders the appropriate input control based on FieldType, shows field status badge, calls saveAnswer on blur, displays validation errors inline
- [x] 7.2 Create `src/features/intake/components/intake-section.tsx` — renders section header (clickable), description, and fields; shows coverage badge when collapsed
- [x] 7.3 Create `src/features/intake/components/completeness-sidebar.tsx` — lists all 8 sections with coverage status using text labels + icons, each item is a button that expands the corresponding section
- [x] 7.4 Create `src/features/intake/components/intake-accordion.tsx` — manages single-expansion state, renders sections and sidebar in a two-column layout
- [x] 7.5 [PBT] Write property-based test: Accordion single-expansion invariant — *For any* sequence of expand operations, exactly one section is expanded at a time

## Task 8: Configuration validation tests

- [x] 8.1 [PBT] Write property-based test: Section config completeness — *For any* section in INTAKE_SECTIONS, it has non-empty displayName, description, and all fields have label, helpText, valid type, and valid status
- [x] 8.2 [PBT] Write property-based test: Starter content present for all sections — *For any* section, every field has non-empty placeholder or helpText, and the section has a non-empty description

## Task 9: Unique constraint tests

- [x] 9.1 [PBT] Write property-based test: Unique constraint enforcement — *For any* duplicate (projectId, sectionKey) or (intakeSectionId, fieldKey), the database rejects the second insert
