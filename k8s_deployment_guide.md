# 🚀 AWS Production-Grade Kubernetes Deployment Guide
## Ecommerce Microservice — Full K8s Setup

## Recommended Run Modes

Use Docker Compose for local development. Use Kubernetes only after the service images have been built, tagged with a version, and pushed to a registry. Do not use `latest` in a shared cluster.

### Local Docker Compose

From the repository root:

```powershell
docker compose up --build -d
docker compose ps
Invoke-WebRequest http://localhost:3001/health
Invoke-WebRequest http://localhost:3002/health
Invoke-WebRequest http://localhost:3003/health
```

Stop the stack with `docker compose down`; add `-v` only when you intentionally want to delete local database and Redis data.

### Kubernetes Prerequisites

The manifests target an AWS EKS cluster with a default `gp2`/`gp3` StorageClass, Metrics Server, an ingress controller, and a registry such as ECR. The PostgreSQL, Redis, and single-node Kafka manifests are suitable for development or a small non-critical environment. For production, use RDS, ElastiCache, and MSK instead of running stateful infrastructure inside the application cluster.

### Build and Push Versioned Images

```powershell
$AccountId = aws sts get-caller-identity --query Account --output text
$Region = "ap-southeast-1"
$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$Version = "1.0.0"

aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry

docker build -f auth-service/Dockerfile -t "$Registry/auth-service:$Version" .
docker build -f product-service/Dockerfile -t "$Registry/product-service:$Version" .
docker build -f order-service/Dockerfile -t "$Registry/order-service:$Version" .
docker push "$Registry/auth-service:$Version"
docker push "$Registry/product-service:$Version"
docker push "$Registry/order-service:$Version"
```

Create the ECR repositories once with `aws ecr create-repository --repository-name <service> --region $Region`.

### Configure and Deploy with Kustomize

```powershell
kubectl apply -f k8s/00-namespace.yaml
kubectl create secret generic auth-service-secret -n ecommerce --from-literal=DATABASE_URL="postgresql://..." --from-literal=JWT_SECRET="<random-secret>" --from-literal=REDIS_HOST=redis-service --from-literal=REDIS_PORT=6379
# Create the remaining service and database secrets with the same approach.

Push-Location k8s
kustomize edit set image auth-service="$Registry/auth-service:$Version"
kustomize edit set image product-service="$Registry/product-service:$Version"
kustomize edit set image order-service="$Registry/order-service:$Version"
Pop-Location

kubectl apply -k k8s
kubectl rollout status deployment/auth-service -n ecommerce --timeout=180s
kubectl rollout status deployment/product-service -n ecommerce --timeout=180s
kubectl rollout status deployment/order-service -n ecommerce --timeout=180s
kubectl get pods,svc,hpa,ingress -n ecommerce
```

For a disposable local cluster only, apply `kubectl apply -f k8s/01-secrets.yaml` before `kubectl apply -k k8s`. Do not apply that file to production: it contains example credentials. Use AWS Secrets Manager with External Secrets Operator, or create the Kubernetes Secrets from a CI/CD secret store. Replace the placeholder hostnames in `k8s/08-ingress.yaml` and configure TLS before exposing the API.

---

## 📐 Architecture Overview

```
Internet
    │
    ▼
[AWS Route 53] ─── DNS
    │
    ▼
[AWS ALB] ─── Load Balancer (created by NGINX Ingress)
    │
    ▼
[EKS Cluster — namespace: ecommerce]
    │
    ├── auth-service   (min 2, max 8 pods)  ← HPA
    ├── product-service (min 3, max 10 pods) ← HPA
    ├── order-service  (min 1, max 8 pods)  ← HPA
    │
    ├── auth-db     (StatefulSet + EBS PVC)
    ├── product-db  (StatefulSet + EBS PVC)
    ├── order-db    (StatefulSet + EBS PVC)
    │
    ├── redis       (Deployment + EBS PVC)
    └── kafka       (StatefulSet + EBS PVC)
```

---

## 🔄 Scaling Logic (কিভাবে কাজ করে)

| Service | Min Pods | Max Pods | Scale Trigger | Over-limit Behavior |
|---------|----------|----------|---------------|---------------------|
| auth-service | 2 | **8** | CPU > 70% | Request queue (60s timeout) |
| product-service | 3 | **10** | CPU > 70% | Request queue (60s timeout) |
| order-service | 1 | **8** | CPU > 70% | Request queue (60s timeout) |

