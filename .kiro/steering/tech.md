# Technology Stack

## Technical direction

Build Steering Studio as a **full-stack TypeScript web application** with a strong preference for server-side orchestration, typed schemas, and modular domain boundaries.

The MVP should be easy to run locally and should not depend on complex distributed infrastructure.

## Recommended stack

### Application framework

- Next.js with App Router
- React with TypeScript strict mode enabled
- Route handlers or server actions for server-side workflows

### UI

- Tailwind CSS
- shadcn/ui-style component patterns or equivalent accessible primitives
- React Hook Form for forms
- Zod for validation

### State management

- TanStack Query for server-state concerns
- local component state or lightweight store for transient UI state
- avoid introducing a heavy global state solution unless a clear need emerges

### Persistence

- Prisma as the ORM (v7+ with driver adapters)
- SQLite via better-sqlite3 adapter for local development (zero-config, no Docker needed)
- PostgreSQL as the production database target
- Prisma client generated to `src/generated/prisma` (gitignored)

### Schema migration rules

- For additive changes (new nullable columns, new optional fields), use `npx prisma db push` to apply without data loss.
- Only use `npx prisma migrate reset` when the schema has breaking changes that cannot be applied incrementally, and always warn the user that data will be lost.
- After any schema change, always run `npx prisma generate` to regenerate the Prisma client before restarting the dev server.
- The local SQLite database (`dev.db`) contains real user-entered project data during development. Treat it as valuable and avoid wiping it unnecessarily.

### Testing

- Vitest for unit and integration tests (configured with `@/` path alias in vitest.config.ts)
- Playwright for end-to-end tests (chromium, configured in playwright.config.ts)
- golden-file tests for markdown document generation

### Markdown and content utilities

- gray-matter when front matter becomes useful
- remark and remark-gfm for markdown formatting and normalization

## AI integration approach

Use a **provider adapter layer** rather than coupling the application directly to one SDK or one vendor.

### Required design

Create an interface similar to:

- `sendChat(messages, options)`
- `extractStructuredData(schema, messages, options)`
- `generateDocuments(input, templateSet, options)`
- `testConnection(config)`

### MVP provider support

Support these in order:

1. OpenAI-compatible API configuration
2. Amazon Bedrock adapter
3. Additional direct-provider adapters later if needed

The application should normalize responses into a common internal format.

## Critical architectural rule

Do not generate final markdown documents by prompting the model with only the raw transcript and asking for all output in one step.

Instead:
- capture structured facts in forms
- extract structured facts from conversation
- store them in a canonical schema
- validate completeness and consistency
- render markdown through templates
- use the model only for synthesis, refinement, and gap resolution where it adds value

## Canonical data domains

At minimum, model these domains:

- ProviderConnection (application-level, shared across all projects)
- Project
- ProjectTarget
- IntakeSection
- Answer
- ConversationSession
- ConversationMessage
- KnowledgeBaseSnapshot
- GeneratedDocument
- ExportBundle

## Development environment

- Primary OS: Windows
- Shell: PowerShell (not bash, not WSL)
- All CLI commands in documentation, scripts, and agent instructions must use PowerShell syntax
- Use semicolons (`;`) to chain commands, not `&&`
- Use `Remove-Item` instead of `rm`, `Copy-Item` instead of `cp`, etc.
- npm/npx commands work cross-platform and are fine as-is

## Environment strategy

### Local development

- single developer friendly
- local database
- environment variables loaded from `.env.local`
- session-only mode allowed for provider keys during early development

### Future hosted deployment

- managed PostgreSQL
- encrypted secret storage
- audit logs
- object storage for exports if needed

## Coding standards

- Prefer server-side data mutations.
- Keep business logic out of React components.
- Use explicit schemas for all request and persistence boundaries.
- Keep feature modules cohesive and small.
- Favor pure functions for transformation and document rendering.
- Keep provider-specific behavior behind adapter boundaries.
- No client-side access to provider secrets.

## Performance priorities

- perceived responsiveness of forms and chat
- clear loading and streaming states
- fast generation of preview documents
- deterministic regeneration of one document without rerunning the entire workflow

## Non-functional expectations

- reliable local startup
- auditable document generation flow
- maintainable prompts and templates
- secure secret handling
- clean separation between capture, synthesis, and rendering
