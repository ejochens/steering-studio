# Copilot Instructions

This repository builds **Steering Studio**, a web application that creates starter context packs for agentic development tools (Amazon Kiro and GitHub Copilot Agent Mode).

## Stack

- Next.js 15 with App Router
- TypeScript strict mode
- Tailwind CSS
- Prisma with PostgreSQL
- Zod for validation
- Vitest for unit/integration tests
- Playwright for e2e tests

## Architecture rules

- Keep all model API calls server-side.
- Never expose provider API keys to the browser.
- Use a provider adapter abstraction for multiple model backends.
- Validate all persisted data with shared Zod schemas.
- Keep feature modules isolated by domain.

## Build and test

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # lint
```

## Coding conventions

- Prefer server-side data mutations.
- Keep business logic out of React components.
- Use explicit schemas for all request and persistence boundaries.
- Favor pure functions for transformation and document rendering.

## Workflow

Always work requirements first, design second, code third. Do not jump from a vague request to generated code.
