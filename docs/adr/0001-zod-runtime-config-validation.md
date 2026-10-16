# ADR 0001: Zod Runtime Configuration Validation

## Status

Accepted

## Context

Each microservice in the system previously read environment variables directly through `process.env.*` with insecure fallbacks (e.g. `process.env.JWT_SECRET || 'supersecret123'`). This allowed services to start silently with missing, malformed, or weak secrets and ports, leading to silent failures or critical security vulnerabilities.

## Decision

We enforce strict fail-fast runtime configuration validation using Zod on service bootstrap:

1. Every service defines its own schema in `src/config/index.ts`.
2. `JWT_SECRET` must be at least 32 characters long with NO fallback default.
3. The process exits immediately (`process.exit(1)`) with detailed validation errors if configuration is invalid.
4. All application components import the typed configuration object rather than referencing `process.env` directly.

## Consequences

- Guaranteed type safety across all configuration keys.
- Impossible for any service to start in an insecure or misconfigured state.
