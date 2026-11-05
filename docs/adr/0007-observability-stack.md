# 7. Observability Stack: Prometheus, Pino, Jaeger, and Grafana

Date: 2026-10-16

## Status

Accepted

## Context

Production microservice architectures require clear visibility into latency, throughput, error rates, and resource utilization (the Golden Signals). Plain text `console.log` statements are unsearchable at scale and risk leaking sensitive credentials or PII.

## Decision

1. **Structured Logging (Pino)**:
   - Output all application logs as structured single-line JSON.
   - Enforce automatic redaction of sensitive paths (`password`, `token`, `refreshToken`, `authorization`, `secret`).
   - Propagate `x-correlation-id` and `x-request-id` headers through an HTTP logging middleware attached to every Express request.
2. **Prometheus Metrics**:
   - Collect default Node.js runtime metrics (event loop lag, memory usage, heap stats).
   - Collect custom HTTP metrics: `http_requests_total` and `http_request_duration_seconds` (histogram with standard buckets).
   - Collect gRPC metrics: `grpc_requests_total` and `grpc_request_duration_seconds`.
   - Expose Prometheus metrics on `/metrics` endpoint.
3. **Health Checks**:
   - `/health/live`: Shallow liveness probe for Kubernetes and Docker engine.
   - `/health/ready`: Deep readiness probe checking database (`SELECT 1`), Redis ping, and Kafka connectivity.
4. **Resiliency & Circuit Breaking**:
   - Wrap inter-service gRPC communication in `invokeResilientGrpc` with timeouts (deadlines), exponential jittered retries, and Opossum circuit breakers to prevent cascading cascading thread exhaustion.
5. **Docker Compose Observability Profile**:
   - Bundled under the `observability` profile (`docker compose --profile observability up`) with Prometheus, Grafana (with provisioned dashboards and datasources), and Jaeger OTLP tracing.

## Consequences

- Immediate detection of SLO violations, latency spikes, and 5xx errors.
- Zero credential leakage in standard log streams.
- Predictable and rapid recovery during downstream dependency degradations.
