# Migration from the old layout

| Previous path/name                              | Active location                                   |
| ----------------------------------------------- | ------------------------------------------------- |
| `ecommarce/auth-service` / `auth-service`       | `services/identity-service` / `identity-service`  |
| `ecommarce/product-service` / `product-service` | `services/catalog-service` / `catalog-service`    |
| `ecommarce/order-service`                       | `services/order-service`                          |
| `ecommarce/packages/common`                     | `packages/common`, plus extracted shared packages |
| `ecommarce/protos`                              | `contracts/proto/<domain>/v1`                     |
| `ecommarce/docker`                              | `platform/observability`                          |
| `k8s`                                           | `platform/k8s`                                    |
| `tests/k6`                                      | `tools/k6`                                        |

The duplicated standalone auth application and historical documentation are
preserved under `docs/legacy/` and excluded from active workspaces. Prisma clients
are generated artifacts; run `npm run db:generate` after installing dependencies.
Shared builds are ordered by Turborepo; compiled Prisma runtime files are copied
into service `dist/generated/client` by the build script.

This is also a protocol migration: gRPC names now include `.v1` and OrderCreated
uses protobuf bytes on `order.created.v1` with DLQ `order.created.v1.dlq`.
Coordinate producer and consumer rollout together. Drain the original JSON
`order.created` topic before switching, or build a controlled bridge retaining
the original event IDs. No automatic replay from the old topic is performed.
The new consumer reads the versioned topic from its beginning and retains the
existing database deduplication. Pending outbox rows keep their IDs and payloads.

Baseline migrations were generated from the existing Prisma schemas. Fresh
databases use `prisma migrate deploy`. For a pre-existing database created with
`db push`, compare its schema with the baseline and back it up before recording
`20261105000000_baseline` as applied with `prisma migrate resolve`. Do not mark a
baseline applied when schema drift exists. This work has not changed a live DB.

Compose now uses project name `ecommerce`. To attach a previous installation's
named volumes, supply its original `--project-name` consistently or explicitly
configure the existing volume names. Do not start a second stack against the same
volumes. Database service/volume identities (`auth-db`, `product-db`, `order-db`)
are retained to avoid an unnecessary data rename.

Kubernetes Secrets referenced by the apps are now `identity-service-secret`,
`catalog-service-secret` and `order-service-secret`. The example manifest has
the updated names. Local secret files were not rewritten. Replace image names
in the base with your registry, create environment-specific secrets, and run
the migration jobs with matching image tags before rolling out services.

The overlays avoid service name prefixes because backend DNS names are supplied
through environment variables. Namespace isolation supplies environment separation.
Foundation services are not added to default Kubernetes or Compose deployments.
