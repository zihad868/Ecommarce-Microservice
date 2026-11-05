# Baseline Report

Generated: 2026-10-16

## Environment

| Item    | Version                 |
| ------- | ----------------------- |
| Node.js | v24.20.0                |
| npm     | 11.19.0                 |
| OS      | Windows 11 (PowerShell) |

## Build Results

All three services compiled from TypeScript to JavaScript with zero errors or warnings.

| Service         | Command | Exit Code | Notes               |
| --------------- | ------- | --------- | ------------------- |
| auth-service    | `tsc`   | **0**     | Clean. No warnings. |
| product-service | `tsc`   | **0**     | Clean. No warnings. |
| order-service   | `tsc`   | **0**     | Clean. No warnings. |

## Existing Scripts

| Service         | Script                        | Exists? | Working?                         |
| --------------- | ----------------------------- | ------- | -------------------------------- |
| auth-service    | `build` (tsc)                 | Yes     | Yes                              |
| auth-service    | `start` (node dist/server.js) | Yes     | Requires env vars                |
| auth-service    | `dev` (nodemon + ts-node)     | Yes     | Requires env vars                |
| auth-service    | `db:migrate`                  | Yes     | Not tested (needs DB)            |
| auth-service    | `db:push`                     | Yes     | Not tested (needs DB)            |
| product-service | (same set)                    | Yes     | Same                             |
| order-service   | (same set)                    | Yes     | Same                             |
| Root            | `install:all`                 | Yes     | Uses `--prefix` (not workspaces) |
| Root            | `build`                       | Yes     | Chains all three                 |
| Root            | `db:generate`                 | Yes     | Chains all three                 |
| Root            | `docker:up`                   | Yes     | Not tested                       |

**No lint, typecheck-only, test, or format scripts exist anywhere.**

## Code Inventory

### Shared code (copy-pasted across all 3 services)

| Module                                 | auth | product | order |
| -------------------------------------- | ---- | ------- | ----- |
| `errors/ApiError.ts`                   | Yes  | Yes     | Yes   |
| `errors/handleClientError.ts`          | Yes  | Yes     | Yes   |
| `errors/handleValidationError.ts`      | Yes  | Yes     | Yes   |
| `errors/parsePrismaValidationError.ts` | Yes  | Yes     | Yes   |
| `shared/catchAsync.ts`                 | Yes  | Yes     | Yes   |
| `shared/sendResponse.ts`               | Yes  | Yes     | Yes   |
| `middlewares/errorHandler.ts`          | Yes  | Yes     | Yes   |
| `utils/redisClient.ts`                 | Yes  | Yes     | Yes   |

### Known Issues Catalogued

#### Correctness (Critical)

1. **Negative quantity** — `createOrder` has no quantity validation. Negative quantity passes stock check, produces negative `totalAmount`.
2. **Duplicate productIds** — not merged; results in duplicate stock checks and over-counting.
3. **Race condition / oversell** — stock check via gRPC, decrement via async Kafka consumer. Window allows concurrent orders to over-sell.
4. **Unconditional decrement** — `decrementProductStock` uses Prisma `decrement` without a floor guard; can produce negative stock.
5. **Dual-write / Kafka silent drop** — `publishEvent` silently returns if producer is not ready.
6. **Non-idempotent consumer** — redelivery decrements stock twice; errors are swallowed.
7. **Orders created COMPLETED** — no lifecycle (PENDING → CONFIRMED → SHIPPED → COMPLETED).
8. **Float money** — `price Float` and `totalAmount Float` in Prisma schemas. Floating point is unsuitable for monetary values.
9. **Wrong Kafka partition key** — key is `topic` name, routes all messages to partition 0.
10. **`redis.keys('products:list:*')`** — O(N) blocking scan, used in 3 places in product-service.
11. **No pagination bound** — `limit` has no cap; `page`/`limit` not checked for NaN; `sort` field unsanitized.
12. **`JSON.parse(data.attributes)` can throw** — unguarded in product gRPC server.
13. **Multiple PrismaClient instances** — auth-service has 2 (`authMiddleware.ts` + `authService.ts`), order-service has 3 (`orderService.ts` + two imports from grpc).

