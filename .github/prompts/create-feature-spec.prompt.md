# Create Feature Spec

When creating a new feature for Steering Studio, follow this process:

1. Write requirements with clear user stories and acceptance criteria.
2. Create a technical design covering data model changes, route additions, and component structure.
3. Break the design into small, traceable implementation tasks.
4. Implement one task at a time with tests.

## Output format

Place spec files in `.kiro/specs/{feature-name}/`:
- `requirements.md`
- `design.md`
- `tasks.md`

## Principles

- Keep slices thin and vertical.
- Validate inputs with Zod schemas.
- Keep provider logic server-side behind adapter interfaces.
- Test transformations without live model calls.
