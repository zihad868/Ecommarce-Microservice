# Contributing

Use Node.js 22 and npm 10+. Install at the repository root with `npm ci`, then
run `npm run db:generate`. The committed npm lockfile owns dependency resolution.

```sh
npm run contracts:generate  # after editing protobuf contracts
npm run build
npm run check
npm run format
```

Workspaces are `services/*`, `edge/api-gateway` and `packages/*`. Use
`npm run dev --workspace identity-service` (or another service name) for local
development. See the [runbook](docs/runbooks/local-development.md) for dependencies.

Cross-service types belong in versioned contracts. Services communicate through
gRPC/events and own their data. Do not import another service's source or database
client. Place shared behavior in its owning package; `common` keeps compatibility
exports for the existing Express code. New monetary contracts use integer minor
units and currency; storage uses Prisma Decimal.

Use deadlines on RPC calls and restrict retries to operations safe to repeat.
Consumers must tolerate duplicate delivery. Only commit an event offset after
processing succeeds or DLQ publication succeeds. Document architecture changes
under `docs/adr` and update readiness when adding new service dependencies.

The six foundation services should remain out of default deployment until their
business handlers, migrations, dependency probes and integration checks exist.
Use Conventional Commits; Husky and Commitlint enforce the repository convention.

## Structure and Readability Conventions

- **Consistent folder layout**: Maintain a consistent folder layout in every service, for example `src/domain`, `src/application`, `src/infrastructure`, `src/transport`, and `src/index.ts`.
- **Naming**:
  - `kebab-case` for file names (`order.service.ts`).
  - `PascalCase` for classes, types, and interfaces.
  - `camelCase` for functions, methods, and variables.
  - `UPPER_SNAKE_CASE` for constants.
- **Import order**: Node built-ins, followed by external packages, then workspace packages (`@ecommerce/*`), and finally relative imports. The ESLint plugin `eslint-plugin-import` or `simple-import-sort` automates this.
- **Small functions and files**: Aim for one responsibility per function and keep files under ~300 lines.
- **Functions**: Use `const` arrow functions for named helpers and exports, and arrow callbacks. Keep class constructors in their required constructor syntax. Declare helpers before any calls made during module initialization.
- **Blank lines**: Keep blank lines between logical blocks inside functions. Prettier preserves single blank lines you add, so use them to separate steps.
- **Comments**: Explain _why_, not _what_, and avoid commented-out code.
- **No magic numbers or strings**: Move magic numbers and strings to named constants or the config package.
