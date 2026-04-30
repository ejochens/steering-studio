# Requirements Document

## Introduction

The Codebase Scan Intake feature allows users who select "Extending existing project" as their project type to point Steering Studio at a local codebase directory. The system uses a two-layer approach: first, deterministic parsers extract facts from well-known files (package.json, tsconfig.json, Prisma schema, CI/CD configs, etc.); then, an AI-assisted analysis layer examines unrecognized or unexpected files to extract additional project context. All extracted facts pre-fill intake section answers. Users can review, accept, or override every auto-detected value before proceeding to document generation.

## Glossary

- **Scanner**: The server-side module that reads files from a local filesystem path and extracts structured facts.
- **Scan_Result**: A structured object containing all facts extracted from a single codebase scan, organized by intake section and field.
- **Codebase_Path**: A validated absolute filesystem path to the root directory of the user's existing project.
- **Intake_Field**: A single form field within an intake section, identified by a sectionKey and fieldKey pair.
- **Project_Settings_Form**: The existing form on the project settings page where users configure project name, target output, and project type.
- **Answer**: A persisted intake field value with an associated source tag indicating how it was captured.
- **Deterministic_Parser**: A code module that extracts facts from a specific known file type using structured parsing (JSON, YAML, regex) without AI involvement.
- **AI_Analyzer**: A server-side module that sends unrecognized file content to the configured AI provider for interpretation and fact extraction.
- **Unrecognized_File**: A project configuration or documentation file found during scanning that does not match any Deterministic_Parser's known file list.

## Requirements

### Requirement 1: Codebase Path Input

**User Story:** As a user extending an existing project, I want to enter the local filesystem path to my codebase, so that the system can scan it and pre-fill intake answers.

#### Acceptance Criteria

1. WHILE the project type is "extension", THE Project_Settings_Form SHALL display a text input field for the Codebase_Path.
2. WHILE the project type is "new", THE Project_Settings_Form SHALL hide the Codebase_Path input field.
3. WHEN the user enters a Codebase_Path, THE Project_Settings_Form SHALL validate that the value is a non-empty absolute filesystem path.
4. THE Project_Settings_Form SHALL persist the Codebase_Path value to the Project record in the database.
5. WHEN a valid Codebase_Path is saved, THE Project_Settings_Form SHALL display a "Scan Codebase" button adjacent to the path input.

### Requirement 2: Path Validation

**User Story:** As a user, I want the system to validate that my codebase path points to a real, readable directory, so that I get clear feedback before scanning.

#### Acceptance Criteria

1. WHEN the user triggers a scan, THE Scanner SHALL verify that the Codebase_Path exists on the local filesystem.
2. WHEN the user triggers a scan, THE Scanner SHALL verify that the Codebase_Path points to a directory and not a file.
3. IF the Codebase_Path does not exist, THEN THE Scanner SHALL return an error message stating "Directory not found: [path]".
4. IF the Codebase_Path points to a file instead of a directory, THEN THE Scanner SHALL return an error message stating "Path is not a directory: [path]".
5. IF the Codebase_Path is not readable by the application process, THEN THE Scanner SHALL return an error message stating "Cannot read directory: [path]".

### Requirement 3: File Discovery

**User Story:** As a user, I want the scanner to find relevant configuration and documentation files in my codebase, so that it can extract useful facts without me listing every file.

#### Acceptance Criteria

