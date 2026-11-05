# 🚀 Kubernetes (K8s) — সম্পূর্ণ বাংলা গাইড
### আপনার Ecommerce Microservice প্রজেক্টের k8s ফোল্ডার বিস্তারিত ব্যাখ্যা

---

## 🧠 প্রথমে জানি — Kubernetes কী?

**Kubernetes (K8s)** হলো একটি **Container Orchestration** সিস্টেম।

**সহজ উদাহরণ:**
- ধরুন আপনার কাছে ১০টি Docker Container আছে।
- এগুলো চালানো, restart করা, scale করা — সব ম্যানুয়ালি করলে অনেক ঝামেলা।
- Kubernetes এই সব কাজ **automatically** করে দেয়।

```
Docker = একটা Container চালায়
Docker Compose = একাধিক Container একসাথে চালায় (শুধু এক machine-এ)
Kubernetes = একাধিক Container, একাধিক machine-এ, automatically manage করে
```

---

## 📁 আপনার k8s ফোল্ডারের ফাইলগুলো

মোট **14টি ফাইল** আছে। নম্বর দিয়ে সাজানো কারণ এই ক্রমে apply করতে হয়:

```
00-namespace.yaml          ← প্রথমে
01-secrets.yaml            ← পাসওয়ার্ড/sensitive data
02-redis.yaml              ← Cache server
03-kafka.yaml              ← Message broker
04-databases.yaml          ← PostgreSQL (3টি)
05-auth-service.yaml       ← Auth microservice
06-product-service.yaml    ← Product microservice
07-order-service.yaml      ← Order microservice
08-ingress.yaml            ← Internet থেকে access
09-cluster-autoscaler.yaml ← Auto node scaling
10-configmap.yaml          ← Config data
11-network-policy.yaml     ← Security rules
12-db-migration-job.yaml   ← Database migration
kustomization.yaml         ← সব একসাথে manage
```

---

## 🔑 K8s এর গুরুত্বপূর্ণ Concepts (আপনার প্রজেক্ট থেকে)

### 1️⃣ **Namespace** — আলাদা ঘর তৈরি

```yaml
# 00-namespace.yaml
kind: Namespace
metadata:
  name: ecommerce
```

**কী কাজ করে?**
একটা বাসার মধ্যে আলাদা আলাদা ঘরের মতো। `ecommerce` নামের একটা আলাদা জায়গা তৈরি হয়, যেখানে শুধু আপনার app-এর সব resource থাকবে।

> **উদাহরণ:** `kubectl get pods -n ecommerce` — শুধু ecommerce namespace-এর pods দেখাবে।

---

### 2️⃣ **Secret** — পাসওয়ার্ড লুকানোর জায়গা

```yaml
# 01-secrets.yaml
kind: Secret
type: Opaque
stringData:
  DATABASE_URL: "postgresql://auth_user:PASSWORD@auth-db-service:5432/auth_db"
  JWT_SECRET: "YOUR_SECRET_KEY"
```

**কী কাজ করে?**
পাসওয়ার্ড, API key, JWT token — এসব sensitive data Secret-এ রাখা হয়। Kubernetes এগুলো encrypted রাখে এবং pod-এ environment variable হিসেবে inject করে।

**আপনার প্রজেক্টে ৬টি Secret আছে:**
| Secret নাম | কার জন্য |
|---|---|
| `auth-service-secret` | Auth service এর DB URL, JWT key |
| `product-service-secret` | Product service এর DB URL, Kafka |
| `order-service-secret` | Order service এর DB URL, Kafka |
| `auth-db-secret` | Auth PostgreSQL এর password |
| `product-db-secret` | Product PostgreSQL এর password |
| `order-db-secret` | Order PostgreSQL এর password |

> ⚠️ **সতর্কতা:** এই ফাইল কখনো GitHub-এ push করবেন না!

---

### 3️⃣ **Pod** — সবচেয়ে ছোট unit

