# Bootstrap Foundation Design

## Overview

This slice creates the minimum viable shell for Steering Studio. It does not attempt to implement intake, chat extraction, or full markdown generation yet. It establishes the repository structure, route layout, persistence, provider abstraction, and UI foundations required for later vertical slices.

## Scope

In scope:
- new project flow
- project workspace shell
- provider settings form
- provider connection test action
- persistence model for Project and ProviderConnection
- baseline test coverage

Out of scope:
- guided intake wizard
- AI clarification chat
- document generation
- ZIP export
- multi-user collaboration

## Architecture

### Pages and routes

- `/` for home dashboard showing project list and provider status
- `/projects/new` for project creation
- `/projects/[projectId]` for workspace overview (defaults to intake)
- `/settings/provider` for application-level provider configuration (shared across all projects)

### Layouts

- **Shell layout**: wraps all pages with a header containing the app name, home link, and settings link
- **Workspace layout**: wraps project pages, adds project-specific sub-navigation (intake, chat, documents, export) and project name breadcrumb
- **Settings layout**: wraps settings pages with a simple content area

### Data model

Proposed initial entities:

- `Project`
  - `id`
  - `name`
  - `workingTitle`
  - `targetOutput`
  - `createdAt`
  - `updatedAt`

- `ProviderConnection`
  - `id`
  - `providerType`
  - `endpoint`
  - `region`
  - `modelName`
  - `authMode`
  - `encryptedSecret` or session-bound secret reference
  - `lastTestStatus`
  - `lastTestedAt`
  - `createdAt`
  - `updatedAt`

Note: `ProviderConnection` is application-level (no `projectId`). A single provider configuration is shared across all projects.

### Server boundaries

All provider interactions occur on the server. The UI submits validated form data to server handlers. Provider secrets are never returned to the browser after save.

### Provider abstraction

Create a minimal provider test interface:

- `testConnection(config): Promise<ConnectionTestResult>`

For this slice, it is acceptable to implement only one working adapter first, as long as the interface supports additional adapters later.

### UI behavior

The workspace overview should show a simple setup checklist:
- project created
- provider configured
- intake not started
- documents not generated

This gives the user immediate orientation without waiting for later features.

## Validation and errors

- validate form data with shared Zod schemas
- show field-level errors for user input problems
- show general error banners for failed save or connection test actions
- do not display raw provider exception details directly when they may include sensitive information

## Testing approach

- unit tests for schema validation and provider config normalization
- integration-style tests for server handlers using mocked provider adapters
- one Playwright flow covering create project, open provider settings, test connection, and save

## Risks and mitigations

### Risk: provider support grows too fast

Mitigation: keep a strict adapter interface and implement one adapter at a time.

### Risk: secrets leak to the client

Mitigation: keep save and test logic server-only and sanitize returned payloads.

### Risk: the UI feels empty after setup

Mitigation: show a setup checklist and placeholders for upcoming sections.
