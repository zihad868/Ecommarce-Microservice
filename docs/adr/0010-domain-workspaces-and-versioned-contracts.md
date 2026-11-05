# 0010: Domain workspaces and versioned contracts

Status: accepted, 2026-11-05.

The old nested tree duplicated an auth app and used root-relative paths that did
not match build/CI/Docker configuration. Shared implementation accumulated in one
common package. We adopt the proposed root-level domain workspace layout with
npm workspaces and Turborepo, preserving the existing lockfile ecosystem.

Auth becomes identity and product becomes catalog. Cross-service schemas move
to versioned proto and event directories. Typed runtime bindings are generated
with the installed gRPC proto-loader tool. Buf manages schema lint and breaking
checks. The first version preserves existing camel-case JSON names and double
amounts for compatibility; new financial contracts use integer minor units and
currency. Breaking field/type changes require a new major contract version.

Shared transport, messaging, error, config and observability implementations each
have one owning package. Common temporarily reexports them. Six service
foundations reserve domain boundaries and stay unready until implemented.
Inventory extraction and the payment saga remain separate domain migrations;
the structural change does not silently change stock authority.

The API gateway begins with authentication and read endpoints. Legacy REST
commands remain service-local until typed command RPCs are added. BFFs remain
optional. This decision supersedes the old ingress routing ADR for public entry.
