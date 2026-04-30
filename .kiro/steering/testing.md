# Testing and Quality Guidance

## Quality goal

The application should be trustworthy. Users must be able to rely on the generated starter pack enough to refine it rather than rebuild it from scratch.

## Testing strategy

Use a layered testing approach.

### Unit tests

Cover:
- completeness calculations
- schema validation helpers
- document path generation
- markdown renderers
- provider config normalization
- conflict resolution helpers that do not require model calls

### Integration tests

Cover:
- provider connection testing flow
- persistence of projects and answers
- conversation-to-knowledge-base extraction using mocked provider responses
- document generation from canonical model inputs

### End-to-end tests

Cover these user journeys:
- create project and choose target
- save provider settings
- complete intake flow
- answer follow-up questions in chat
- generate preview documents
- edit one document
- export ZIP

## Golden-file testing

Use golden files for markdown output. This is a critical quality check for a document-generation product.

For stable fixtures, compare:
- expected path names
- heading structure
- required sections
- important phrases for project-specific content

## Model call testing approach

Do not depend on live model calls for the main test suite.

Prefer:
- mocked adapters
- recorded fixtures where appropriate
- contract tests per provider adapter

Reserve live provider smoke tests for manual or explicitly flagged runs.

## Definition of done for features

A feature is not done until:
- inputs are validated
- happy path works end to end
- error states are handled
- generated output is reviewed for quality
- tests cover important transformations
- documentation or steering is updated when architecture changes

## Quality review checklist

Before merging meaningful changes, verify:
- Does the feature preserve the canonical model flow?
- Does it avoid leaking secrets to the client?
- Is the output deterministic where it should be?
- Are prompts and templates easy to inspect?
- Can the behavior be debugged without guessing?

## Regression priorities

Treat these as high-risk regressions:
- malformed export paths
- missing required files
- broken provider setup flows
- incorrect markdown rendering
- loss of user edits on regeneration
- duplicate or conflicting extracted facts