Pod হলো K8s এর সবচেয়ে ছোট unit। একটা Pod-এ এক বা একাধিক Docker Container চলে।

```
Pod = Docker Container এর wrapper
```

---

### 4️⃣ **Deployment vs StatefulSet** — দুই ধরনের app চালানো

আপনার প্রজেক্টে দুটো ধরন ব্যবহার হয়েছে:

#### **Deployment** (stateless apps — Services এর জন্য)
```yaml
# 05-auth-service.yaml
kind: Deployment
spec:
  replicas: 2  # ২টি copy চলবে
  strategy:
    type: RollingUpdate  # নতুন version deploy করার সময় zero downtime
```
- Auth Service, Product Service, Order Service → **Deployment**
- কারণ: এই services stateless (data নিজে রাখে না, DB-তে রাখে)
- যেকোনো সময় restart বা replace করা যায়

#### **StatefulSet** (stateful apps — Database/Redis/Kafka এর জন্য)
```yaml
# 02-redis.yaml, 03-kafka.yaml, 04-databases.yaml
kind: StatefulSet
spec:
  replicas: 1
```
- Redis, Kafka, PostgreSQL → **StatefulSet**
- কারণ: এদের **data আছে** (disk-এ data থাকে)
- একটা নির্দিষ্ট নাম পায় (`redis-0`, `kafka-0`)
- নির্দিষ্ট storage-এর সাথে বাঁধা থাকে

---

### 5️⃣ **Service** — Pod-এর সাথে communicate করার রাস্তা

Pod-এর IP address প্রতিবার restart-এ বদলায়। Service একটা **stable address** দেয়।

**আপনার প্রজেক্টে ৩ ধরনের Service:**

#### ClusterIP (সবচেয়ে বেশি ব্যবহার)
```yaml
type: ClusterIP
# শুধু Kubernetes cluster-এর ভেতর থেকে access করা যায়
```
- `redis-service:6379` → Redis-এ connect
- `kafka-service:9092` → Kafka-তে connect
- `auth-service:50051` → Auth gRPC-তে connect

#### Headless Service (StatefulSet এর জন্য)
```yaml
spec:
  clusterIP: None  # Headless!
```
- StatefulSet-এর প্রতিটা pod-এর আলাদা DNS দেয়
- `kafka-0.kafka-headless.ecommerce.svc.cluster.local`

---

### 6️⃣ **HPA (Horizontal Pod Autoscaler)** — Auto Scaling

```yaml
# 05-auth-service.yaml
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2   # সর্বনিম্ন ২টি pod
  maxReplicas: 8   # সর্বোচ্চ ৮টি pod
  metrics:
    - cpu: 70%     # CPU 70% হলে নতুন pod তৈরি
    - memory: 80%  # Memory 80% হলে নতুন pod তৈরি
```

**কীভাবে কাজ করে?**
```
Traffic কম  → 2 pods চলে
Traffic বাড়লে → CPU বাড়ে → HPA নতুন pod তৈরি করে → max 8 pods
Traffic কমলে → 5 মিনিট stable থাকলে → pods কমে
```

---

### 7️⃣ **Health Probes** — App সুস্থ আছে কিনা চেক

Auth Service-এ ৩ ধরনের probe:

```yaml
# startupProbe: App শুরু হচ্ছে — 75 সেকেন্ড সময় পাবে
startupProbe:
  httpGet:
    path: /health
    port: 3001
  failureThreshold: 15  # 15 × 5s = 75s

# livenessProbe: App জীবিত আছে? — fail হলে restart
livenessProbe:
  httpGet:
    path: /health
  failureThreshold: 3

# readinessProbe: App request নিতে পারবে? — fail হলে traffic বন্ধ
readinessProbe:
  httpGet:
    path: /health
  failureThreshold: 3
```

**Flow:**
```
App start → startupProbe pass → livenessProbe + readinessProbe শুরু
readinessProbe pass → Service traffic পাঠানো শুরু
livenessProbe fail → Pod restart
```

