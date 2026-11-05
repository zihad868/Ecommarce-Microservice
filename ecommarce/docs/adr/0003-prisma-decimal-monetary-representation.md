# ADR 0003: Monetary Precision Using Prisma Decimal

## Status

Accepted

## Context

In the original Prisma schemas, `Product.price`, `Order.totalAmount`, and `OrderItem.price` used IEEE 754 floating point numbers (`Float`). Floating point numbers are prone to binary rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`), making them dangerous for financial calculations and monetary totals.

## Decision

1. In Prisma schemas, change price and amount columns from `Float` to `Decimal(12, 2)` (or integer minor units in BigInt/Decimal).
2. For calculation in service logic, utilize Prisma's Decimal type (powered by `decimal.js`) to guarantee exact arbitrary-precision arithmetic without rounding drift.
3. Validate all incoming prices with Zod to be non-negative numbers with up to 2 decimal places.

## Consequences

- Guaranteed zero rounding error in prices, line items, and order totals.
- Compatible with PostgreSQL's native `NUMERIC`/`DECIMAL` data type.
