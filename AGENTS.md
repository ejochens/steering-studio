# AGENTS.md

This repository builds **Steering Studio**, a web application that creates starter context packs for agentic development tools.

The product goal is to help users create high-quality markdown guidance for:
- Amazon Kiro steering
- GitHub Copilot Agent Mode repository instructions and prompts

## Core working rules

- Always work **requirements first, design second, code third**.
- Do not jump directly from a vague user request to generated code.
- Prefer deterministic data capture through forms before asking the model to infer missing information.
- Treat the AI conversation as supplemental context, not the system of record.
- The system of record is the **canonical project knowledge model** stored by the application.
- Final markdown documents must be rendered from typed data and templates, not dumped directly from freeform chat.

## Architecture guardrails

- Keep all model API calls on the server side.
- Never expose provider API keys to the browser.
- Use a provider adapter abstraction so the app can support multiple model backends.
- Keep feature modules isolated by domain: projects, intake, chat, generation, export, settings.
- Validate all persisted data with shared Zod schemas.
- Prefer simple, boring architecture over clever orchestration in the MVP.

## UX guardrails

- The user should never face a blank screen and wonder what to do next.
- Start with a guided project setup flow.
- Show completeness by section.
- Let users preview and edit generated markdown before export.
- Make missing information visible and actionable.

## Quality guardrails

- Every important transformation should be testable without calling a real model.
- Use fixtures and golden-file tests for markdown output.
- Keep prompts versioned and easy to inspect.
- Prefer idempotent document regeneration.

## Build intent

When implementing features, aim for these outcomes:

1. reliable capture of project intent
2. transparent data flow from user input to document output
3. easy local development on Windows
4. compatibility with both Kiro and Copilot-oriented outputs

## Shell and command rules

- This project targets Windows with PowerShell as the default shell.
- All CLI examples, scripts, and agent-generated commands must use PowerShell syntax.
- Do not use bash, sh, or Unix-only commands.