1. WHEN a scan is triggered, THE Scanner SHALL check for the existence of each of the following files relative to the Codebase_Path root: package.json, tsconfig.json, jsconfig.json, prisma/schema.prisma, Dockerfile, docker-compose.yml, README.md, .kiro/steering/*.md, .github/copilot-instructions.md.
2. WHEN a scan is triggered, THE Scanner SHALL check for the existence of YAML files matching the glob pattern .github/workflows/*.yml relative to the Codebase_Path root.
3. WHEN a scan is triggered, THE Scanner SHALL read the top-level directory listing to determine project organization patterns.
4. THE Scanner SHALL read only files that exist and are readable, and skip files that are missing without treating absence as an error.
5. THE Scanner SHALL limit individual file reads to 100 KB to prevent excessive memory usage on large files.
6. WHEN a scan is triggered, THE Scanner SHALL collect Unrecognized_Files — project configuration and documentation files at the root or in recognized config directories that do not match any Deterministic_Parser's known file list. Examples include: Cargo.toml, go.mod, build.gradle, pom.xml, Makefile, .terraform/, pyproject.toml, Gemfile, composer.json, angular.json, vue.config.js, nuxt.config.ts, and similar.

### Requirement 4: Fact Extraction from package.json

**User Story:** As a user, I want the scanner to extract framework, dependency, test runner, and build tool information from my package.json, so that the tech stack intake fields are pre-filled accurately.

#### Acceptance Criteria

1. WHEN package.json exists and is valid JSON, THE Scanner SHALL extract the "name" field and map it to the Intake_Field product-name in the product-and-users section.
2. WHEN package.json contains a "description" field, THE Scanner SHALL extract it and map it to the Intake_Field product-purpose in the product-and-users section.
3. WHEN package.json contains dependencies or devDependencies, THE Scanner SHALL identify known frameworks (React, Next.js, Vue, Angular, Express, Fastify, NestJS) and map them to the Intake_Field frameworks in the tech-stack-and-architecture section.
4. WHEN package.json contains dependencies or devDependencies, THE Scanner SHALL identify known test runners (vitest, jest, mocha, playwright, cypress) and map them to the Intake_Field testing-framework in the testing-and-quality section.
5. WHEN package.json contains dependencies or devDependencies, THE Scanner SHALL identify known build tools (webpack, vite, esbuild, turbopack, rollup) and map them to the Intake_Field coding-standards in the tech-stack-and-architecture section as supplementary build tool information.
6. WHEN package.json contains dependencies referencing TypeScript, THE Scanner SHALL include "TypeScript" in the Intake_Field programming-languages in the tech-stack-and-architecture section.

### Requirement 5: Fact Extraction from TypeScript Configuration

**User Story:** As a user, I want the scanner to detect TypeScript usage and path alias configuration, so that project structure conventions are captured.

#### Acceptance Criteria

1. WHEN tsconfig.json exists and is valid JSON, THE Scanner SHALL add "TypeScript" to the Intake_Field programming-languages in the tech-stack-and-architecture section.
2. WHEN tsconfig.json contains compilerOptions.paths entries, THE Scanner SHALL include path alias information in the Intake_Field coding-standards in the project-structure-and-conventions section.
3. WHEN tsconfig.json does not exist but jsconfig.json exists, THE Scanner SHALL extract path alias information from jsconfig.json instead.

### Requirement 6: Fact Extraction from Database and ORM Configuration

**User Story:** As a user, I want the scanner to detect my database and ORM setup, so that the database intake field is pre-filled.

#### Acceptance Criteria

1. WHEN prisma/schema.prisma exists, THE Scanner SHALL extract the datasource provider value and map it to the Intake_Field database in the tech-stack-and-architecture section.
2. WHEN prisma/schema.prisma exists, THE Scanner SHALL include "Prisma" as the ORM in the database field value.
3. WHEN package.json contains dependencies for other ORMs (typeorm, sequelize, drizzle-orm, knex, mongoose), THE Scanner SHALL identify the ORM and map it to the Intake_Field database in the tech-stack-and-architecture section.

### Requirement 7: Fact Extraction from CI/CD Configuration

**User Story:** As a user, I want the scanner to detect my CI/CD setup from workflow files, so that the workflows intake section is pre-filled.

#### Acceptance Criteria

1. WHEN .github/workflows/*.yml files exist, THE Scanner SHALL set the Intake_Field source-control-platform in the workflows-and-team-practices section to "GitHub".
2. WHEN .github/workflows/*.yml files exist, THE Scanner SHALL extract workflow names and trigger events and map a summary to the Intake_Field ci-cd-approach in the workflows-and-team-practices section.
3. THE Scanner SHALL read a maximum of 5 workflow files to prevent excessive processing.

### Requirement 8: Fact Extraction from Deployment Configuration

**User Story:** As a user, I want the scanner to detect my deployment patterns from Docker configuration, so that the hosting and deployment intake field is pre-filled.

#### Acceptance Criteria

1. WHEN Dockerfile exists, THE Scanner SHALL include "Docker" in the Intake_Field hosting-deployment in the tech-stack-and-architecture section.
2. WHEN docker-compose.yml exists, THE Scanner SHALL include "Docker Compose" in the Intake_Field hosting-deployment in the tech-stack-and-architecture section.
3. WHEN docker-compose.yml contains service definitions with known database images (postgres, mysql, redis, mongo), THE Scanner SHALL include the database name in the Intake_Field database in the tech-stack-and-architecture section.

### Requirement 9: Fact Extraction from README

**User Story:** As a user, I want the scanner to extract project purpose and setup context from my README, so that the product description fields are pre-filled.

#### Acceptance Criteria

1. WHEN README.md exists, THE Scanner SHALL extract the first heading and first paragraph and map them to the Intake_Field product-purpose in the product-and-users section if no product-purpose was already extracted from package.json.
2. THE Scanner SHALL limit README.md reading to the first 10 KB of content.

### Requirement 10: Fact Extraction from Directory Structure

**User Story:** As a user, I want the scanner to detect my project organization from the directory layout, so that the project structure intake fields are pre-filled.

#### Acceptance Criteria

1. WHEN a scan is triggered, THE Scanner SHALL read the top-level directory names and map recognized patterns to the Intake_Field folder-structure in the project-structure-and-conventions section.
2. WHEN the top-level directory contains a "src" folder, THE Scanner SHALL also read one level of subdirectories under "src" to detect organization patterns (e.g. src/features, src/components, src/lib).
3. WHEN the directory structure contains feature-based grouping (e.g. src/features/*), THE Scanner SHALL set the Intake_Field module-organization in the project-structure-and-conventions section to "Feature-based (grouped by domain)".
4. WHEN the directory structure contains layer-based grouping (e.g. src/controllers, src/services, src/models), THE Scanner SHALL set the Intake_Field module-organization to "Layer-based (grouped by type)".

### Requirement 11: Fact Extraction from Existing Steering Documents

**User Story:** As a user, I want the scanner to detect and read any existing Kiro steering or Copilot instruction files, so that prior context is preserved and surfaced.

#### Acceptance Criteria

1. WHEN .kiro/steering/*.md files exist, THE Scanner SHALL read their content and include a summary in the Intake_Field future-considerations in the scope-and-non-goals section noting that existing steering documents were found.
2. WHEN .github/copilot-instructions.md exists, THE Scanner SHALL read its content and include a summary in the Intake_Field future-considerations in the scope-and-non-goals section noting that existing Copilot instructions were found.

### Requirement 12: AI-Assisted Analysis of Unrecognized Files

**User Story:** As a user, I want the scanner to use AI to interpret project files it doesn't have built-in parsers for, so that my intake is pre-filled even when my tech stack isn't in the hardcoded list.

#### Acceptance Criteria

1. WHEN the Scanner discovers Unrecognized_Files during file discovery, THE AI_Analyzer SHALL send the file names and truncated content (first 5 KB per file, max 10 files) to the configured AI provider for interpretation.
2. THE AI_Analyzer SHALL prompt the AI provider to identify: programming languages, frameworks, libraries, build tools, test runners, databases, deployment targets, and any other project facts relevant to intake sections.
3. THE AI_Analyzer SHALL map the AI provider's response to specific sectionKey and fieldKey pairs using the same Scan_Result structure as the Deterministic_Parsers.
4. WHEN the AI_Analyzer extracts facts, THE Scanner SHALL save them as Answer records with the source field set to "ai-codebase-scan" to distinguish them from deterministic scan results.
5. IF no AI provider is configured, THEN THE AI_Analyzer SHALL be skipped and the Scanner SHALL proceed with only deterministic parser results.
6. IF the AI provider call fails or times out, THEN THE AI_Analyzer SHALL log the error and the Scanner SHALL proceed with only deterministic parser results, adding a warning to the scan summary.
7. WHEN both a Deterministic_Parser and the AI_Analyzer produce a value for the same Intake_Field, THE Deterministic_Parser result SHALL take precedence.
8. THE AI_Analyzer SHALL not send file content matching the security exclusion patterns defined in Requirement 17.
9. WHEN the AI_Analyzer produces facts, THE scan summary SHALL indicate how many fields were populated by AI analysis versus deterministic parsing.

### Requirement 13: Scan Result Assembly

**User Story:** As a user, I want all extracted facts to be assembled into a single structured result, so that they can be mapped to intake fields consistently.

#### Acceptance Criteria

1. THE Scanner SHALL produce a Scan_Result object that maps each extracted fact to a specific sectionKey and fieldKey pair from the existing intake section configuration.
2. THE Scanner SHALL include a source file reference for each extracted fact, indicating which file the fact was derived from.
3. THE Scanner SHALL merge facts from multiple source files into a single value per Intake_Field when multiple files contribute to the same field.
4. FOR ALL valid Scan_Result objects, serializing to JSON then deserializing SHALL produce an equivalent Scan_Result object (round-trip property).

### Requirement 14: Intake Pre-Fill from Scan Results

**User Story:** As a user, I want scan results to be saved as intake answers with a distinct source tag, so that I can distinguish auto-detected values from manually entered ones.

#### Acceptance Criteria

1. WHEN a scan completes, THE Scanner SHALL save each extracted fact as an Answer record with the source field set to "codebase-scan".
2. WHEN a scan completes and an Intake_Field already has a user-entered answer (source "user-form"), THE Scanner SHALL preserve the existing user-entered answer and not overwrite it.
3. WHEN a scan completes and an Intake_Field already has a previous scan answer (source "codebase-scan"), THE Scanner SHALL overwrite the previous scan answer with the new value.
4. WHEN answers are saved from a scan, THE Scanner SHALL recalculate the coverageStatus for each affected IntakeSection.

### Requirement 15: Scan Status and Feedback

**User Story:** As a user, I want to see the progress and results of a codebase scan, so that I know what was detected and can take action.

#### Acceptance Criteria

1. WHILE a scan is in progress, THE Project_Settings_Form SHALL display a loading indicator with the text "Scanning codebase…".
2. WHEN a scan completes, THE Project_Settings_Form SHALL display a summary showing the number of files scanned, the number of intake fields populated by deterministic parsing, and the number populated by AI analysis.
3. IF a scan completes with zero extracted facts from both deterministic and AI analysis, THEN THE Project_Settings_Form SHALL display a message stating "No recognizable project files found at the specified path."
4. IF a scan encounters an error, THEN THE Project_Settings_Form SHALL display the error message and allow the user to retry.

### Requirement 16: Review and Override of Scanned Values

**User Story:** As a user, I want to review and override any auto-detected intake values, so that I maintain control over the information used for document generation.

#### Acceptance Criteria

1. WHEN an Intake_Field has a value with source "codebase-scan", THE intake form SHALL display a visual indicator (badge or label) showing "Auto-detected" next to the field.
2. WHEN an Intake_Field has a value with source "ai-codebase-scan", THE intake form SHALL display a visual indicator showing "AI-detected" next to the field.
3. WHEN the user edits an Intake_Field that has source "codebase-scan" or "ai-codebase-scan", THE intake form SHALL update the source to "user-form" upon save.
4. THE intake form SHALL allow the user to clear any auto-detected or AI-detected value and leave the field empty.

### Requirement 17: Security Constraints

**User Story:** As a developer, I want the scanner to operate within safe boundaries, so that it cannot be used to read arbitrary files outside the target codebase.

#### Acceptance Criteria

1. THE Scanner SHALL resolve the Codebase_Path to an absolute path and verify that all file reads occur within that resolved directory.
2. THE Scanner SHALL reject any Codebase_Path that resolves to a system root directory (e.g. "C:\\" or "/").
3. THE Scanner SHALL not follow symbolic links that resolve to locations outside the Codebase_Path directory.
4. THE Scanner SHALL not read files matching common sensitive patterns: .env, .env.*, *.pem, *.key, *secret*, *credential*.
5. IF a file read fails due to permissions, THEN THE Scanner SHALL skip the file and continue scanning remaining files.
