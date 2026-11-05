# 4. Transactional Outbox Pattern for Asynchronous Event Publishing

Date: 2026-10-16

## Status

Accepted

## Context

When an order is created, downstream microservices (such as product-service for stock adjustment, notification services, or analytics) must be notified via Kafka. Publishing to Kafka in the middle of a database transaction creates dual-write inconsistency: if Kafka fails, the DB might commit; if Kafka succeeds, the DB might roll back.

## Decision

We implement the Transactional Outbox Pattern:

1. Every order placement atomically writes both the `Order` record and an `OutboxEvent` record in a single PostgreSQL ACID transaction (`prisma.$transaction`).
2. An asynchronous background Outbox Relay Worker (`order-service/src/events/outboxWorker.ts`) periodically polls unpublished outbox events using `SELECT ... FOR UPDATE SKIP LOCKED` (or status polling with exponential backoff).
3. The worker publishes events to the partitioned Kafka topic `order.created` with strict validation via Zod event schemas (`orderCreatedEventSchema`).
4. On successful publication, the event is marked `PUBLISHED` with `publishedAt` timestamp. If publication fails, retry count increments with backoff, moving to `FAILED` or a Dead Letter Queue (DLQ) topic `order.created.dlq` after maximum retries.

## Consequences

- Guarantees at-least-once delivery without dual-write race conditions.
- Decouples HTTP request lifecycle from Kafka broker availability.
- Downstream consumers must be idempotent (addressed via `ProcessedEvent` tracking table).