#### Security (Critical)

14. **Hardcoded JWT secret** — `process.env.JWT_SECRET || 'supersecret123'` in 3 places. Also set in `docker-compose.yml`.
15. **No authorization** — Role enum exists but not propagated through JWT or gRPC; any user can mutate products.
16. **No refresh token** — 1-day access token only.
17. **No logout / revocation** — deleted user valid for up to 5 min via Redis cache.
18. **`bcryptjs`** — pure-JS, blocks event loop; should be `argon2` or native `bcrypt`.
19. **Login returns 400** — should be 401 for invalid credentials.
20. **No password policy** — minimum length not enforced.
21. **No email normalization** — `user@Gmail.COM` and `user@gmail.com` treated as different.
22. **In-memory rate limiting** — not shared across pods; wrong message on auth limiter (`"15 minutes"` but window is 1 minute).
23. **No `helmet`** — missing security headers.
24. **CORS wide open** — `cors()` with no options.
25. **`trust proxy` not set** — rate limiter sees wrong IP behind a load balancer.
26. **Plaintext gRPC** — `createInsecure()` everywhere.
27. **`k8s/01-secrets.yaml` not in `.gitignore`** — contains production secrets; comment says it should be ignored.

#### Quality / Operations

28. **No tests** — zero test files, no test framework.
29. **No linting / formatting** — no ESLint, Prettier, or `.editorconfig`.
30. **No CI** — `.github/` directory present but empty (no workflow files).
31. **`prisma db push` in Docker CMD** — schema-force-push on every container start; data-destroying, not migration-safe.
32. **`console.log` only** — no structured logging, no request IDs, no correlation IDs, no metrics.
33. **`/health` lies** — returns `{ status: 'healthy' }` regardless of DB/Redis/Kafka state.
34. **No liveness/readiness split** — single `/health` endpoint.
35. **gRPC: no deadlines, no retries, no circuit breaker** — errors returned in body, not status codes.
36. **No graceful shutdown in auth-service** — HTTP server not drained; Prisma not closed; Redis not closed.
37. **Single-stage Dockerfiles** — ship all devDependencies; no image pinning by digest.
38. **No README** — only third-party guide markdown files present.
39. **No OpenAPI spec**.
40. **No ADRs**.

## Baseline Score (Honest)

| Area                | Score       | Notes                                                                      |
| ------------------- | ----------- | -------------------------------------------------------------------------- |
| Architecture        | 5/10        | Microservice pattern correct; no CQRS, no outbox, dual-write bug           |
| Code Structure      | 5/10        | Good folder layout; copy-paste duplication across all 3 services           |
| Security            | 2/10        | Hardcoded secret, no authz, no helmet, no RBAC, 400 for 401                |
| Data Integrity      | 2/10        | Float money, race condition oversell, non-idempotent consumer              |
| Validation          | 3/10        | Some manual checks; no zod schemas, no quantity/sort sanitization          |
| Reliability         | 3/10        | Silent Kafka drop, no circuit breaker, no graceful shutdown (auth)         |
| Performance/Caching | 4/10        | Redis caching exists; O(N) redis.keys, no stampede protection              |
| Testing             | 0/10        | No tests at all                                                            |
| CI/CD               | 1/10        | .github dir exists but no workflows                                        |
| Observability       | 1/10        | console.log only; /health fakes status                                     |
| Docker              | 4/10        | Healthchecks exist; single-stage, devDeps shipped, secrets in compose      |
| Kubernetes          | 5/10        | Rich manifests; secrets.yaml not gitignored, no NetworkPolicy default-deny |
| Documentation       | 2/10        | No README; only informal guide docs                                        |
| **Overall**         | **~2.9/10** | Averaged                                                                   |
