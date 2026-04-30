# Product Overview

## Product name

Agentic AI Development Steering Studio

## Product summary

Steering Studio is a website that helps software teams create a high-quality starter pack for agentic development. The product guides a user through structured forms and an AI-assisted conversation, then generates markdown documents that can be used as project context for Amazon Kiro or Visual Studio with GitHub Copilot Agent Mode.

The application exists because teams often get weak results from AI coding tools when they start with code generation before they have supplied enough context. Steering Studio fixes that by helping teams define product intent, technical constraints, project structure, workflows, testing expectations, and security rules before implementation begins.

## Problem statement

Teams want to use AI to accelerate software development, but most repositories do not contain enough structured guidance for agentic tools to work reliably. Important details about users, architecture, business rules, technical standards, and delivery workflows usually live in meetings, partial documents, or tribal knowledge.

As a result:
- AI tools generate shallow or misaligned code
- large solution enhancements fail because the model lacks context
- teams lose confidence and fall back to small isolated tasks only
- project onboarding remains slow and inconsistent

## Product vision

Give any engineering lead, architect, or developer a fast way to create a reusable project context pack that makes AI tools much more effective on day one.

## Target users

### Primary users

- engineering leads starting a new product or major enhancement
- solution architects defining a baseline architecture and guardrails
- senior developers preparing a repository for AI-assisted development
- platform or enablement teams standardizing AI-first ways of working

### Secondary users

- product owners or analysts contributing product and workflow context
- QA or test automation engineers defining quality expectations
- security reviewers supplying security and data-handling requirements

## Core jobs to be done

- As an engineering lead, I want a guided way to define project context so the AI has enough information to produce useful work.
- As an architect, I want the generated documents to reflect real constraints and patterns rather than generic boilerplate.
- As a developer, I want to refine generated steering documents before exporting them into my repo.
- As an enablement leader, I want consistent output packages across teams so adoption is repeatable.

## Product principles

1. **Context before code**  
   The product must encourage requirements, design, structure, testing, and workflow guidance before code generation.

2. **Forms first, conversation second**  
   The product should collect deterministic facts through forms and use the AI chat to clarify ambiguity, fill gaps, and improve quality.

3. **One canonical project model**  
   Forms and conversation must both populate the same structured knowledge model.

4. **Editable output**  
   Generated documents are drafts that the user can review and revise before export.

5. **Tool-targeted packages**  
   The product must generate output shaped for Kiro, Copilot, or both.

6. **Local-first MVP**  
   A single-user or small-team local deployment should be easy to run without enterprise dependencies.

## MVP scope

The MVP should include:
- configure an AI provider connection at the application level (once, shared across all projects)
- create and manage a project workspace
- choose target output: Kiro, Copilot, or Both
- complete a guided intake flow across key sections
- use AI chat to ask follow-up questions and resolve missing information
- generate and preview markdown documents
- manually edit generated documents in the browser
- export the final package as a ZIP file via browser download

## Out of scope for MVP

- repository code scanning
- real-time multi-user collaboration
- enterprise SSO and fine-grained RBAC
- billing and usage chargeback
- model fine-tuning or training custom models
- autonomous code generation against a target repository

## Success metrics

### Product metrics

- time from new project creation to first usable export
- percentage of required sections completed before generation
- percentage of generated documents edited by the user before export
- repeat exports per project

### Quality metrics

- markdown validation pass rate
- percentage of exports containing all required files for the chosen target
- user-rated usefulness of the generated starter pack

### Adoption metrics

- number of projects created
- number of provider connections configured successfully
- number of exports by target type: Kiro, Copilot, Both

## Expected user flow

1. User configures model provider settings once at the application level (if not already configured).
2. User creates a project and selects target output.
3. User completes guided intake sections.
4. AI assistant asks clarifying questions for missing or conflicting information.
5. User reviews completeness and resolves gaps.
6. User generates markdown documents.
7. User previews, edits, and exports the package.

## Document families the product generates

### Kiro

- `product.md`
- `tech.md`
- `structure.md`
- optional custom steering files such as `testing.md`, `security.md`, `workflows.md`

### Copilot

- `copilot-instructions.md`
- optional reusable prompt files
- optional `AGENTS.md`

## North star outcome

A team should be able to use Steering Studio to create a high-confidence project context pack that makes their first serious AI-assisted implementation session feel informed, constrained, and productive instead of vague and error-prone.
