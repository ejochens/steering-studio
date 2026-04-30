# Development Workflow Guidance

## Delivery philosophy

This project should be built in a spec-first way.

Default sequence:
1. requirements
2. design
3. tasks
4. implementation
5. tests
6. refinement

## Kiro workflow expectations

When using Kiro for feature work:
- start with a spec
- write requirements clearly
- review design before implementation
- keep tasks small and traceable
- avoid broad code generation with vague prompts

Requirements should be specific and testable. Design should describe structure, data flow, and important tradeoffs.

## Preferred feature slicing

Build thin vertical slices.

Good examples:
- provider settings save and validate flow
- one intake section with completeness tracking
- one chat clarification interaction that updates the canonical model
- generation of `product.md` only

Avoid broad slices like:
- build the whole platform
- implement all document types at once
- support every provider in the first pass

## Branch and PR guidance

- Keep changes small.
- Link changes back to a spec or a clear feature statement.
- Include screenshots for meaningful UI changes.
- Include notes on prompt or template changes.

## Change management for steering files

Treat steering files like code.

Update them when:
- architecture changes
- stack choices change
- workflow expectations change
- testing strategy changes
- document generation rules change

## Review priorities

Reviewers should focus on:
- correctness of data flow
- maintainability of templates and prompts
- security of provider settings
- user clarity and completeness UX
- test coverage for transformations

## Build and validation expectations

Before considering a task complete, run the appropriate validation set for the current project state. The repository should eventually expose clear commands for:
- lint
- unit tests
- integration tests
- end-to-end tests

All commands must be written for PowerShell on Windows. Do not use bash syntax, Unix-only tools, or `&&` chaining. Use `;` to separate sequential commands.

## Architecture preservation rule

Do not collapse the system into one giant “chat generates everything” workflow for speed. That would damage reliability and make the product much harder to debug and improve.
