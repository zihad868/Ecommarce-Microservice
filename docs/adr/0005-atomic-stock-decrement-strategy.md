# 5. Atomic Conditional Stock Decrement Strategy

Date: 2026-10-16

## Status

Accepted

## Context

In high-concurrency e-commerce environments, multiple users can attempt to purchase limited stock simultaneously (e.g. 50 users attempting to buy 10 available units). A read-then-write pattern (`if (product.stock >= quantity) update stock`) causes race conditions (time-of-check to time-of-use) leading to overselling and negative inventory.

## Decision

We enforce stock decrements using atomic conditional updates at the PostgreSQL database engine level:

```sql
UPDATE "Product"
SET stock = stock - $1
WHERE id = $2 AND stock >= $1
RETURNING stock;
```

In Prisma, this is executed using raw parameterized SQL (`prisma.$executeRaw` / `prisma.$queryRaw`) or transactional isolation. If 0 rows are affected, the decrement fails immediately with an `ApiError(BAD_REQUEST, "Insufficient stock")` or Kafka consumer rollback without mutating the inventory.

Furthermore, duplicate Kafka event processing is prevented by recording every processed `eventId` in a `ProcessedEvent` table inside the same transaction.

## Consequences

- Impossible to oversell stock even under extreme concurrency (e.g., 50 parallel requests).
- Eliminates the need for distributed distributed locks in Redis for inventory deduction.
- Database enforces inventory non-negativity constraint.
