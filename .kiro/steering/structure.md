# Project Structure

## Intent

The repository should be organized by **feature domain** first and shared infrastructure second. Keep server code, client UI, schemas, and templates easy to discover.

## Target folder structure

```text
/src
  /app
    /page.tsx                → Home / Dashboard (root level, outside route groups)
    /layout.tsx              → Root layout with ShellLayout wrapper
    /globals.css
    /(workspace)
      /projects
        /new
          /page.tsx          → New project form
        /[projectId]
          /layout.tsx        → Workspace layout with sub-nav and breadcrumb
          /page.tsx          → Project overview with setup checklist
          /intake
          /review
          /documents
          /export
      /settings
        /layout.tsx          → Settings layout wrapper
        /page.tsx            → Redirects to /settings/provider
        /provider
          /page.tsx          → Provider configuration form
    /api
  /components
    /ui
    /layout
      /shell-layout.tsx      → Header + main content wrapper
      /workspace-nav.tsx     → Project sub-navigation tabs (client component)
      /settings-layout.tsx   → Settings content wrapper
    /shared
  /features
    /projects
      /actions               → Server actions (create-project.ts)
      /components            → UI (new-project-form.tsx)
    /provider-settings
      /actions               → Server actions (save-provider.ts, test-connection.ts)
      /components            → UI (provider-settings-form.tsx)
    /intake
    /review
    /knowledge-base
    /document-generation
    /export
  /generated
    /prisma                  → Prisma generated client (gitignored)
  /lib
    /ai
      /adapters              → Provider adapter contract and implementations
      /prompts
      /schemas
    /db
      /prisma.ts             → Prisma client singleton
    /markdown
    /validation
      /project.ts            → Zod schemas for project creation
      /provider.ts           → Zod schemas for provider settings
      /index.ts              → Barrel re-export
    /utils
      /crypto.ts             → AES-256-GCM encrypt/decrypt for secrets
  /types
    /project.ts              → TypeScript types derived from Zod schemas
/prisma
  /schema.prisma             → Project and ProviderConnection models (SQLite)
/tests
  /integration               → Server action integration tests
  /e2e                       → Playwright tests
  /fixtures
  /golden
/.kiro/steering
/.github/prompts
```

## Organizational rules

### `src/app`

Use this for route composition, page-level loading/error states, and thin route handlers. Do not place heavy domain logic here.

### `src/features`

Each feature folder owns:
- UI specific to the feature
- commands or services for that feature
- data transformation helpers
- feature tests where helpful

Example feature boundaries:
- `projects` for workspace/project lifecycle
- `provider-settings` for model connection setup and validation
- `intake` for question sets, forms, and completeness logic
- `chat` for assistant interaction and extraction workflow
- `knowledge-base` for structured project facts
- `document-generation` for templates and rendering
- `export` for package assembly and download

### `src/lib`

Shared infrastructure only. This is where adapters, markdown utilities, database helpers, and generic validation helpers belong.

## Template organization

Keep generated document templates in a clear and testable location.

Suggested structure:

```text
/src/features/document-generation
  /templates
    /kiro
      product.template.ts
      tech.template.ts
      structure.template.ts
      testing.template.ts
      security.template.ts
      workflows.template.ts
    /copilot
      copilot-instructions.template.ts
      create-feature-spec.prompt.template.ts
    /shared
      agents.template.ts
```

Do not hide templates inside giant prompt strings scattered across the codebase.

## Prompt organization

Keep prompt text versioned and modular.

Suggested structure:

```text
/src/lib/ai/prompts
  intake-follow-up.ts
  extract-project-facts.ts
  resolve-conflicts.ts
  summarize-conversation.ts
  improve-document-draft.ts
```

## Schema organization

Suggested structure:

```text
/src/lib/ai/schemas
  project.ts
  provider.ts
  intake.ts
  knowledge-base.ts
  generated-document.ts
```

## Naming conventions

- Use kebab-case for folders and non-component filenames.
- Use PascalCase for React components.
- Use `.schema.ts` or grouped schema files when it improves clarity.
- Name services after outcomes, not implementation details.

Examples:
- `generate-documents.ts`
- `calculate-completeness.ts`
- `provider-connection-form.tsx`
- `knowledge-base.schema.ts`

## Client and server boundaries

- Client components handle interaction only.
- Server code handles provider calls, persistence, and document generation.
- Never call the model provider directly from a client component.

## Testing placement

- unit tests colocated near source files (e.g., `src/lib/utils/crypto.test.ts`, `src/lib/validation/__tests__/`)
- unit tests also accepted under `tests/unit` for standalone test files
- integration tests under `tests/integration` for server action flows
- e2e tests under `tests/e2e` for Playwright user journeys
- golden files for markdown output under `tests/golden`

## Documentation placement

Repository-level guidance should live in:
- `.kiro/steering/*.md`
- `.github/copilot-instructions.md`
- `.github/prompts/*.prompt.md`
- `AGENTS.md`

Keep these files current as the architecture evolves.
