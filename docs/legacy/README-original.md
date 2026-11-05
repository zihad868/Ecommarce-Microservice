# Enterprise E-Commerce Microservices Platform

[![CI Pipeline](https://github.com/zihad868/Ecommarce-Microservice/actions/workflows/ci.yml/badge.svg)](https://github.com/zihad868/Ecommarce-Microservice/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8_Strict-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A production-grade, 10/10 distributed e-commerce microservices system engineered with **Node.js 22**, **Express 5**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, **Redis**, **Apache Kafka (KRaft)**, and **gRPC**.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TB
    Client["Client (Web / Mobile)"]
    Ingress["NGINX Ingress / API Gateway (Port 3000)"]

    subgraph Microservices ["Microservices Layer"]
        AuthSvc["Auth Service\n(Port 3001 | gRPC 50051)"]
        ProductSvc["Product Service\n(Port 3002 | gRPC 50052)"]
        OrderSvc["Order Service\n(Port 3003 | gRPC 50053)"]
    end

    subgraph DataTier ["Data & Caching Tier"]
        AuthDB[("Auth DB\n(PostgreSQL)")]
        ProductDB[("Product DB\n(PostgreSQL)")]
        OrderDB[("Order DB\n(PostgreSQL)")]
        RedisCache[("Redis 7\n(Shared Cache)")]
    end

    subgraph MessagingTier ["Event Streaming Tier"]
        KafkaBroker["Kafka Broker (KRaft)\nTopic: order.created\nDLQ: order.created.dlq"]
        OutboxRelay["Outbox Relay Worker\n(Order Service)"]
    end

    subgraph Observability ["Observability Stack"]
        Prometheus["Prometheus (Port 9090)"]
        Grafana["Grafana (Port 3000)\nDashboards"]
        Jaeger["Jaeger Tracing (Port 16686)"]
    end

    Client -->|HTTPS / REST| Ingress
    Ingress -->|/api/auth| AuthSvc
    Ingress -->|/api/products| ProductSvc
    Ingress -->|/api/orders| OrderSvc

    OrderSvc -->|gRPC ValidateToken (Resilient)| AuthSvc
    OrderSvc -->|gRPC GetProduct (Resilient)| ProductSvc
    ProductSvc -->|gRPC ValidateToken (Resilient)| AuthSvc

    AuthSvc --> AuthDB
    AuthSvc --> RedisCache

    ProductSvc --> ProductDB
    ProductSvc --> RedisCache

    OrderSvc --> OrderDB
    OrderSvc --> RedisCache
    OrderSvc -.->|Transactional Outbox| OutboxRelay
    OutboxRelay -->|Publish Event| KafkaBroker
    KafkaBroker -->|Consume & Idempotent Decrement| ProductSvc

    AuthSvc -.->|/metrics| Prometheus
    ProductSvc -.->|/metrics| Prometheus
    OrderSvc -.->|/metrics| Prometheus
    Prometheus --> Grafana
```

---

## 🚀 Key Architectural Highlights

1. **Transactional Outbox Pattern**:
   - Order creation atomically persists the `Order` record and an `OutboxEvent` record in a single PostgreSQL ACID transaction (`prisma.$transaction`).
   - A dedicated outbox worker delivers events to Kafka with exponential backoff and dead-letter queue (DLQ) support.
2. **Zero Overselling / Atomic Stock Decrements**:
   - Inventory decrements execute at the database engine level (`WHERE stock >= quantity`), eliminating race conditions without distributed locks.
   - Idempotent Kafka consumer tracks processed event IDs in `ProcessedEvent` table.
3. **Resilient Inter-Service gRPC**:
   - Synchronous calls use `invokeResilientGrpc` with timeouts (5s deadline), exponential jittered retries, and circuit breaker protection (Opossum).
4. **Sub-millisecond Versioned Caching**:
   - Eliminates blocking `redis.keys()` scans using an O(1) monotonically incremented `products:list:version`.
5. **Observability & Golden Signals**:
   - Structured JSON logging (`pino`) with automatic redaction of sensitive credentials and correlation ID propagation.
   - Prometheus `/metrics` endpoints and pre-configured Grafana dashboards.
   - Kubernetes-standard `/health/live` and deep `/health/ready` probes.

---

## 📁 Repository Structure

```
.
├── auth-service/           # User authentication, Argon2id, rotating tokens, gRPC server
├── product-service/        # Product catalog, stock management, versioned caching
├── order-service/          # Orders, transactional outbox worker, state machine
├── packages/
│   └── common/             # Monorepo shared utilities (errors, logger, metrics, gRPC)
├── protos/                 # Protocol Buffer contracts (auth.proto, product.proto, order.proto)
├── docker/                 # Prometheus & Grafana provisioning configurations
├── docs/
│   ├── adr/                # 9 Architectural Decision Records (ADRs)
│   ├── openapi.yaml        # Complete OpenAPI 3.0 REST specification
│   ├── RUNBOOK.md          # Production incident response and alert runbooks
│   ├── SECURITY.md         # Threat model, secret rotation, zero-trust policies
│   ├── PERFORMANCE.md      # Performance benchmarks and load test results
│   └── BASELINE.md         # Baseline assessment and upgrade roadmap
├── k8s/                    # Production Kubernetes manifests, NetworkPolicies, Ingress
│   └── overlays/           # Kustomize environments (dev, staging, prod)
├── tests/
│   └── k6/                 # k6 load testing scripts
└── docker-compose.yml      # Local development and full stack compose
```

---

## ⚡ Quick Start

### 1. Prerequisites

- Docker & Docker Compose v2.20+
- Node.js v22+ & npm v10+

### 2. Launch with Docker Compose

```bash
# Clone the repository
git clone https://github.com/zihad868/Ecommarce-Microservice.git
cd Ecommarce-Microservice

# Start the entire platform (microservices, databases, Kafka, Redis)
docker compose up --build -d

# Check service health
curl -s http://localhost:3001/health/ready
curl -s http://localhost:3002/health/ready
curl -s http://localhost:3003/health/ready
```

### 3. Launch Observability Stack

```bash
# Start with Prometheus, Grafana, and Jaeger enabled
docker compose --profile observability up -d
```

- **Grafana Dashboard**: [http://localhost:3000](http://localhost:3000) (admin / admin)
- **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
- **Jaeger UI**: [http://localhost:16686](http://localhost:16686)
- **Kafka UI**: [http://localhost:8080](http://localhost:8080)

---

## 🧪 Testing

```bash
# Monorepo-wide typechecking
npm run typecheck

# Monorepo-wide strict linting
npm run lint

# Build all packages
npm run build

# Run unit, integration, and concurrency tests
npm test

# Run k6 load test
k6 run tests/k6/load-test.js
```

---

## ☸️ Kubernetes Deployment (Kustomize)

Deploy across environments using native Kustomize overlays:

```bash
# Deploy to Development
kubectl apply -k k8s/overlays/dev

# Deploy to Staging
kubectl apply -k k8s/overlays/staging

# Deploy to Production (multi-zone HA, 3+ replicas, PDBs)
kubectl apply -k k8s/overlays/prod
```

---

## 📚 Documentation Index

- [Architectural Decision Records (ADRs)](docs/adr/)
- [OpenAPI 3.0 Specification](docs/openapi.yaml)
- [Production Runbook](docs/RUNBOOK.md)
- [Security Architecture & Secret Rotation](docs/SECURITY.md)
- [Performance & Latency SLOs](docs/PERFORMANCE.md)
- [Contributing Guidelines](CONTRIBUTING.md)
