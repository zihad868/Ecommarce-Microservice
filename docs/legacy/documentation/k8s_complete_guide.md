# 🚀 Kubernetes (K8s) Complete Guide — Ecommerce Microservice

> **সহজ ভাষায়**: Kubernetes হলো একটি "ম্যানেজার" যে আপনার Docker containers গুলো চালায়, পড়লে তুলে দেয়, বেশি load হলে নতুন copy তৈরি করে।

---

## 📋 প্রথমে বুঝি: K8s YAML-এর মূল Structure

প্রতিটি K8s ফাইলে ৪টি মূল section থাকে:

```yaml
apiVersion: ???   # K8s API version — কোন API দিয়ে এটা বানানো
kind: ???         # Resource type — কী বানাচ্ছি (Namespace/Deployment/Service...)
metadata:         # Resource-এর পরিচয় — নাম, labels, annotations
  name: ???
spec:             # Resource-এর details — কীভাবে কাজ করবে
  ???
```

### `apiVersion` কেন?
Kubernetes-এর অনেক API group আছে। প্রতিটি resource তার নিজস্ব API-তে থাকে:

| apiVersion | মানে কী |
|---|---|
| `v1` | Core API (Namespace, Service, Secret, ConfigMap, Pod) |
| `apps/v1` | Apps group (Deployment, StatefulSet) |
| `networking.k8s.io/v1` | Networking group (Ingress, NetworkPolicy) |
| `autoscaling/v2` | Autoscaling group (HorizontalPodAutoscaler) |
| `policy/v1` | Policy group (PodDisruptionBudget) |
| `batch/v1` | Batch group (Job, CronJob) |

---

## 🗺️ Deployment Order — কোন ফাইল আগে চলে?

```
STEP 1:  00-namespace.yaml        ← বাড়ির জমি কিনলাম
STEP 2:  10-configmap.yaml        ← Non-secret config রাখলাম
STEP 3:  01-secrets.yaml          ← Password/Secret রাখলাম
STEP 4:  02-redis.yaml            ← Cache server চালু করলাম
STEP 5:  03-kafka.yaml            ← Message broker চালু করলাম
STEP 6:  04-databases.yaml        ← Database গুলো চালু করলাম
STEP 7:  12-db-migration-job.yaml ← Database tables তৈরি করলাম
STEP 8:  05-auth-service.yaml     ← Auth service চালু করলাম
STEP 9:  06-product-service.yaml  ← Product service চালু করলাম
STEP 10: 07-order-service.yaml    ← Order service চালু করলাম
STEP 11: 08-ingress.yaml          ← Internet থেকে access দিলাম
STEP 12: 11-network-policy.yaml   ← Security rules লাগালাম
STEP 13: 09-cluster-autoscaler.yaml ← Auto-scaling চালু করলাম
```

### এক command-এ সব deploy করতে:
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/10-configmap.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-redis.yaml
kubectl apply -f k8s/03-kafka.yaml
kubectl apply -f k8s/04-databases.yaml
kubectl apply -f k8s/12-db-migration-job.yaml
kubectl wait --for=condition=complete job/auth-db-migration -n ecommerce --timeout=300s
kubectl apply -f k8s/05-auth-service.yaml
kubectl apply -f k8s/06-product-service.yaml
kubectl apply -f k8s/07-order-service.yaml
kubectl apply -f k8s/08-ingress.yaml
kubectl apply -f k8s/11-network-policy.yaml
```

---

---

## 📁 FILE 00: `00-namespace.yaml` — বাড়ির জমি

```yaml
apiVersion: v1          # Core API ব্যবহার হচ্ছে (Namespace Core API-তে আছে)
kind: Namespace         # আমরা একটা Namespace বানাচ্ছি
metadata:
  name: ecommerce       # Namespace-এর নাম "ecommerce"
  labels:
    name: ecommerce
    environment: production
    istio-injection: disabled
  annotations:
    meta.helm.sh/release-name: ecommerce-microservice
    description: "Ecommerce Microservice Platform - Production"