---

### 8️⃣ **Ingress** — Internet থেকে access

```yaml
# 08-ingress.yaml
kind: Ingress
spec:
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /api/auth     → auth-service:3001
          - path: /api/products → product-service:3002
          - path: /api/orders   → order-service:3003
```

**মানে:**
```
Internet → api.yourdomain.com/api/auth → auth-service pod
Internet → api.yourdomain.com/api/products → product-service pod
```

**Ingress-এ Security Features:**
- Rate Limiting: Auth তে 20 req/s, Product তে 300 req/s
- HTTPS enforce (HTTP → HTTPS redirect)
- CORS headers
- Security headers (XSS protection, etc.)

---

### 9️⃣ **NetworkPolicy** — Zero Trust Security

```yaml
# 11-network-policy.yaml
# প্রথমে সব block করো
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}   # সব pods
  policyTypes:
    - Ingress
    - Egress
```

তারপর শুধু যা দরকার allow করা হয়:

```
Auth Service পারবে:
  ✅ auth-db:5432 তে connect করতে
  ✅ redis:6379 তে connect করতে
  ❌ product-db তে connect করতে পারবে না
  ❌ order-db তে connect করতে পারবে না

Redis পারবে:
  ✅ tier=service label এর pods থেকে connection নিতে
  ❌ অন্য কেউ connect করতে পারবে না
```

---

### 🔟 **Job** — একবার চলার কাজ

```yaml
# 12-db-migration-job.yaml
kind: Job
spec:
  backoffLimit: 3           # fail হলে 3 বার retry
  activeDeadlineSeconds: 300 # 5 মিনিটের বেশি না
  template:
    spec:
      restartPolicy: Never
      containers:
        - command:
            - npx prisma db push  # Database migration
```

**কেন আলাদা Job?**
- Deployment-এ `initContainer` দিলে প্রতি pod restart-এ migration চলে (3 replicas = 3 বার!)
- Job একবারই চলে, complete হলে শেষ

---

### 1️⃣1️⃣ **PersistentVolume (PVC)** — Data রাখার জায়গা

```yaml
# StatefulSet এর volumeClaimTemplates
volumeClaimTemplates:
  - spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp2      # AWS EBS disk
      resources:
        requests:
          storage: 10Gi          # 10GB disk
```

**কীভাবে কাজ করে:**
```
StatefulSet → PVC create করে → AWS EBS disk attach হয় → Pod data রাখে
Pod restart হলেও data থাকে (disk-এ আছে)
```

---

### 1️⃣2️⃣ **Resource Requests & Limits** — CPU/Memory control

```yaml
resources:
  requests:
    memory: "256Mi"   # K8s এই pod-এর জন্য 256MB reserve রাখবে
    cpu: "200m"       # 200 millicores = 0.2 CPU core
  limits:
    memory: "512Mi"   # এর বেশি নিলে OOMKilled হবে
    cpu: "500m"       # এর বেশি use করতে পারবে না
```

**CPU unit:**
```
1000m = 1 CPU core
200m  = 0.2 CPU core (20%)
```

---

### 1️⃣3️⃣ **PodDisruptionBudget (PDB)** — Maintenance এ minimum uptime

```yaml
kind: PodDisruptionBudget
spec:
  minAvailable: 1   # যেকোনো সময় minimum 1 pod চলতে হবে
  selector:
    matchLabels:
      app: auth-service
```

Node maintenance বা rolling update-এর সময়ও কমপক্ষে ১টি pod চলবে।

---

## 🏗️ আপনার পুরো Architecture

```
Internet
    ↓
Ingress (NGINX)
    ↓ /api/auth        ↓ /api/products    ↓ /api/orders
Auth Service (2-8 pods) Product Service  Order Service
    ↓                      ↓                   ↓
auth-db (PG)         product-db (PG)     order-db (PG)
    ↓                      ↓                   ↓
              Redis (Cache) ←→ All Services
                    ↕
              Kafka (Events)
```

