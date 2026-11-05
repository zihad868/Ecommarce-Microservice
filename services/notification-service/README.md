# notification-service

Event consumers for email, SMS and push with delivery deduplication. No public business API.

Status: buildable service foundation. `npm run dev --workspace notification-service` starts
the internal operations HTTP listener on 3008. `/health/live` returns 200;
`/health/ready` returns 503 until business dependencies and handlers are implemented.
No successful business responses are simulated. This service is excluded from the
default Compose and Kubernetes application deployments.

Before enabling it: define owned storage and migrations, implement handlers from
`contracts/`, add integration tests, and provide readiness checks for its dependencies.
