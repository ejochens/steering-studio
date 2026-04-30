# Document Output Rules

## Goal

The application generates starter-pack documents shaped for a selected target tool.

Supported targets:
- Kiro
- Copilot
- Both

## Output philosophy

The generated files should be:
- concise but meaningful
- specific to the user's project
- editable before export
- easy for humans to review
- easy for agentic tools to consume repeatedly

## Kiro output rules

When target includes Kiro, generate at least:

- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`

Generate additional focused steering files when enough information exists, such as:
- `.kiro/steering/testing.md`
- `.kiro/steering/security.md`
- `.kiro/steering/workflows.md`
- `.kiro/steering/ux.md`

Kiro files should read like persistent project guidance, not one-off prompts.

## Copilot output rules

When target includes Copilot, generate at least:
- `.github/copilot-instructions.md`

Optionally generate:
- `.github/prompts/create-feature-spec.prompt.md`
- additional task-oriented prompt files
- `AGENTS.md`

Copilot instructions should include:
- project purpose
- architecture expectations
- how to build and test
- coding conventions
- workflow expectations such as requirements before code

## Shared output rules

- preserve user terminology where it is meaningful
- avoid obviously generic filler text
- prefer clear headings and short sections
- maintain stable filenames so regeneration does not create file sprawl
- include non-goals where relevant

## Regeneration rules

The user should be able to:
- regenerate all documents
- regenerate one document only
- preserve manual edits through explicit overwrite rules

Preferred approach:
- keep generated source payload separate from rendered markdown
- record generation timestamp and template version
- warn before overwriting manual edits

## Validation rules

Before export:
- verify every required file exists for the selected target
- verify markdown is non-empty
- verify filenames and paths are correct
- surface warnings for incomplete sections

## ZIP export structure

Export uses a standard browser download. The server generates a ZIP file and streams it to the browser as a file download. The user saves it to their downloads folder (or wherever their browser is configured to save files), then manually extracts it into their target repository root.

Do not implement direct file system writes for the MVP. Browser download is cross-platform, requires no special permissions, and matches the user's existing mental model for downloading files from a web application.

Future enhancement: consider adding a File System Access API option for supported browsers (Chrome, Edge) to allow writing directly to a chosen folder, but this is not required for MVP.

If both targets are selected, export a single ZIP package that preserves the directory structure expected by the target repository.

Example ZIP contents:

```text
/AGENTS.md
/.kiro/steering/product.md
/.kiro/steering/tech.md
/.kiro/steering/structure.md
/.kiro/steering/testing.md
/.kiro/steering/security.md
/.kiro/steering/workflows.md
/.github/copilot-instructions.md
/.github/prompts/create-feature-spec.prompt.md
```

The ZIP filename should include the project name and target, for example: `steering-studio-my-project-kiro.zip` or `steering-studio-my-project-both.zip`.

## Authoring style

Generated documents should sound like they were written by a senior architect or engineering lead, not by a marketing system.
