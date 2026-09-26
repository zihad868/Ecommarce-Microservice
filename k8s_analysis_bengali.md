# 🚀 Kubernetes (K8s) সম্পূর্ণ গাইড — বাংলায়
## আপনার Ecommerce Microservice প্রজেক্টের জন্য বিস্তারিত বিশ্লেষণ

---

## 📚 Part 1: Kubernetes কী এবং কেন দরকার?

### Docker vs Kubernetes — পার্থক্য কী?

| বিষয় | Docker Compose | Kubernetes (K8s) |
|-------|---------------|-----------------|
| কোথায় চলে? | একটি মাত্র machine | হাজারো machine-এ |
| Auto scaling | ❌ নেই | ✅ আছে (HPA/VPA) |
| Self-healing | ❌ নেই | ✅ আছে (crash হলে নিজে restart) |
| Load balancing | সীমিত | ✅ Built-in |
| Production ready | ❌ | ✅ |
| Rolling update | ❌ | ✅ Zero downtime |

> Docker Compose হলো আপনার **laptop-এর জন্য**, Kubernetes হলো **production server-এর জন্য**।

---

## 📦 Part 2: K8s এর মূল Concepts (আপনার প্রজেক্টের context-এ)

### 1. **Pod** — সবচেয়ে ছোট unit
```
Pod = একটি বা একাধিক Container এর wrapper
আপনার auth-service container → auth-service Pod এর ভেতরে চলে
```

### 2. **Deployment** — Pod গুলো manage করে
```
Deployment বলে: "auth-service এর 2টা pod সবসময় চালু রাখো"
কোনো pod crash করলে → Deployment নতুন pod তৈরি করে
```

### 3. **Service** — Pod গুলোর সামনে একটি stable address
```
Pod এর IP বদলায় (restart হলে) → Service এর IP বদলায় না
product-service → auth-service কে খুঁজে পায় "auth-service:50051" দিয়ে
```

### 4. **Namespace** — logical isolation
```
ecommerce namespace → আপনার সব resources এখানে
kube-system namespace → K8s এর নিজের resources
```

### 5. **StatefulSet** — Database এর জন্য
```
Deployment: stateless (যেকোনো pod একই)
StatefulSet: stateful (প্রতিটা pod-এর unique identity আছে)
PostgreSQL, Kafka, Redis → StatefulSet ব্যবহার করা হয়
```

### 6. **PersistentVolumeClaim (PVC)** — ডেটা রাখার জায়গা
```
Database এর data pod restart হলেও মুছে যায় না
PVC → AWS EBS disk-এর মতো
```

### 7. **Secret** — Password/API key secure রাখা
```
Database password plain text রাখা বিপজ্জনক
Secret → encrypted হয়ে K8s-এ store হয়
```

### 8. **Ingress** — বাইরে থেকে traffic আসার দরজা
```
Internet → Ingress (NGINX) → auth-service / product-service / order-service
```

### 9. **HPA (Horizontal Pod Autoscaler)** — Auto scaling
```
CPU > 70% হলে → নতুন pod তৈরি (scale up)
CPU < 30% হলে → pod কমায় (scale down)
```

### 10. **ConfigMap** — Non-sensitive configuration
```
Port number, feature flags → ConfigMap-এ রাখুন
Password, API keys → Secret-এ রাখুন
```

---

## 🔍 Part 3: আপনার বর্তমান K8s ফাইলগুলোর বিশ্লেষণ

### ✅ যা ভালো আছে:
1. **Namespace** ব্যবহার করা হয়েছে (`ecommerce`) — ভালো isolation
2. **StatefulSet** দিয়ে Database এবং Kafka চালানো হচ্ছে — সঠিক
3. **HPA** (Horizontal Pod Autoscaler) আছে — auto scaling হবে
4. **PodDisruptionBudget** আছে — rolling update safe
5. **Init Container** দিয়ে DB migration — সঠিক approach
6. **Pod Anti-Affinity** আছে — pods আলাদা node-এ যাবে
7. **Liveness + Readiness + Startup Probe** তিনটাই আছে — production-grade
8. **Kustomization** দিয়ে image management — CI/CD friendly

### ❌ যা ঠিক করতে হবে (Critical Issues):

#### 🔴 Issue 1: Secrets ফাইলে Plain Text Password!
```yaml
# বর্তমান (বিপজ্জনক!)
stringData:
  POSTGRES_PASSWORD: "auth_password"  # ← git-এ push হলে সবাই দেখবে!

# সঠিক উপায় → base64 encode করুন অথবা External Secrets ব্যবহার করুন
```

#### 🔴 Issue 2: Secrets ফাইল `01-secrets.yaml` kustomization-এ নেই!
```yaml
# kustomization.yaml-এ 01-secrets.yaml missing!
resources:
  - 00-namespace.yaml
  # ← 01-secrets.yaml নেই! Deploy করলে secrets পাবে না!
```

#### 🔴 Issue 3: initContainer-এ `npx prisma db push` প্রতিটি pod restart-এ চলে
```yaml
# বর্তমান — প্রতিটি pod start হলে db push চলে (3 replicas = 3 বার!)
initContainers:
  - command: ["sh", "-c", "npx prisma db push"]

# সঠিক — আলাদা Job দিয়ে একবারই migration করুন
```

#### 🟡 Issue 4: `imagePullPolicy: IfNotPresent` production-এ ঠিক নয়
```yaml
# বর্তমান
imagePullPolicy: IfNotPresent  # ← পুরনো image চলতে পারে!

# Production-এ সঠিক
imagePullPolicy: Always  # ← সবসময় latest image pull করবে
```

