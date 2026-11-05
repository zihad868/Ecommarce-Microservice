# Kubernetes layout

`base/` composes infrastructure manifests and the four implemented applications
from `services/`. Each application includes Deployment, Service, HPA and PDB.
The `overlays/dev`, `overlays/staging`, and `overlays/prod` directories choose
namespaces and replicas. Ingress routes `/api` to the gateway.

Render without contacting a cluster:

```sh
kubectl kustomize platform/k8s/overlays/dev
kubectl kustomize platform/k8s/overlays/staging
kubectl kustomize platform/k8s/overlays/prod
```

Before deploying, replace registry placeholders, set gateway image substitution,
create secrets using `01-secrets.example.yaml` as a reference, and run the
migration jobs in `12-db-migration-job.yaml` with matching namespaces and images.
Jobs are separate from the application base so migrations are an explicit release
step. EKS autoscaler setup is likewise outside the namespace-scoped app base.

The application base includes `kafka-topics-init`, using the catalog image and
Secret to provision every configured topic and its DLQ. Catalog and order init
containers check that all topics exist and have leaders before starting their
application containers. Topics default to six partitions with replication one
in dev and three in staging/prod. Managed overlays use the catalog service
account with MSK IAM for the Job, and each application's service account for
its topic check. Keep the Job image aligned with the release images.

For a subsequent release with changed topics, delete/recreate the completed
`kafka-topics-init` Job before rolling out applications (Kubernetes Job pod
templates are immutable). With Argo CD, use a release-specific Job name or a
replace policy. Wait for Job completion before considering deployment healthy:

```sh
kubectl -n ecommerce-dev wait --for=condition=complete job/kafka-topics-init --timeout=600s
```

Topic creation is idempotent and preserves existing topic settings. Changing
partition counts or replication on existing topics requires a separate broker
administration change. Compose runs the same script as a one-shot dependency;
run it locally after building shared packages with `node tools/create-topics.mjs`.

The inherited database/cache/Kafka manifests are development infrastructure;
they are not the integration layer for the managed AWS resources in Terraform.
See [migration notes](../../docs/migration.md) for renamed Secrets and protocols.
