# Production Operations Runbook

## Table of Contents

1. [System Overview & Architecture](#system-overview)
2. [Incident Response Playbooks](#incident-response)
   - [Alert: High HTTP 5xx Error Rate](#1-high-5xx-error-rate)
   - [Alert: Circuit Breaker Open (gRPC Failure)](#2-circuit-breaker-open)
   - [Alert: Outbox Relay Worker Lag / Backlog](#3-outbox-worker-backlog)
   - [Alert: Kafka Consumer Lag / DLQ Poison Pills](#4-kafka-consumer-lag--dlq-replay)
   - [Alert: Database Pool Exhaustion](#5-database-pool-exhaustion)
3. [Deployment, Rolling Updates & Emergency Rollback](#deployment--rollback)
4. [Dead Letter Queue (DLQ) Replay Procedure](#dlq-replay-procedure)

---

## 1. System Overview

The platform runs 3 primary microservices:

- `auth-service`: Port 3001 (REST), 50051 (gRPC). Authenticates users, validates tokens.
- `product-service`: Port 3002 (REST), 50052 (gRPC). Manages catalog, atomic stock decrement.
- `order-service`: Port 3003 (REST), 50053 (gRPC). Transactional outbox, order lifecycle state machine.

---

## 2. Incident Response Playbooks

### 2.1 High 5xx Error Rate

1. **Identify the affected service:**
   Check the Grafana **Ecommerce Overview Dashboard** or Prometheus metrics:
   ```promql
   sum by (service) (rate(http_requests_total{status_code=~"5.."}[2m]))
   ```
2. **Inspect structured logs:**
   ```bash
   kubectl logs -l app=order-service -n ecommerce --tail=100 | jq 'select(.level=="error")'
   ```
3. **Verify readiness probes:**
   ```bash
   kubectl get pods -n ecommerce -l app=order-service
   curl -s http://<service-ip>:3003/health/ready
   ```

### 2.2 Circuit Breaker Open

- **Symptom:** `order-service` logs `[Opossum] CircuitBreaker product-service.GetProduct is OPEN`.
- **Root Cause:** gRPC calls from order-service to product-service are failing or exceeding 5000ms deadline.
- **Action:**
  1. Check `product-service` pod status and CPU/memory utilization:
     ```bash
     kubectl top pods -n ecommerce -l app=product-service
     ```
  2. If product-service is unresponsive, restart the deployment:
     ```bash
     kubectl rollout restart deployment/product-service -n ecommerce
     ```

### 2.3 Outbox Worker Backlog

- **Symptom:** Orders are placed, but stock is not deducted in `product-service` within 5 seconds.
- **Root Cause:** Outbox relay worker is stuck or Kafka broker is unreachable.
- **Action:**
  1. Check unpublished count in PostgreSQL:
     ```sql
     SELECT COUNT(*) FROM "OutboxEvent" WHERE published = false;
     ```
  2. If `retryCount` is high, inspect Kafka broker health:
     ```bash
     kubectl exec -it kafka-0 -n ecommerce -- kafka-topics --bootstrap-server localhost:9092 --list
     ```

---

## 3. Deployment & Rollback

### Check Rollout Status

```bash
kubectl rollout status deployment/order-service -n ecommerce
```

### Emergency Immediate Rollback

If a newly deployed image introduces critical errors:

```bash
# Roll back to the previous deployment revision
kubectl rollout undo deployment/auth-service -n ecommerce
kubectl rollout undo deployment/product-service -n ecommerce
kubectl rollout undo deployment/order-service -n ecommerce
```

---

## 4. Dead Letter Queue (DLQ) Replay Procedure

When poison-pill messages fail schema validation or inventory allocation, they are published to `order.created.dlq`.

### 1. Inspect DLQ Messages

```bash
kubectl exec -it kafka-0 -n ecommerce -- kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic order.created.dlq \
  --from-beginning \
  --max-messages 10
```

### 2. Remediate & Replay

Once underlying bugs or data discrepancies are resolved:

1. Extract message payload.
2. Publish corrected message back to primary topic `order.created`:
   ```bash
   kubectl exec -it kafka-0 -n ecommerce -- kafka-console-producer \
     --bootstrap-server localhost:9092 \
     --topic order.created
   ```
3. Monitor `ProcessedEvent` table in `product-service` to verify successful reconciliation without duplicate deductions.