---

## 📋 কোন ফাইলে কী Resource আছে?

| ফাইল | Kind | উদ্দেশ্য |
|------|------|---------|
| `00-namespace.yaml` | Namespace | `ecommerce` namespace তৈরি |
| `01-secrets.yaml` | Secret (×6) | Passwords, JWT, DB URLs |
| `02-redis.yaml` | StatefulSet + Service×2 | Cache server |
| `03-kafka.yaml` | StatefulSet + Service×2 | Message broker |
| `04-databases.yaml` | StatefulSet×3 + Service×6 | 3 PostgreSQL DB |
| `05-auth-service.yaml` | Deployment + Service + HPA + PDB | Auth microservice |
| `06-product-service.yaml` | Deployment + Service + HPA + PDB | Product microservice |
| `07-order-service.yaml` | Deployment + Service + HPA + PDB | Order microservice |
| `08-ingress.yaml` | Ingress (×4) | HTTP routing + TLS |
| `09-cluster-autoscaler.yaml` | ServiceAccount + ClusterRole | Node auto-scaling |
| `10-configmap.yaml` | ConfigMap | Non-sensitive config |
| `11-network-policy.yaml` | NetworkPolicy (×8) | Zero trust security |
| `12-db-migration-job.yaml` | Job (×3) | Prisma DB migration |
| `kustomization.yaml` | Kustomization | সব একসাথে manage |

---

## ⚡ Deploy করার ক্রম

```bash
# ১. Namespace তৈরি
kubectl apply -f k8s/00-namespace.yaml

# ২. Secrets
kubectl apply -f k8s/01-secrets.yaml

# ৩. ConfigMap
kubectl apply -f k8s/10-configmap.yaml

# ৪. Infrastructure (Redis, Kafka, DB)
kubectl apply -f k8s/02-redis.yaml
kubectl apply -f k8s/03-kafka.yaml
kubectl apply -f k8s/04-databases.yaml

# ৫. DB Migration (DB ready হওয়ার পরে)
kubectl apply -f k8s/12-db-migration-job.yaml
kubectl wait --for=condition=complete job/auth-db-migration -n ecommerce --timeout=300s

# ৬. Services deploy
kubectl apply -f k8s/05-auth-service.yaml
kubectl apply -f k8s/06-product-service.yaml
kubectl apply -f k8s/07-order-service.yaml

# ৭. Ingress + Network Policy
kubectl apply -f k8s/08-ingress.yaml
kubectl apply -f k8s/11-network-policy.yaml

# অথবা সব একসাথে (kustomize দিয়ে):
kubectl apply -k k8s/
```

---

## 🔍 কিছু দরকারী kubectl Commands

```bash
# সব pods দেখুন
kubectl get pods -n ecommerce

# Logs দেখুন
kubectl logs -f deployment/auth-service -n ecommerce

# Pod-এর ভেতরে যান
kubectl exec -it <pod-name> -n ecommerce -- sh

# HPA status দেখুন
kubectl get hpa -n ecommerce

# Events দেখুন (debugging)
kubectl get events -n ecommerce --sort-by=.lastTimestamp

# Resource usage দেখুন
kubectl top pods -n ecommerce
```

---

## 💡 সারসংক্ষেপ

আপনার প্রজেক্টের K8s setup খুবই **production-ready**:

- ✅ **High Availability** → HPA দিয়ে 2-8 pods auto-scale
- ✅ **Zero Downtime Deploy** → RollingUpdate strategy
- ✅ **Data Persistence** → PVC দিয়ে data সংরক্ষণ
- ✅ **Security** → NetworkPolicy, Secrets, non-root containers
- ✅ **Health Monitoring** → 3 ধরনের probe
- ✅ **Graceful Shutdown** → terminationGracePeriodSeconds
- ✅ **DB Migration** → আলাদা Job
