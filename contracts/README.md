# Versioned contracts

`proto/` contains synchronous gRPC contracts; `events/` contains protobuf event
payloads. Add fields with new numbers, reserve removed numbers/names, and create
a new version for incompatible changes. Never share service persistence models.

Auth and order v1 contracts remain unchanged. Their services also expose v2:
auth v2 rejects invalid tokens with gRPC errors, and order v2 returns typed
orders with enum statuses, Money totals and item prices. Neither v2 contract
embeds success/error fields. The gateway uses v2; deploy identity/order before
the gateway. See [gateway API](../docs/API.md) for the HTTP response changes.

```sh
npm run contracts:check
npm run contracts:generate
npm run contracts:lint
```

The pinned Buf CLI is installed with the workspace development dependencies.
Local codegen generates typed gRPC clients/handlers into
`packages/proto-gen/src/generated` using `@grpc/proto-loader`. Runtime options
match codegen: camel-case fields preserved, longs/enums represented as strings,
and defaults enabled. CI verifies regeneration produces no diff.

Buf's config permits the original camel-case fields during this first versioned
migration. Events have an `events.*` package namespace with a separate module
root. Other basic lint rules and FILE breaking checks apply. CI compares schemas
with the PR base when the base already contains versioned contracts.

`buf.gen.yaml` provides optional ts-proto wire type generation. Invoke it from
this directory with `buf generate`; it requires access to the Buf remote plugin.
These optional types supplement the runtime gRPC bindings; local builds do not
require remote generation or an account.

The active event is `events.order.v1.OrderCreated` on `order.created.v1`.
PaymentSucceeded and StockReserved are schema definitions for future consumers.
See [migration notes](../docs/migration.md) before deploying the topic change.
