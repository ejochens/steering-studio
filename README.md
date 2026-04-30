# Steering Studio

A web application that helps software teams create high-quality starter context packs for AI-assisted development tools — specifically [Amazon Kiro](https://kiro.dev) and [GitHub Copilot Agent Mode](https://docs.github.com/en/copilot).

## The problem

AI coding tools produce better results when they have structured project context: product intent, architecture constraints, testing expectations, security rules, and delivery workflows. Most repositories don't have this, so teams get shallow or misaligned output and lose confidence in AI-assisted development.

## What Steering Studio does

Steering Studio guides you through a structured intake process — forms first, AI conversation second — to capture your project's context into a canonical knowledge model. It then generates markdown documents shaped for your target tool:

**For Kiro:**
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- Optional: `testing.md`, `security.md`, `workflows.md`, `ux.md`

**For Copilot:**
- `.github/copilot-instructions.md`
- Optional: `.github/prompts/*.prompt.md`, `AGENTS.md`

You review and edit the generated documents in the browser, then export a ZIP file to drop into your repository.

## Quick start

Requires [Node.js](https://nodejs.org/) v18.18 or later.

```powershell
git clone https://github.com/your-org/steering-studio.git
cd steering-studio
npm install
npm run setup
npm run build
npm run start
```

Then open [http://localhost:3000](http://localhost:3000).

See [INSTALL.md](INSTALL.md) for detailed setup instructions, troubleshooting, and the automated PowerShell setup script.

## How it works

1. **Configure your AI provider** — OpenAI, Azure OpenAI, or Amazon Bedrock. Done once, shared across projects.
2. **Create a project** — name it, pick your target output (Kiro, Copilot, or Both).
3. **Complete the guided intake** — structured sections covering product, architecture, testing, security, workflows, and more.
4. **AI review** — the assistant asks clarifying questions for missing or conflicting information.
5. **Generate documents** — templates render your captured context into markdown, with optional AI refinement.
6. **Preview and edit** — review every document before export.
7. **Export** — download a ZIP file and extract it into your repository root.

## Tech stack

- Next.js 15 (App Router) with TypeScript
- Tailwind CSS
- Prisma with SQLite (local dev) / PostgreSQL (production target)
- Zod for validation
- Vitest + Playwright for testing

## Architecture

The core design principle: **context before code, forms before chat, canonical model before generation.**

```
Forms → Canonical Knowledge Model ← AI Conversation
                    ↓
         Template Rendering
                    ↓
        Optional AI Refinement
                    ↓
          Markdown Documents
```

Documents are rendered from typed data and templates, not dumped from freeform chat. The AI assists with discovery and refinement but the structured knowledge model is the system of record.

See the [steering documents](.kiro/steering/) for detailed architecture, UX, and security guidance.

## Development

```powershell
npm run dev          # start dev server
npm run test         # unit and integration tests
npm run test:e2e     # Playwright end-to-end tests
npm run lint         # ESLint
npm run build        # production build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Status

This project is in early development (v0.1.0). The core intake-to-export pipeline works. Feedback, bug reports, and contributions are welcome.

## License

[MIT](LICENSE)
