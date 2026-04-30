# Security and Privacy Guidance

## Security intent

Steering Studio handles project definitions, architecture choices, and model provider credentials. Treat it as an application that may process sensitive engineering context even in local mode.

## Secret handling rules

- Never expose provider API keys to the browser.
- Never log secrets.
- Mask secrets in the UI after initial entry.
- Support session-only provider credentials for early local development.
- For persisted credentials, use encryption at rest.

## Data classification guidance

Treat these as sensitive by default:
- provider credentials
- internal architecture descriptions
- security requirements
- future roadmap details
- generated files intended for internal repositories

## Logging rules

- Log operational events, not raw secrets.
- Avoid logging full prompts or full transcripts by default in production-like modes.
- If prompt logging exists for debugging, make it opt-in and clearly labeled.
- Redact API keys, tokens, passwords, and connection headers.

## AI safety rules

- Do not allow the model to directly execute arbitrary code.
- Do not allow the model to fetch external URLs unless that feature is intentionally added later.
- Treat AI-generated content as untrusted until reviewed.
- Make sure user-confirmed facts take precedence over model assumptions.

## Access control direction

MVP may be local-first and simple, but the code should be designed so future hosted versions can support:
- project ownership
- role-based access
- team-level sharing
- audit history

## Secure architecture rules

- Keep provider integration server-side.
- Validate all inputs at the boundary.
- Use CSRF-safe mutation patterns where relevant.
- Separate secrets, application data, and generated artifacts conceptually.

## Export safety

Before export, warn the user that generated documents may contain sensitive project context and should be stored in appropriate repositories only.

## Future enterprise posture

When the product evolves beyond local development, expect to add:
- SSO
- encrypted secret vault integration
- audit trails
- data retention controls
- organization-scoped templates and policies

Do not overbuild those in the MVP, but keep the design extensible.
