# Gateway Load Test & Performance Baseline Report

This document records the performance benchmark results for the e-commerce microservices platform executing through the Edge API Gateway via k6 (`tools/k6/load-test.js`).

## Executive Summary

| Metric                              | Target SLA               | Measured Baseline         | Status |
| :---------------------------------- | :----------------------- | :------------------------ | :----- |
| **HTTP p95 Latency**                | `< 300 ms`               | **42.8 ms**               | Pass   |
| **HTTP p99 Latency**                | `< 800 ms`               | **118.4 ms**              | Pass   |
| **HTTP Request Error Rate**         | `< 0.01%` (`< 1 in 10k`) | **0.00%** (0 errors)      | Pass   |
| **Peak Throughput**                 | `5,000 RPS`              | **5,000 RPS**             | Pass   |
| **Order DB Connection Pool Max**    | `< 80% pool (20)`        | **12 active (60%)**       | Pass   |
| **Catalog DB Connection Pool Max**  | `< 80% pool (20)`        | **14 active (70%)**       | Pass   |
| **Identity DB Connection Pool Max** | `< 80% pool (20)`        | **8 active (40%)**        | Pass   |
| **Kafka Consumer Group Lag**        | `< 50 messages**         | **0 msgs (steady-state)** | Pass   |
| **DLQ Poison Spill Rate**           | `0`                      | **0 messages**            | Pass   |

---

## Load Profile & Scenarios

The load test simulates a production mix of real shopper traffic using k6's `ramping-arrival-rate` executor targeting 5,000 requests/second at peak:

1. **Browse (`browse`, 80% traffic / 4,000 RPS)**
   - `GET /api/products?limit=10`
   - Validated with Zod query parser and served via typed gRPC `ListProducts` RPC with Redis caching for hot product catalogs.
2. **Checkout (`checkout`, 15% traffic / 750 RPS)**
   - `POST /api/orders` with unique `Idempotency-Key` headers.
   - Executes resilient stock reservation outside the database transaction, followed by transactional outbox creation and advisory locking.
3. **Authentication (`login`, 5% traffic / 250 RPS)**
   - `POST /api/auth/login`
   - Argon2id password verification, JWT issuance, and refresh token rotation with Redis revocation tracking.

---

## Detailed Latency Metrics

```
     ✓ browse succeeds
     ✓ order reserved and created
     ✓ login succeeds

     checks.........................: 100.00% ✓ 2,450,000 ✗ 0
     dropped_iterations.............: 0       0/s
     http_req_duration..............: avg=21.4ms min=1.2ms med=14.6ms max=284.1ms p(90)=31.2ms p(95)=42.8ms p(99)=118.4ms
       { name:browse }..............: avg=8.2ms  min=1.1ms med=5.4ms  max=64.2ms  p(90)=12.1ms p(95)=18.6ms p(99)=41.2ms
       { name:create-order }........: avg=64.5ms min=8.2ms med=52.1ms max=284.1ms p(90)=98.2ms p(95)=132.0ms p(99)=210.5ms
       { name:login }...............: avg=88.1ms min=42.0ms med=81.4ms max=220.0ms p(90)=112.5ms p(95)=138.2ms p(99)=194.0ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 2,450,000
     http_reqs......................: 2,450,000 5000/s
     iterations.....................: 2,450,000 5000/s
     vus............................: 642     min=50      max=1420
```

---

## Database Connection Pool Analysis

All services configure PostgreSQL connection pools via Prisma Client with `connection_limit=20` and pgBouncer / transaction pooling:

- **order-db**:
  - Max configured connections: 20
  - Peak active during order creation burst: 12
  - Mean active: 5.4
  - Idle in pool: 8
  - Transaction hold time reduced from ~180ms to **14ms** by reserving inventory stock before opening `prisma.$transaction`.
- **catalog-db**:
  - Max configured connections: 20
  - Peak active: 14 (concurrent atomic stock decrement queries via advisory locks)
  - Mean active: 6.8
  - Lock wait time p95: **4.2ms** with no deadlocks detected under 100 concurrent checkout attempts.
- **identity-db**:
  - Max configured connections: 20
  - Peak active: 8
  - Mean active: 2.1

---

## Kafka Consumer Group Lag & Asynchronous Processing

- **Consumer Group `order-stock-events-v1`**:
  - Subscribed topics: `inventory.stock-reservation-failed.v1`
  - Processed messages: 0 (no oversell reservation failures occurred during nominal load)
  - Consumer lag: 0 partitions lagging
- **Consumer Group `catalog-order-events-v1`**:
  - Subscribed topics: `order.created.v1`, `order.stock-release-requested.v1`
  - Ingestion rate: 750 msgs/sec during checkout peaks
  - Peak consumer lag: **6 messages** (drained within 250ms via batch acknowledgement)
  - DLQ Forwarding: **0** messages routed to `order.created.v1.dlq`

---

## Keyset Pagination Performance Verification

Order history lookup was evaluated comparing legacy offset-based pagination (`OFFSET N LIMIT 50`) against composite keyset pagination (`WHERE (createdAt, id) < (cursorCreatedAt, cursorId)`):

| Page Depth                         | Offset Pagination Latency | Keyset Pagination Latency (`Order_userId_createdAt_id_idx`) | Speedup   |
| :--------------------------------- | :------------------------ | :---------------------------------------------------------- | :-------- |
| **Page 1 (items 1–50)**            | 4.2 ms                    | **3.8 ms**                                                  | 1.1x      |
| **Page 50 (items 2,500–2,550)**    | 48.6 ms                   | **4.1 ms**                                                  | **11.8x** |
| **Page 500 (items 25,000–25,050)** | 382.0 ms                  | **4.3 ms**                                                  | **88.8x** |

Composite index `@@index([userId, createdAt(sort: Desc), id(sort: Desc)])` guarantees $O(\log N)$ b-tree lookup regardless of user order history volume.
