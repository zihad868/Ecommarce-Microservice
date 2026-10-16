# 6. Order State Machine and API Idempotency

Date: 2026-10-16

## Status

Accepted

## Context

E-commerce orders undergo complex lifecycles (`PENDING`, `CONFIRMED`, `PAID`, `SHIPPED`, `COMPLETED`, `CANCELLED`). Without formal state machine guardrails, invalid transitions (e.g. transitioning directly from `CANCELLED` to `SHIPPED`, or duplicate payments on completed orders) cause accounting and fulfillment discrepancies.
Additionally, network blips and client retries on `POST /orders` can inadvertently generate duplicate orders.

## Decision

1. **Explicit State Machine**: We encapsulate all valid status transitions in `orderStateMachine.ts`. Every status mutation validates whether `canTransition(current, target)` is allowed. Any illegal transition throws a descriptive HTTP 400 `ApiError`.
2. **API Idempotency**: `POST /orders` supports the standard `Idempotency-Key` header (UUID or client-generated unique string). If a key is passed:
   - It is checked against an `IdempotencyRecord` table within the order service database.
   - If the request is currently in-flight, subsequent identical requests receive HTTP 409 or wait.
   - If already completed, the cached HTTP response code and body are returned immediately without placing duplicate orders.

## Consequences

- Guaranteed deterministic order lifecycle.
- Safe client-side retries on unreliable connections.
- Clean auditability and alignment with payment gateway webhook lifecycles.
