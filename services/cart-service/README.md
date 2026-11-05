# cart-service

Redis cart ownership, expiry and customer merge rules.

Status: buildable service foundation. `npm run dev --workspace cart-service` starts
the internal operations HTTP listener on 3006. `/health/live` returns 200;
`/health/ready` returns 503 until business dependencies and handlers are implemented.
No successful business responses are simulated. This service is excluded from the
default Compose and Kubernetes application deployments.

Before enabling it: define owned storage and migrations, implement handlers from
`contracts/`, add integration tests, and provide readiness checks for its dependencies.