```

### Namespace কী?
> বাস্তব জীবনের উদাহরণ: একটি বড় অফিসে আলাদা আলাদা department আছে — HR, Finance, IT। Kubernetes-এ **Namespace** হলো সেই department।

- সব resource (`ecommerce` namespace-এ) এক জায়গায় থাকে
- অন্য project-এর resources আলাদা থাকে — conflict নেই
- `kubectl get pods -n ecommerce` → শুধু ecommerce-এর pods দেখা যাবে

### `labels` কেন?
Labels হলো **sticky notes** — পরে এই label দিয়ে filter করা যায়:
```bash
kubectl get all -l environment=production
```

### `annotations` কেন?
Annotations হলো **বিস্তারিত notes** — machine-readable metadata:
- `meta.helm.sh/release-name`: Helm দিয়ে deploy করলে এটা track করে
- `description`: মানুষের জন্য description

---

## 📁 FILE 10: `10-configmap.yaml` — Non-Secret Config

> **কেন আগে?** Services-গুলো start হওয়ার আগে তাদের config দরকার।

```yaml
apiVersion: v1
kind: ConfigMap      # Password-ছাড়া config এখানে রাখো
metadata:
  name: app-config
  namespace: ecommerce
data:
  AUTH_SERVICE_PORT: "3001"
  KAFKA_BROKER: "kafka-service.ecommerce.svc.cluster.local:9092"
  REDIS_HOST: "redis-service.ecommerce.svc.cluster.local"
```

### ConfigMap vs Secret পার্থক্য:

| ConfigMap | Secret |
|---|---|
| Port numbers | Database passwords |
| Log level | JWT secret keys |
| Feature flags | API keys |
| Service URLs | Certificates |
| **Plain text** | **Base64 encoded** |

### Internal DNS কীভাবে কাজ করে?
```
kafka-service.ecommerce.svc.cluster.local:9092
│              │          │               │
Service name   Namespace  K8s suffix      Port
```
এটা দিয়ে cluster-এর ভেতরে services একে অপরকে খুঁজে পায়।

---

## 📁 FILE 01: `01-secrets.yaml` — Passwords & Sensitive Data

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-service-secret
  namespace: ecommerce
  labels:
    app: auth-service
    tier: secret
  annotations:
    secret/last-rotated: "2024-01-01"   # কবে password বদলানো হয়েছিল
    secret/managed-by: "manual"
type: Opaque    # Generic secret type (custom key-value)
stringData:     # K8s নিজেই base64 করে নেয়
  DATABASE_URL: "postgresql://auth_user:PASSWORD@auth-db-service:5432/auth_db"
  JWT_SECRET: "STRONG_SECRET_KEY"
  REDIS_HOST: "redis-service"
```

### `type: Opaque` কেন?
K8s-এ অনেক secret type আছে:

| type | ব্যবহার |
|---|---|
| `Opaque` | যেকোনো custom secret (আমরা এটা ব্যবহার করছি) |
| `kubernetes.io/tls` | TLS certificates |
| `kubernetes.io/dockerconfigjson` | Docker registry password |
| `kubernetes.io/ssh-auth` | SSH keys |

### `stringData` vs `data`:
- `stringData`: সরাসরি plain text লিখো, K8s নিজেই encode করবে (**development-এ সুবিধাজনক**)
- `data`: নিজে `base64` encode করে লিখো (**production-এ recommended**)

### ৬টি Secret কেন?
প্রতিটি service ও database-এর আলাদা secret — **Least Privilege Principle**:
- `auth-service-secret` → শুধু auth service পাবে
- `product-service-secret` → শুধু product service পাবে
- `auth-db-secret` → শুধু auth database পাবে
- (এবং product, order-এর জন্যও)

---

## 📁 FILE 02: `02-redis.yaml` — Cache Server

### Redis কী?
> বাস্তব উদাহরণ: বারবার একই calculation করার বদলে উত্তর একটা notebook-এ লিখে রাখো। পরেরবার notebook দেখো — এটাই **Cache**।

এই ফাইলে **৩টি resource** আছে:

### 1️⃣ StatefulSet (Redis Pod)

