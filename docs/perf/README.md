# Performance evidence

No measured baseline is currently published. The previous report was removed
because it had no raw results and described a database configuration different
from this repository (`connection_limit=5`, without PgBouncer).

Run only against an approved staging deployment with seeded users, sufficient
stock, and rate limits sized for the workload. k6 must be installed separately.
Set `GATEWAY_URL`, `LOAD_EMAIL`, `LOAD_PASSWORD`, `PRODUCT_ID`, and optionally
`TARGET_RPS` in the environment. Credentials must not be committed.

PowerShell:

```powershell
New-Item -ItemType Directory -Force docs/perf/results
$runDate = Get-Date -Format yyyy-MM-dd
k6 run --summary-export="docs/perf/results/$runDate.json" tools/k6/load-test.js
git rev-parse HEAD
```

Commit the unedited summary JSON and a matching dated note recording:

- Commit hash and deployed image digests.
- Application replica counts, CPU/memory requests and limits, and autoscaling behavior.
- Load-generator hardware and network location; node and database instance types.
- Database connection limit, replica counts, Kafka partitions and broker counts.
- Target URL/environment, workload settings, seed/stock size, rate limits and test time.
- Whether thresholds passed, dropped iterations, and any observed bottlenecks.

Report only measurements supported by those files. No staging run was performed
as part of the foundation implementation; a staging endpoint, test credentials,
and a k6 installation are still required.
