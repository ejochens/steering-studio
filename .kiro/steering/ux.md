# UX and Product Design Guidance

## UX goal

The application should feel like a structured workshop with an intelligent facilitator, not like a blank chatbot.

Users should always know:
- where they are in the process
- what information is still missing
- why a question is being asked
- what documents will be produced from their input

## Core UX pattern

Use a **hybrid intake experience**:

1. structured forms for known fields
2. embedded AI conversation for clarification and deeper discovery
3. a live completeness view that reflects confidence and missing information
4. editable document previews before export

## Site architecture and navigation

### Route map

```text
/                           → Home / Dashboard
├── /projects/new           → New Project wizard
├── /projects/[id]          → Project workspace (with sub-navigation)
│   ├── /intake             → Guided intake sections
│   ├── /review             → AI review and clarification
│   ├── /documents          → Preview and edit generated docs
│   └── /export             → Export options
└── /settings               → Application settings
    └── /provider           → Provider configuration
```

### Home / Dashboard (`/`)

The home page is the entry point for the application. It should:
- show a list of existing projects with name, target output, and progress status
- provide a clear "New Project" action
- show a "Continue" action for in-progress projects that routes to the last active section
- display a provider status indicator (configured / not configured) with a link to settings
- if no projects exist, show a welcome state with guidance on getting started

### Application settings (`/settings`)

A dedicated area outside the project flow for application-wide configuration.
- accessible from the header or top-level navigation at all times
- `/settings/provider` for provider connection setup and testing
- designed to expand later for additional global preferences

### Project workspace (`/projects/[id]`)

The workspace is the main working area for a single project. It should:
- show a persistent sub-navigation (sidebar or horizontal tabs) for intake, chat, documents, and export
- display the project name and target output in the header or breadcrumb
- show a setup checklist or progress summary until all sections are addressed
- default to the intake section when first entering a project

### Layout patterns

**Shell layout** (wraps all pages):
- header with application name, home link, and settings link
- main content area below the header
- consistent across all pages

**Workspace layout** (wraps `/projects/[id]/*` pages):
- inherits the shell layout
- adds project-specific sub-navigation (sidebar or tabs)
- shows project name in a breadcrumb or sub-header
- content area for the active section

**Settings layout** (wraps `/settings/*` pages):
- inherits the shell layout
- simple content area, no project context needed

### Navigation rules

- the header should always show a way to return home and access settings
- within a project workspace, sub-navigation should clearly indicate the active section
- the user should never lose context about which project they are working in
- navigation between projects should go through the home dashboard
- provider settings should be reachable without entering a project

## Primary screens

### 1. Project setup

Capture:
- project name
- working title
- output target: Kiro, Copilot, Both
- project type
- optional industry or domain

### 2. Provider settings (application-level, not per-project)

Provider settings are configured once at the application level and shared across all projects. The user should not need to reconfigure the provider each time they create a new project.

Capture:
- provider type
- endpoint or region
- model name
- authentication method
- optional temperature and token settings
- connection test result

This screen should be accessible from a global settings area, not embedded in the per-project flow.

### 3. Guided intake workspace

Break intake into sections:
- product and users
- problem and outcomes
- scope and non-goals
- tech stack and architecture
- project structure and conventions
- testing and quality
- security and compliance
- workflows and team practices

### 4. AI clarification panel

The assistant should ask only useful follow-up questions. It must not ask for information already confirmed unless something conflicts.

### 5. Document preview and editor

Show generated documents in a navigable side panel with:
- document list
- completeness or confidence indicators
- last generated timestamp
- edit mode
- regenerate-one-document action

### 6. Export view

Let the user choose:
- export all files
- export Kiro only
- export Copilot only

Export triggers a standard browser file download of a ZIP file. The user saves it via their browser's download behavior and manually extracts it into their target repository root. No direct file system writes for the MVP.

## Design principles

### Progressive disclosure

Show only the next relevant set of inputs. Avoid overwhelming the user with every question at once.

### Explainability

When AI asks a question or changes a draft, explain why.

### Reviewability

Make it easy to compare captured facts against generated output.

### Recoverability

Users must be able to revise answers and regenerate documents without starting over.

### Confidence over speed

It is better to generate a smaller but accurate starter pack than a long set of generic documents.

## Interaction rules

- Never drop the user into an empty chat as the first interaction.
- Always seed the process with clear sections and starter questions.
- Use checklists or progress indicators for section completion.
- Mark fields as required, optional, inferred, or unresolved.
- Allow the user to override AI-inferred content.

## Accessibility rules

- Keyboard navigable forms and chat controls
- High-contrast states for required and incomplete fields
- Accessible labels and error messages
- Avoid relying on color alone for completeness or status

## Copy style

- practical
- direct
- non-marketing
- useful to architects and senior engineers

Avoid gimmicky AI language. The product should feel trustworthy and professional.

## MVP user success test

A user should be able to complete the first project without training, understand what each section is for, and export a usable draft pack in one sitting.