**Over-limit হলে কী হয়:**
1. HPA নতুন pod spawn করে (60s stabilization window)
2. NGINX Ingress rate limit hit হলে → `429 Too Many Requests`
3. Client 429 পেয়ে exponential backoff দিয়ে retry করে → **effective "wait"**
4. `proxy-read-timeout: 120s` — 2 মিনিট পর্যন্ত connection hold করে

---

## 🏗️ Step-by-Step AWS Deployment

### Step 1: Prerequisites Install করুন

```powershell
# AWS CLI
winget install Amazon.AWSCLI

# kubectl
winget install Kubernetes.kubectl

# eksctl
winget install eksctl

# Helm
winget install Helm.Helm
```

### Step 2: AWS ECR — Docker Images Push করুন

```powershell
# AWS login
aws configure
# AWS Access Key ID: [your key]
# AWS Secret Access Key: [your secret]
# Default region: ap-southeast-1  (Singapore — বাংলাদেশের কাছে)

# ECR login
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$REGION = "ap-southeast-1"

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# ECR repository তৈরি করুন
aws ecr create-repository --repository-name auth-service --region $REGION
aws ecr create-repository --repository-name product-service --region $REGION
aws ecr create-repository --repository-name order-service --region $REGION

# Project root থেকে build + push করুন
cd C:\Users\Zihad.DESKTOP-GMMJT8N\Desktop\Project\Ecommarce-Microservice

# Auth Service
docker build -t auth-service ./auth-service
docker tag auth-service:latest "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/auth-service:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/auth-service:latest"

# Product Service
docker build -t product-service ./product-service
docker tag product-service:latest "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/product-service:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/product-service:latest"

# Order Service
docker build -t order-service ./order-service
docker tag order-service:latest "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/order-service:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/order-service:latest"
```

### Step 3: EKS Cluster তৈরি করুন

```powershell
# EKS cluster create (15-20 মিনিট লাগবে)
eksctl create cluster `
  --name ecommerce-cluster `
  --region ap-southeast-1 `
  --nodegroup-name standard-workers `
  --node-type t3.medium `
  --nodes 3 `
  --nodes-min 2 `
  --nodes-max 10 `
  --managed

# kubeconfig update
aws eks update-kubeconfig --region ap-southeast-1 --name ecommerce-cluster

# verify
kubectl get nodes
```

### Step 4: Metrics Server Install করুন (HPA-র জন্য দরকার)

```powershell
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify
kubectl get deployment metrics-server -n kube-system
```

### Step 5: NGINX Ingress Controller Install করুন

```powershell
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx `
  --namespace ingress-nginx `
  --create-namespace `
  --set controller.service.type=LoadBalancer `
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"=nlb

# External IP পান
kubectl get svc -n ingress-nginx
```

### Step 6: K8s Manifests Deploy করুন (Order matters!)

```powershell
cd C:\Users\Zihad.DESKTOP-GMMJT8N\Desktop\Project\Ecommarce-Microservice\k8s

# ── আগে এই file গুলোতে YOUR_AWS_ACCOUNT_ID replace করুন ──
# k8s\05-auth-service.yaml
# k8s\06-product-service.yaml
# k8s\07-order-service.yaml

# Replace করুন (PowerShell)
$AccountId = aws sts get-caller-identity --query Account --output text
$Region = "ap-southeast-1"
$OldText = "YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com"
$NewText = "$AccountId.dkr.ecr.$Region.amazonaws.com"

(Get-Content .\05-auth-service.yaml) -replace $OldText, $NewText | Set-Content .\05-auth-service.yaml
(Get-Content .\06-product-service.yaml) -replace $OldText, $NewText | Set-Content .\06-product-service.yaml
(Get-Content .\07-order-service.yaml) -replace $OldText, $NewText | Set-Content .\07-order-service.yaml

# Deploy করুন (ORDER IMPORTANT!)
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-secrets.yaml
kubectl apply -f 02-redis.yaml
kubectl apply -f 03-kafka.yaml
kubectl apply -f 04-databases.yaml

# Database ready হওয়া পর্যন্ত wait করুন
kubectl wait --for=condition=ready pod -l app=auth-db -n ecommerce --timeout=120s
kubectl wait --for=condition=ready pod -l app=product-db -n ecommerce --timeout=120s
kubectl wait --for=condition=ready pod -l app=order-db -n ecommerce --timeout=120s

# Kafka ready হওয়া পর্যন্ত wait করুন
kubectl wait --for=condition=ready pod -l app=kafka -n ecommerce --timeout=180s

# Services deploy করুন
kubectl apply -f 05-auth-service.yaml
kubectl wait --for=condition=ready pod -l app=auth-service -n ecommerce --timeout=120s

kubectl apply -f 06-product-service.yaml
kubectl apply -f 07-order-service.yaml
kubectl apply -f 08-ingress.yaml
```

