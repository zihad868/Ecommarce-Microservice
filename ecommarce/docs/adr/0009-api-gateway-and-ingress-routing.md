# 9. API Gateway & Ingress Routing

Date: 2026-10-16

## Status

Accepted

## Context

Exposing individual microservice ports (`3001`, `3002`, `3003`, `50051`, `50052`, `50053`) directly to the public internet or frontend clients creates severe attack vectors, complicates SSL/TLS termination, and leaks internal network topology.

## Decision

1. **Single Entry Point**: All public HTTP traffic is routed through NGINX Ingress Controller / API Gateway:
   - `/api/auth/*` -> `auth-service:3001`
   - `/api/products/*` -> `product-service:3002`
   - `/api/orders/*` -> `order-service:3003`
2. **Internal-Only gRPC**: gRPC ports (`50051`, `50052`, `50053`) are bound to internal ClusterIP services and strictly isolated via NetworkPolicies (`11-network-policy.yaml`). Outside callers cannot invoke gRPC services directly.
3. **Edge Security**:
   - Automated TLS termination using Let's Encrypt and cert-manager (`cert-manager.io/cluster-issuer: letsencrypt-prod`).
   - Rate limiting annotations at the ingress level (`nginx.ingress.kubernetes.io/limit-rps: 100`).
   - Security response headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).

## Consequences

- Clean unified API boundary for web and mobile clients.
- Centralized SSL certificate management and DDOS mitigation.
- Strict isolation of internal microservice backchannels.
