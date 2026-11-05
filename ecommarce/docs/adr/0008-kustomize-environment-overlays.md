# 8. Kustomize Environment Overlays (Dev, Staging, Prod)

Date: 2026-10-16

## Status

Accepted

## Context

Deploying Kubernetes manifests directly across development, staging, and production leads to configuration drift, duplicate manifests, or error-prone manual environment variable overrides. Dev clusters need single replicas and relaxed resource limits to minimize cloud costs, while production requires multi-zone high availability, PodDisruptionBudgets, and autoscaling.

## Decision

We utilize native Kustomize with a clean Base + Overlays directory hierarchy:

- **Base (`k8s/`)**: Declares the canonical state of all microservice Deployments, Services, ConfigMaps, Zero-Trust NetworkPolicies, and Ingress rules.
- **Overlays (`k8s/overlays/`)**:
  - `dev/`: 1 replica per service, `dev-` name prefix, low CPU/memory requests.
  - `staging/`: 2 replicas per service, pre-production integration testing.
  - `prod/`: 3+ replicas, multi-zone PodDisruptionBudgets (`pdb.yaml` with `minAvailable: 2`), and anti-affinity/topology spread rules to prevent downtime during cluster node upgrades or pod evictions.

## Consequences

- Single source of truth with DRY declarative configuration.
- Native Kubernetes integration without third-party template engines (Helm or templating scripts).
- GitOps-compatible deployment workflow (`kubectl apply -k k8s/overlays/prod`).
