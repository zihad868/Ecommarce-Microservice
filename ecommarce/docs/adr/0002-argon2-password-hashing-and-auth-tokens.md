# ADR 0002: Argon2 Password Hashing and Token Rotation Architecture

## Status

Accepted

## Context

Previously, `auth-service` used `bcryptjs` (a pure JS implementation that blocks the single-threaded Node.js event loop during hashing). Furthermore, authentication used single 1-day JWT access tokens without refresh tokens, revocation mechanisms, or RBAC role claims in gRPC token validations.

## Decision

1. Replace `bcryptjs` with `argon2` (OWASP-recommended, GPU-resistant, native thread-pool execution).
2. Enforce strong password complexity policy (min 8 chars, uppercase, lowercase, number, special char).
3. Switch access token lifetime to 15 minutes.
4. Implement refresh token rotation:
   - Refresh tokens are stored hashed (SHA-256) in the database with expiry.
   - On refresh, a new token pair is issued and the old refresh token is marked revoked.
   - If an already revoked refresh token is presented, reuse detection invalidates all active sessions for that user.
5. Embed `role` in JWT payload and gRPC verification response to enable RBAC across services.
6. Return HTTP 401 (Unauthorized) on authentication failures instead of 400.

## Consequences

- Prevents event-loop blocking under high registration/login traffic.
- Drastically narrows window of exposure for compromised access tokens.
- Secure token invalidation on logout and token reuse attack mitigation.
