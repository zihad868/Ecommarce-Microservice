# payment-service

Payment intents, provider webhooks, refunds, and durable idempotency. Requires provider credentials and a ledger.

Status: buildable service foundation. `npm run dev --workspace payment-service` starts
the internal operations HTTP listener on 3005. `/health/live` returns 200;
`/health/ready` returns 503 until business dependencies and handlers are implemented.
No successful business responses are simulated. This service is excluded from the
default Compose and Kubernetes application deployments.

Before enabling it: define owned storage and migrations, implement handlers from
`contracts/` and provide readiness checks for its dependencies.
