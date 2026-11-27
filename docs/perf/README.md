# Performance evidence

No measured baseline is currently published. The previous report was removed
because it had no raw results and described a database configuration different
from this repository (`connection_limit=5`, without PgBouncer).

Run only against an approved staging deployment with seeded users, sufficient
stock, and rate limits sized for the workload. k6 must be installed separately.
Set `GATEWAY_URL`, `LOAD_EMAIL`, `LOAD_PASSWORD`, `PRODUCT_ID`, and optionally
`TARGET_RPS` in the environment. Credentials must not be committed. Defaults are
20 aggregate peak requests/second, 30 seconds warmup, 30 seconds ramp-up,
2 minutes at peak, and 15 seconds cooldown. Override `WARMUP_DURATION`,
`RAMP_DURATION`, `STEADY_DURATION`, and `COOLDOWN_DURATION` as needed. All phases
scale with `TARGET_RPS`; there is no fixed high-load warmup. Small targets allocate
at least one request/second each to login and checkout; browsing gets the rest.

The seeded product needs enough stock for the checkout workload. Use a dedicated
test account: this script creates real staging orders and login sessions. Set
staging per-IP gateway quotas above `TARGET_RPS * 60` per minute (plus headroom)
and auth quotas above `max(1, floor(TARGET_RPS * 0.05)) * 900` per 15 minutes.
Preserve production quotas. For the default 20 RPS, allow at least 1,440 gateway
requests/minute and 1,080 auth requests/15 minutes, including 20% headroom.
Otherwise 429 responses correctly fail the baseline rather than measuring
backend capacity. The checkout access token must remain valid for the entire
run; choose durations shorter than its configured lifetime.

The script preflights readiness and login, and fails on any unsuccessful check,
HTTP error rate >= 1%, p95 >= 300 ms, p99 >= 800 ms, or dropped iterations.

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

The manually triggered **Staging performance baseline** GitHub workflow captures
the raw summary, output, threshold exit code, deployed images/digests, resource
requests/limits, replica counts, HPA snapshots and load-generator sizing in an
artifact, including on threshold failure. It uses the same staging environment
and EKS runner as deployment. Configure staging variables `GATEWAY_URL`,
`EKS_CLUSTER`, `AWS_REGION`, `PERF_PRODUCT_ID`, secrets `PERF_LOAD_EMAIL`,
`PERF_LOAD_PASSWORD`, and the existing `AWS_DEPLOY_ROLE_ARN`. The runner needs
kubectl and permission to read staging deployments/pods/HPAs and node sizing.
Include database/broker/cache sizing, pools, partition counts, quotas and seed
stock in the required deployment note. Download and review the artifact, then
commit the summary and dated note before claiming a measured baseline. A passing
local regression test is not a staging throughput measurement.