```yaml
apiVersion: apps/v1
kind: StatefulSet    # Deployment-এর মতো, কিন্তু stable storage আছে
metadata:
  name: redis
  namespace: ecommerce
spec:
  serviceName: redis-headless   # Headless service-এর সাথে link
  replicas: 1                   # ১টি Redis instance
  selector:
    matchLabels:
      app: redis                # এই label-এর pods manage করবে
  template:
    spec:
      securityContext:
        runAsNonRoot: true      # Root user-এ চলবে না (security!)
        runAsUser: 999          # Redis-এর user ID
      containers:
        - name: redis
          image: redis:7-alpine # Redis v7, Alpine Linux (ছোট image)
          command:
            - redis-server
            - /etc/redis/redis.conf    # ConfigMap থেকে config load
          resources:
            requests:
              memory: "128Mi"   # Kubernetes এটুকু guarantee করবে
              cpu: "100m"       # 100 millicores = 0.1 CPU core
            limits:
              memory: "600Mi"   # এর বেশি নিলে kill করবে
              cpu: "300m"
```

### Deployment vs StatefulSet পার্থক্য:

| Deployment | StatefulSet |
|---|---|
| Stateless apps | Stateful apps (DB, Cache) |
| Random pod names: `redis-abc123` | Stable pod names: `redis-0`, `redis-1` |
| Storage attach নিশ্চিত না | Stable storage binding |
| আমাদের services এটা | Redis/Kafka/Postgres এটা |

### Resource `requests` vs `limits`:

```
requests = "আমাকে অন্তত এটুকু দাও"  → Kubernetes guarantee করে
limits   = "এর বেশি নেবো না"        → বেশি নিলে killed/throttled
```

### Health Probes — Pod জীবিত আছে কিনা চেক:

```yaml
livenessProbe:    # জীবিত? না হলে → RESTART
  exec:
    command: [redis-cli, ping]
  initialDelaySeconds: 15   # শুরুর ১৫s পরে check শুরু
  periodSeconds: 10         # প্রতি ১০s-এ check
  failureThreshold: 3       # ৩ বার fail হলে restart

readinessProbe:   # Traffic নেওয়ার জন্য ready? না হলে → NO TRAFFIC
  exec:
    command: [redis-cli, ping]
  initialDelaySeconds: 5

startupProbe:     # App start হতে কতক্ষণ লাগে? এটা pass না করলে liveness চলে না
  exec:
    command: [redis-cli, ping]
  failureThreshold: 10      # 30s (10×3s) startup window
```

### PVC (Persistent Volume Claim):
```yaml
volumeClaimTemplates:
  - spec:
      accessModes: ["ReadWriteOnce"]  # একটি node একসাথে read/write করতে পারবে
      storageClassName: gp2           # AWS EBS disk type
      resources:
        requests:
          storage: 5Gi                # ৫ GB disk চাই
```

### 2️⃣ Headless Service (`redis-headless`)
```yaml
kind: Service
spec:
  clusterIP: None   # Headless মানে কোনো IP নেই
```
StatefulSet-এর জন্য দরকার — প্রতিটি pod-এর direct DNS: `redis-0.redis-headless.ecommerce`

### 3️⃣ Regular Service (`redis-service`)
```yaml
kind: Service
spec:
  type: ClusterIP   # শুধু cluster-এর ভেতরে accessible
  selector:
    app: redis      # "app: redis" label-এর pods-এ traffic পাঠাও
  ports:
    - port: 6379    # redis-service:6379 দিয়ে access
```

---

## 📁 FILE 03: `03-kafka.yaml` — Message Broker

### Kafka কী?
> বাস্তব উদাহরণ: Order service বলে "নতুন order এলো" → Kafka এই message রাখে → Product service পরে এসে message পড়ে stock update করে। কেউ কারো জন্য **অপেক্ষা করে না**।

### KRaft Mode (Zookeeper ছাড়া):
আগে Kafka চালাতে Zookeeper লাগত (আলাদা server)। KRaft mode-এ Kafka নিজেই সব manage করে।

