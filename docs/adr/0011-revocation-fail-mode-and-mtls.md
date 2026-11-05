# 11. Token Revocation Fail-Mode Policy and Production mTLS Enforcement

Date: 2026-11-05

## Status

Accepted

## Context

Token verification at the edge API gateway involves checking incoming JWT signatures and then querying Redis for token revocation markers (`auth:revoked-before:<userId>`).
During a Redis outage, cluster failover, or transient network partition:

1. If the gateway fails open for all requests, revoked tokens (including compromised admin credentials) could perform unauthorized actions.
2. If the gateway fails closed for all requests, a temporary Redis disruption takes down the entire customer-facing storefront, preventing normal users from browsing or placing orders.

Additionally, inter-service gRPC communication must be secured against eavesdropping and spoofing within production environments. Without default mTLS enforcement, services might unintentionally run in insecure plaintext mode.

## Decision

1. **Role-Based Revocation Fail-Mode**:
   - For standard users (`role === 'USER'`), token verification **fails open** during Redis outages, degrading gracefully to cryptographic signature and expiration verification.
   - For privileged administrative accounts (`role === 'ADMIN'`), token verification **fails closed** during Redis outages, throwing `503 Session check unavailable`.
   - Every Redis revocation lookup failure increments the `redis_revocation_errors_total` Prometheus counter.
   - A Prometheus alert (`RedisRevocationErrors`) triggers when Redis revocation error rates exceed zero.

2. **mTLS Default-On in Production**:
   - In `packages/grpc-kit/src/grpc/credentials.ts`, if `process.env.NODE_ENV === 'production'` or `process.env.GRPC_TLS_REQUIRED === 'true'`, valid TLS materials (`GRPC_TLS_CA`, `GRPC_TLS_CERT`, `GRPC_TLS_KEY`) are mandatory.
   - If missing in production, initialization immediately throws an error rather than silently falling back to insecure channel credentials.

## Consequences

- Customer storefront availability is preserved during Redis degradation for standard shopping flows.
- High-privilege administrative mutations are strictly protected against revoked credential replay attacks.
- Operations and on-call engineers are immediately alerted to Redis communication errors via Prometheus.
- Zero-trust network communication across internal microservices is enforced by default in production deployments.