### Step 7: Verify করুন

```powershell
# সব pods দেখুন
kubectl get pods -n ecommerce

# HPA status দেখুন
kubectl get hpa -n ecommerce

# Services দেখুন
kubectl get svc -n ecommerce

# Ingress দেখুন
kubectl get ingress -n ecommerce
```

---

## 📊 HPA কিভাবে কাজ করে — Visual

```
Request আসলো
     │
     ▼
[NGINX Ingress] ── rate limit check ──► 429 if exceeded (client retries → "wait")
     │
     ▼
[Service (ClusterIP)] ── load balance across pods
     │
     ├── Pod 1 (always running)
     ├── Pod 2 (always running)
     └── Pod N (HPA creates when CPU > 70%)
          │
          ▼
     [HPA watches CPU metrics every 15s]
          │
     CPU > 70%? ── YES ──► spawn new pod (max limit পর্যন্ত)
          │
     Max limit hit? ──► request queue করে (timeout পর্যন্ত wait)
```

---

## 🔧 Production Checklist

### ✅ Security
- [ ] `01-secrets.yaml` এর passwords পরিবর্তন করুন
- [ ] AWS Secrets Manager ব্যবহার করুন (secrets.yaml এর বদলে)
- [ ] JWT_SECRET 256-bit random key দিন
- [ ] Network Policy add করুন (pod-to-pod traffic restrict)
- [ ] TLS/HTTPS enable করুন (cert-manager দিয়ে)

### ✅ Production-grade Infra (Recommended Upgrades)
| Current (K8s) | Production Upgrade |
|---------------|-------------------|
| PostgreSQL StatefulSet | **AWS RDS PostgreSQL** (Multi-AZ) |
| Redis Deployment | **AWS ElastiCache Redis** |
| Kafka StatefulSet | **AWS MSK** (Managed Kafka) |

### ✅ Monitoring
```powershell
# Prometheus + Grafana install করুন
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack `
  --namespace monitoring --create-namespace
```

### ✅ Useful Commands

```powershell
# HPA scale history দেখুন
kubectl describe hpa auth-service-hpa -n ecommerce

# Real-time pod metrics
kubectl top pods -n ecommerce

# Service logs দেখুন
kubectl logs -f deployment/auth-service -n ecommerce

# Force scale করুন (test করতে)
kubectl scale deployment auth-service --replicas=4 -n ecommerce

# HPA watch করুন (real-time)
kubectl get hpa -n ecommerce -w
```

---

## 💡 "Over-limit হলে Wait" — কিভাবে Implement হয়েছে

**3-layer protection:**

1. **HPA Layer** — CPU 70% হলে নতুন pod আসে (max পর্যন্ত)
2. **NGINX Rate Limit Layer** — Max pod capacity ছাড়িয়ে গেলে `429` return করে
3. **Client Wait** — Client `proxy-read-timeout: 120s` পর্যন্ত connection hold করে, নতুন pod ready হলে request serve হয়

> **True queue-based waiting** চাইলে `nginx.ingress.kubernetes.io/limit-req-status-code: "429"` + client-side retry library (e.g., `axios-retry`) ব্যবহার করুন।

---

## 📁 File Structure

```
k8s/
├── 00-namespace.yaml          # ecommerce namespace
├── 01-secrets.yaml            # সব services এর secrets
├── 02-redis.yaml              # Redis cache
├── 03-kafka.yaml              # Kafka message broker
├── 04-databases.yaml          # 3x PostgreSQL StatefulSets
├── 05-auth-service.yaml       # Auth: min 2, max 8 pods + HPA
├── 06-product-service.yaml    # Product: min 3, max 10 pods + HPA
├── 07-order-service.yaml      # Order: min 1, max 8 pods + HPA
├── 08-ingress.yaml            # NGINX Ingress + rate limiting
└── 09-cluster-autoscaler.yaml # AWS node-level auto scaling
```

---

*Generated for: Ecommerce Microservice — AWS EKS Production Deployment*