### Init Container:
```yaml
initContainers:
  - name: kafka-init
    command:
      - sh
      - -c
      - |
        if [ ! -f /var/lib/kafka/data/meta.properties ]; then
          kafka-storage format --cluster-id MkU3OEVBNTcwNTJENDM2Qk
        fi
```
> Init container হলো **helper** যা main container-এর আগে একবার চলে এবং শেষ হয়।

প্রথমবার Kafka-এর storage format করতে হয়। এরপর থেকে skip।

### Kafka Listeners (৩ ধরনের):

| Listener | Port | ব্যবহার |
|---|---|---|
| `PLAINTEXT` | 9092 | cluster-এর ভেতরে app → Kafka |
| `CONTROLLER` | 9094 | KRaft controller communication |
| `EXTERNAL` | 9093 | বাইরে থেকে debug/access |

---

## 📁 FILE 04: `04-databases.yaml` — PostgreSQL (৩টি)

### কেন আলাদা আলাদা database?

> **Microservice Pattern**: প্রতিটি service-এর নিজস্ব database — একটা crash করলে বাকিগুলো চলে।

```
auth-db     → শুধু auth-service ব্যবহার করে
product-db  → শুধু product-service ব্যবহার করে
order-db    → শুধু order-service ব্যবহার করে
```

### প্রতিটি DB-র জন্য ৩টি resource:
1. **StatefulSet** → PostgreSQL pod চালায়
2. **Headless Service** → StatefulSet DNS-এর জন্য
3. **ClusterIP Service** → Apps এই address দিয়ে connect করে

### `envFrom` vs `env`:
```yaml
envFrom:
  - secretRef:
      name: auth-db-secret   # Secret-এর সব key-value env হিসেবে inject হয়
# এটা = POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB সব একসাথে আসে

env:
  - name: PGDATA             # এটা নির্দিষ্ট একটা variable
    value: /var/lib/postgresql/data/pgdata
```

### Security Capabilities:
```yaml
capabilities:
  drop:
    - ALL           # সব Linux capabilities বাদ দাও
  add:
    - CHOWN         # File ownership change করতে পারবে (postgres-এর দরকার)
    - SETGID        # Group change করতে পারবে
    - SETUID        # User change করতে পারবে
```

---

## 📁 FILE 12: `12-db-migration-job.yaml` — Database Tables তৈরি

### Job কী?
> Job হলো একটা **one-time task** — একবার চলে, শেষ হয়।

```yaml
apiVersion: batch/v1
kind: Job
spec:
  backoffLimit: 3          # fail হলে ৩ বার retry
  activeDeadlineSeconds: 300   # ৫ মিনিটের বেশি লাগলে fail
  template:
    spec:
      restartPolicy: Never   # Job-এ Always ব্যবহার করা যায় না
      containers:
        - command:
            - sh
            - -c
            - |
              npx prisma db push --skip-generate   # Prisma দিয়ে DB schema তৈরি
```

### কেন আলাদা Job? initContainer কেন না?
```
initContainer → প্রতিটি pod restart-এ চলে
             → 3 replicas = migration ৩ বার চলে → CONFLICT!

Job          → একবারই চলে → সঠিক ✓
```

### ArgoCD Hook:
```yaml
annotations:
  argocd.argoproj.io/hook: PreSync          # Deployment-এর আগে চলবে
  argocd.argoproj.io/hook-delete-policy: HookSucceeded  # Success-এ Job delete হবে
```

---

## 📁 FILE 05-07: Services (Auth, Product, Order)

### প্রতিটি Service ফাইলে **৪টি resource**:

#### 1️⃣ Deployment

```yaml
apiVersion: apps/v1
kind: Deployment    # Stateless app চালায়
spec:
  replicas: 2       # ২টি copy চলবে
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # Update-এর সময় ১টা extra pod আনো
      maxUnavailable: 0   # কোনো pod down হবে না (Zero Downtime!)
```

### Rolling Update কীভাবে কাজ করে?

