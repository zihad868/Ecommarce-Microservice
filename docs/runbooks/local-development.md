# Local development

Use Node.js 22 and npm 10 or later. From the repository root:

```sh
npm ci
npm run db:generate
npm run contracts:check
npm run build
npm run check
```

Prisma generation downloads the platform-specific engine. Protobuf-generated
TypeScript is committed; regenerate after editing contracts:

```sh
npm run contracts:generate
npm run contracts:lint
```

Run the local stack after copying `.env.example` to `.env` and setting database,
JWT and Grafana values. Keep existing `.env` files when upgrading a checkout.

```sh
docker compose up --build -d
docker compose ps
curl http://localhost:8081/health/ready
docker compose logs api-gateway identity-service catalog-service order-service
```

The three database services run baseline migrations before starting application
processes. Existing installations must follow [the migration notes](../migration.md).
Service REST ports are 3001, 3002 and 3003; gRPC ports are 50051–50053. PostgreSQL
host ports are 5433 (identity), 5435 (catalog) and 5434 (order). Host-side Kafka
clients use `localhost:9093`; containers use `kafka:9092`.

For a service outside Docker, copy its `.env.example` to `.env` and set matching
database credentials, start the required dependencies, then use its workspace:

```sh
docker compose up -d auth-db product-db order-db redis kafka
npm run db:migrate
npm run dev --workspace identity-service
```

Start catalog and order in separate terminals after identity. The gateway takes
configuration from environment variables and defaults to local backend ports.
`npm run dev:gateway` starts it; no root database URL is shared among services.

Enable observability with `docker compose --profile observability up -d`.
Prometheus is on 9090 and Grafana on 3000. To emit traces, set
`OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` in the Compose `.env` and
recreate the application containers. The collector logs trace summaries; replace
the debug exporter with a durable tracing backend for deployed environments.
Workspace `start` scripts and Docker preload the OTel bootstrap before HTTP/gRPC.
For `dev` with tracing, preload the compiled bootstrap through `NODE_OPTIONS`.

The new foundation services can be inspected with
`npm run dev --workspace inventory-service` (or another service name).
Their readiness deliberately returns 503 until their business behavior exists.

`docker compose down` stops the local stack. Add `--volumes` only when explicitly
resetting local data.
