# inventory-service

Stock and reservation ownership; extract catalog stock through a data migration before enabling writes.

Status: buildable service foundation. `npm run dev --workspace inventory-service` starts
the internal operations HTTP listener on 3004. `/health/live` returns 200;
`/health/ready` returns 503 until business dependencies and handlers are implemented.
No successful business responses are simulated. This service is excluded from the
default Compose and Kubernetes application deployments.

Before enabling it: define owned storage and migrations, implement handlers from
`contracts/` and provide readiness checks for its dependencies.