```
আগে:  [v1] [v1]
step1: [v1] [v1] [v2]    ← নতুন v2 pod এলো (maxSurge: 1)
step2: [v1] [v2]         ← একটা v1 বন্ধ হলো (maxUnavailable: 0 মানে v2 ready হওয়ার পরে)
step3: [v2] [v2]         ← সব update হয়ে গেলো
```

### Pod Anti-Affinity:
```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - topologyKey: kubernetes.io/hostname   # আলাদা node-এ রাখো
```
> দুটো pod একই node-এ থাকলে সেই node crash করলে service down! Anti-affinity এটা prevent করে।

#### 2️⃣ ClusterIP Service

```yaml
kind: Service
spec:
  type: ClusterIP     # শুধু cluster-এর ভেতরে
  selector:
    app: auth-service  # এই label-এর pods-এ traffic পাঠাও
  ports:
    - name: http
      port: 3001       # Service-এর port
      targetPort: 3001  # Pod-এর port
    - name: grpc
      port: 50051      # gRPC port (service-to-service communication)
```

#### 3️⃣ HPA (HorizontalPodAutoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2      # সবসময় কমপক্ষে ২টি pod
  maxReplicas: 8      # সর্বোচ্চ ৮টি pod
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          averageUtilization: 70  # CPU 70% হলে নতুন pod আনো
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60   # ৬০s পরে scale up
    scaleDown:
      stabilizationWindowSeconds: 300  # ৫ মিনিট পরে scale down
```

> **HPA কীভাবে কাজ করে?**
> ```
> Low traffic:  [pod] [pod]          (2 pods)
> High traffic: [pod] [pod] [pod] [pod] [pod]  (5 pods, auto scale up)
> Low again:    [pod] [pod]          (scale back down)
> ```

#### 4️⃣ PodDisruptionBudget (PDB)

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 1    # Node drain বা update-এর সময়ও min ১টা pod চলবে
```

> **PDB কেন?** যখন Kubernetes node upgrade করে বা node সরিয়ে দেয় (drain), তখন এটা নিশ্চিত করে যে service সম্পূর্ণ বন্ধ না হয়।

---

## Service Comparison Table:

| | Auth Service | Product Service | Order Service |
|---|---|---|---|
| HTTP Port | 3001 | 3002 | 3003 |
| gRPC Port | 50051 | 50052 | 50053 |
| Min Pods | 2 | 3 | 2 |
| Max Pods | 8 | 10 | 8 |
| Reason | Auth baseline | Most traffic! | Order baseline |

---

## 📁 FILE 08: `08-ingress.yaml` — Internet Gateway

### Ingress কী?
> বাস্তব উদাহরণ: Hotel reception — বাইরের মানুষ আসলে reception তাকে সঠিক room-এ পাঠায়।

```
Internet → NGINX Ingress → /api/auth    → auth-service:3001
                         → /api/products → product-service:3002
                         → /api/orders   → order-service:3003
```

### Annotations-এ কী আছে?

```yaml
annotations:
  # Rate Limiting — DDoS protection
  nginx.ingress.kubernetes.io/limit-rps: "100"          # প্রতি সেকেন্ডে ১০০ request
  nginx.ingress.kubernetes.io/limit-connections: "30"   # একসাথে ৩০ connection

  # SSL — HTTPS force
  nginx.ingress.kubernetes.io/ssl-redirect: "true"

  # TLS — Let's Encrypt free certificate
  cert-manager.io/cluster-issuer: "letsencrypt-prod"

  # CORS — Frontend domain allow
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://yourdomain.com"

  # Security Headers
  nginx.ingress.kubernetes.io/configuration-snippet: |
    more_set_headers "X-Frame-Options: DENY";       # Clickjacking protect
    more_set_headers "X-Content-Type-Options: nosniff"; # MIME sniffing protect
```

### Auth-এর জন্য কড়া Rate Limit কেন?
```yaml
# Auth Ingress-এ:
nginx.ingress.kubernetes.io/limit-rps: "20"   # মাত্র ২০/second
# Brute force attack থেকে রক্ষা — কেউ password guess করতে পারবে না
```

---

## 📁 FILE 11: `11-network-policy.yaml` — Firewall Rules

