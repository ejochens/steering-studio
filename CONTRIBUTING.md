# Contributing to Steering Studio

Thanks for your interest in contributing. This project is in early development and we welcome feedback, bug reports, and pull requests.

## Getting started

1. Fork the repository and clone your fork.
2. Follow the setup instructions in [INSTALL.md](INSTALL.md).
3. Create a branch for your change.

## Development workflow

```powershell
npm run dev          # start the dev server
npm run test         # run unit and integration tests
npm run lint         # run the linter
npm run build        # verify the production build
```

## Before submitting a PR

- Run `npm run test` and make sure all tests pass.
- Run `npm run build` to verify the production build succeeds.
- Keep changes small and focused on a single concern.
- If your change affects architecture or data flow, update the relevant steering file in `.kiro/steering/`.
- Include a clear description of what the change does and why.

## Project conventions

- TypeScript strict mode is enabled. Fix type errors, don't suppress them.
- Business logic belongs in `src/features/` or `src/lib/`, not in React components.
- Use Zod schemas for validation at all boundaries.
- Server actions handle data mutations. Don't call provider APIs from client components.
- Tests live next to the code they test, or under `tests/` for integration and e2e.

## Reporting bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Node.js version and OS

## Feature ideas

Open an issue describing the use case before writing code. This project follows a spec-first workflow — requirements and design come before implementation.

## Code of conduct

Be respectful and constructive. This is a collaborative project and everyone's time is valuable.