#### 🟡 Issue 5: SecurityContext নেই
```yaml
# বর্তমানে নেই — Security risk!
# যোগ করতে হবে:
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
```

#### 🟡 Issue 6: ConfigMap নেই — Port, timeout এই config গুলো hardcoded
```yaml
# Port values hardcoded আছে yaml-এ
# এগুলো ConfigMap-এ রাখলে manage করা সহজ হয়
```

#### 🟡 Issue 7: NetworkPolicy নেই — সব pod সব pod-এর সাথে কথা বলতে পারে
```yaml
# Security best practice: শুধু দরকারি connection allow করুন
# order-service → শুধু order-db, kafka, auth-service-এর সাথে কথা বলতে পারবে
```

#### 🟡 Issue 8: Redis Deployment হওয়া উচিত StatefulSet
```yaml
# বর্তমান: Redis একটি Deployment
# সমস্যা: Deployment restart হলে PVC detach/reattach issue হতে পারে
# সঠিক: StatefulSet ব্যবহার করুন (Kafka, DB-র মতো)
```

#### 🟡 Issue 9: Ingress-এ SSL/TLS disabled
```yaml
# বর্তমানে comment করা আছে
# Production-এ HTTPS অবশ্যই দরকার!
```

#### 🟡 Issue 10: `09-cluster-autoscaler.yaml` kustomization-এ নেই
```yaml
# cluster-autoscaler separately apply করতে হবে
# Documentation করা উচিত
```

---

## 🏗️ Part 4: Industry Standard K8s Architecture

```
Internet
    ↓
[AWS ALB / Load Balancer]
    ↓
[NGINX Ingress Controller]  ← rate limiting, SSL termination
    ↓         ↓         ↓
[auth-svc] [product-svc] [order-svc]  ← Deployments (HPA controlled)
    ↓             ↓           ↓
[auth-db]   [product-db]  [order-db]  ← StatefulSets
    ↓             ↓           ↓
[               Redis Cache              ]  ← StatefulSet
[               Kafka Broker             ]  ← StatefulSet
```

---

## 📋 Part 5: ঠিক করা ফাইলগুলোতে যা যোগ করা হয়েছে

### নতুন ফাইল যোগ:
- `10-configmap.yaml` — Non-sensitive config আলাদা করা হয়েছে
- `11-network-policy.yaml` — Security: শুধু allowed traffic
- `12-db-migration-job.yaml` — DB migration একবার চালানোর Job

### পরিবর্তিত ফাইল:
- `01-secrets.yaml` — Base64 encoding নির্দেশনা যোগ
- `02-redis.yaml` — Deployment → StatefulSet
- `kustomization.yaml` — secrets.yaml যোগ, নতুন ফাইল যোগ
- সব service yaml → SecurityContext, imagePullPolicy ঠিক করা
- `08-ingress.yaml` — SSL/TLS enable করা, `ingressClassName` ব্যবহার

---

## 🎯 Part 6: K8s Deploy করার সঠিক ধাপ

```bash
# Step 1: Namespace তৈরি করুন
kubectl apply -f k8s/00-namespace.yaml

# Step 2: Secrets তৈরি করুন (আগে অবশ্যই)
kubectl apply -f k8s/01-secrets.yaml

# Step 3: ConfigMap তৈরি করুন
kubectl apply -f k8s/10-configmap.yaml

# Step 4: Infrastructure (DB, Redis, Kafka)
kubectl apply -f k8s/02-redis.yaml
kubectl apply -f k8s/03-kafka.yaml
kubectl apply -f k8s/04-databases.yaml

# Step 5: DB Migration Job চালান
kubectl apply -f k8s/12-db-migration-job.yaml
kubectl wait --for=condition=complete job/db-migration -n ecommerce --timeout=120s

# Step 6: Application Services
kubectl apply -f k8s/05-auth-service.yaml
kubectl apply -f k8s/06-product-service.yaml
kubectl apply -f k8s/07-order-service.yaml

# Step 7: Network Policy
kubectl apply -f k8s/11-network-policy.yaml

# Step 8: Ingress
kubectl apply -f k8s/08-ingress.yaml

# অথবা সব একসাথে Kustomize দিয়ে:
kubectl apply -k k8s/
```

---

## 🔐 Part 7: Production Security Checklist

- [ ] Secrets গুলো base64 encode করুন (git-এ plain text রাখবেন না!)
- [ ] AWS Secrets Manager বা HashiCorp Vault ব্যবহার করুন
- [ ] NetworkPolicy দিয়ে traffic restrict করুন
- [ ] SecurityContext দিয়ে non-root user-এ চালান
- [ ] HTTPS/TLS enable করুন (cert-manager দিয়ে)
- [ ] Resource limits সেট করুন (সব container-এ)
- [ ] Image scanning করুন (Trivy/Snyk)
- [ ] RBAC configure করুন

---

## 💡 Part 8: গুরুত্বপূর্ণ K8s Commands

```bash
# সব resources দেখুন
kubectl get all -n ecommerce

# Pod এর logs দেখুন
kubectl logs -f pod/auth-service-xxx -n ecommerce

# Pod-এ ঢুকুন (debug)
kubectl exec -it pod/auth-service-xxx -n ecommerce -- sh

# HPA status দেখুন
kubectl get hpa -n ecommerce

# Events দেখুন (সমস্যা হলে)
kubectl get events -n ecommerce --sort-by='.lastTimestamp'

# Resource usage দেখুন
kubectl top pods -n ecommerce
kubectl top nodes
```