### Zero Trust Security Model:
> **Default: সব block → তারপর explicitly allow**

```yaml
# সব traffic block করো
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}     # সব pods-এ apply
  policyTypes:
    - Ingress   # ঢোকার traffic block
    - Egress    # বের হওয়ার traffic block
```

### DNS Allow কেন আলাদা?
```yaml
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
spec:
  egress:
    - ports:
        - port: 53    # DNS port — এটা না থাকলে কোনো service name resolve হবে না!
```

### Traffic Flow দেখো:

```
Internet
   ↓ (port 443/80)
Ingress (ingress-nginx namespace)
   ↓ (port 3001)
auth-service          → (port 5432) → auth-db
   ↓ (port 6379)
Redis

order-service         → (port 5432) → order-db
   ↓ (port 50051)     → (port 9092) → Kafka
auth-service (gRPC)   → (port 50052) → product-service (gRPC)
```

### Database-এ কঠোর restriction:
```yaml
# auth-db শুধু auth-service থেকে connection নেবে
ingress:
  - from:
      - podSelector:
          matchLabels:
            app: auth-service
      - podSelector:
          matchLabels:
            job-type: db-migration   # Migration job-ও allow
```

---

## 📁 FILE 09: `09-cluster-autoscaler.yaml` — Node Auto-scaling

> **Node vs Pod scaling পার্থক্য:**
> - **HPA** (Pod scaling): আরো বেশি traffic → আরো বেশি pods তৈরি করো
> - **Cluster Autoscaler** (Node scaling): আরো pods-এর জায়গা নেই → আরো বেশি server/node যোগ করো

---

## 📁 `kustomization.yaml` — সব একসাথে Deploy

```yaml
# kustomize দিয়ে সব ফাইল একসাথে apply করা যায়:
# kubectl apply -k k8s/
```

---

## 🌊 Complete Request Flow (User → Response)

```
1. User browser-এ যায়: https://api.yourdomain.com/api/products/123

2. DNS → AWS Load Balancer → NGINX Ingress Controller

3. Ingress rule দেখে:
   /api/products → product-service:3002

4. product-service (3 pods-এর মধ্যে একটায় যাবে) request পায়

5. product-service:
   a. auth-service:50051 (gRPC) → "এই JWT token valid?"
   b. redis-service:6379 → "Cache-এ product আছে?"
   c. product-db-service:5432 → "DB থেকে product আনো"
   d. kafka-service:9092 → "Product viewed event পাঠাও"

6. Response user-এর কাছে ফেরত যায়
```

---

## 🔑 Key Concepts Summary

| Concept | সহজ ভাষায় |
|---|---|
| **Namespace** | আলাদা department — resources isolated |
| **ConfigMap** | Environment config — plain text |
| **Secret** | Passwords — encoded/encrypted |
| **StatefulSet** | Database/Cache — stable storage |
| **Deployment** | App servers — stateless, scalable |
| **Service (ClusterIP)** | Internal load balancer — cluster-এর ভেতরে |
| **Ingress** | External gateway — internet → cluster |
| **HPA** | Pod auto-scaler — traffic বাড়লে pod বাড়ায় |
| **PDB** | Availability guarantee — maintenance-এও চলে |
| **NetworkPolicy** | Firewall — কে কার সাথে কথা বলতে পারবে |
| **Job** | One-time task — DB migration |
| **PVC** | Disk claim — persistent storage |

---

## ⚠️ Production-এ করণীয়

1. **Secrets**: `01-secrets.yaml` কখনো git-এ push করবেন না!
   - AWS Secrets Manager + External Secrets Operator ব্যবহার করুন

2. **Databases**: Self-managed PostgreSQL-এর বদলে AWS RDS ব্যবহার করুন

3. **Kafka**: Self-managed-এর বদলে AWS MSK ব্যবহার করুন

4. **Images**: `auth-service:1.0.0` → আপনার Docker registry-র real image দিন

5. **Domain**: `yourdomain.com` → আপনার real domain দিন

6. **StorageClass**: `gp2` → `gp3` ব্যবহার করুন (better performance, same price)
