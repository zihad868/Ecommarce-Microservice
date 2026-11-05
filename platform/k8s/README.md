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

The inherited database/cache/Kafka manifests are development infrastructure;
they are not the integration layer for the managed AWS resources in Terraform.
See [migration notes](../../docs/migration.md) for renamed Secrets and protocols.
