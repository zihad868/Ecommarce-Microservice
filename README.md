# Ecommerce microservices

TypeScript monorepo organized around versioned contracts, an edge gateway,
domain services, shared libraries and deployment infrastructure. The repository
root corresponds to `ecommerce/` in the proposed architecture.

```text
.
├── contracts/
│   ├── proto/{auth,product,order,inventory,payment,common}/v1/
│   ├── events/{order,payment,inventory}/v1/
│   ├── buf.yaml
│   └── buf.gen.yaml
├── edge/
│   ├── api-gateway/
│   ├── bff-web/                  # optional boundary
│   └── bff-mobile/               # optional boundary
├── services/
│   ├── identity-service/
│   ├── catalog-service/
│   ├── order-service/
│   ├── inventory-service/
│   ├── payment-service/
│   ├── cart-service/
│   ├── search-service/
│   ├── notification-service/
│   └── media-service/
├── packages/
│   ├── proto-gen/
│   ├── grpc-kit/
│   ├── messaging-kit/
│   ├── observability/
│   ├── config/
│   ├── errors/
│   └── common/                   # HTTP/Redis helpers and compatibility exports
├── platform/
│   ├── k8s/{base,services,overlays}/
│   ├── terraform/
│   ├── docker/
│   └── observability/
├── tools/                        # codegen, affected-workspace filters, k6
├── docs/                         # architecture, ADRs, runbooks, migration, API
├── .github/workflows/
├── turbo.json
├── package.json
└── package-lock.json
```

Identity, catalog and order retain the existing Prisma/PostgreSQL, Redis, gRPC
and transactional outbox implementation. Auth/product workspace names have
changed to identity/catalog. The new gateway provides gRPC-backed authentication
and read endpoints with authentication, limits and order ownership checks.

Inventory, payment, cart, search, notification and media are buildable service
foundations. Their operations listeners run, but business readiness returns 503
until domain handlers and persistence exist. Stock still belongs to catalog
during this transition. This checkout does not yet implement the full reservation
saga, payment provider integrations, Redis cart, OpenSearch or S3/CDN workflows.

Use Node.js 22 and npm 10 or later:

```sh
npm ci
npm run db:generate
npm run contracts:check
npm run build
npm run check
```

For the implemented local stack, copy `.env.example` to `.env`, set its values,
and run:

```sh
docker compose up --build -d
curl http://localhost:8081/health/ready
```

See [local development](docs/runbooks/local-development.md),
[gateway endpoints](docs/API.md), and [architecture](docs/architecture.md).
Read [migration notes](docs/migration.md) before upgrading an existing database
or deploying the new versioned gRPC names and protobuf event topic.

CI checks shared libraries and selects changed services through path filters.
Docker uses a single parameterized build; Kubernetes uses per-service resources
and environment overlays. Terraform is an AWS starter that requires provider
validation and environment integration before application deployment.
