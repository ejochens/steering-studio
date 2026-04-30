# AI Integration and Generation Rules

## Purpose

This file defines how the application should use AI safely and effectively.

The AI is a collaborator for discovery, synthesis, and refinement. It is not the sole source of truth.

## Core design rule

The application must maintain a **canonical project knowledge model** that sits between user input and markdown generation.

### Required pipeline

1. collect explicit inputs through forms
2. store them in typed domain objects
3. collect clarification messages through chat
4. extract structured facts from conversation
5. merge them into the canonical model
6. surface missing or conflicting fields
7. render markdown from templates
8. optionally ask AI to improve wording without changing underlying facts

## Canonical model requirements

The knowledge model should include, at minimum:
- product purpose
- target users
- user outcomes
- scope and non-goals
- technology choices
- architecture constraints
- project structure rules
- testing expectations
- security requirements
- workflow and delivery rules
- target tool outputs

Every generated sentence should be traceable to either:
- a confirmed user input
- a derived but reviewable synthesis

## Conversation rules

The assistant should:
- ask for missing information only when it matters to output quality
- prioritize one clarifying question at a time
- explain why the question matters when appropriate
- summarize what it has learned after important milestones
- avoid asking duplicate questions for already confirmed facts

The assistant should not:
- invent company-specific constraints
- hide uncertainty
- claim something is final when required data is missing
- overwrite confirmed inputs without explicit review

## Coverage tracking

Each major section should have a coverage state:
- unknown
- partial
- complete
- conflicting
- user-reviewed

Generation should warn the user when critical sections remain unknown or conflicting.

## Provider configuration rules

Provider configuration is application-level, not per-project. A single provider connection is configured once and shared across all projects.

Support provider configuration as data, not hard-coded logic.

Store:
- provider type
- base URL or platform endpoint
- model identifier
- region when required
- auth method
- optional advanced tuning values

Test connections separately from document generation.

## Prompt design rules

- Keep prompts modular and versioned.
- Separate extraction prompts from drafting prompts.
- Prefer structured extraction with a schema when feasible.
- Do not bury business rules only inside prompts; encode them in code and templates where possible.

## Document generation rules

Generation should occur in two layers:

### Layer 1: structured content assembly

Use typed data and deterministic rendering logic to assemble a draft document structure.

### Layer 2: optional refinement

Use AI to improve clarity, remove repetition, and strengthen phrasing while preserving the facts.

If refinement is used, keep a pre-refinement draft available for debugging.

## Debuggability requirements

The system should make it possible to inspect:
- input answers
- extracted facts
- unresolved fields
- template input payload
- final rendered markdown

This is important because debugging AI-assisted applications without visibility becomes expensive very quickly.

## Future-friendly design

The application should be ready for later additions such as:
- prompt libraries by domain
- organization-wide starter templates
- import from existing repo files
- MCP-assisted discovery workflows

But do not build those before the MVP proves the core capture-to-markdown pipeline.
