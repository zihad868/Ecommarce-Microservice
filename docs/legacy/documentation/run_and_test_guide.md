# 🛒 Ecommerce Microservice — Run & Test Guide

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Postman)                        │
└──────────┬───────────────┬──────────────────┬──────────────┘
           │               │                  │
     :3001 REST      :3002 REST          :3003 REST
           │               │                  │
    ┌──────▼──────┐  ┌─────▼──────┐   ┌──────▼──────┐
    │ auth-service│  │product-svc │   │ order-svc   │
    │  :50051 gRPC│  │ :50052 gRPC│   │ :50053 gRPC │
    └──────┬──────┘  └─────┬──────┘   └──────┬──────┘
           │               │                  │
    ┌──────▼──────┐  ┌─────▼──────┐   ┌──────▼──────┐
    │  auth-db    │  │ product-db │   │  order-db   │
    │  PG :5433   │  │  PG :5435  │   │  PG :5434   │
    └─────────────┘  └────────────┘   └─────────────┘
           │               │                  │
           └───────────────┴──────────────────┘
                           │
                    ┌──────▼──────┐    ┌─────────────┐
                    │    Redis    │    │  Kafka   │
                    │    :6379    │    │    :9092    │
                    └─────────────┘    └─────────────┘
```

---

## 🚀 Part 1 — How to Run the Project

### Prerequisites

| Tool | Required Version | Check Command |
|------|-----------------|---------------|
| Docker Desktop | Latest | `docker --version` |
| Docker Compose | v2+ | `docker compose version` |
| Node.js | v18+ | `node --version` |
| npm | v9+ | `npm --version` |

---

### Option A — Run via Docker (Recommended ✅)

> Everything runs inside Docker — databases, Redis, Kafka, and all 3 services. No manual setup needed.

**Step 1: Clone / Open Project**
```bash
cd c:\Users\Zihad.DESKTOP-GMMJT8N\Desktop\Project\Ecommarce-Microservice
```

**Step 2: Start All Services**
```bash
docker compose up --build
```
Or use the npm shortcut:
```bash
npm run docker:up
```

**Step 3: Wait for Healthy Status**

Watch the logs — all 3 services will show:
```
auth-service    | Auth Service REST API running on port 3001
product-service | Product Service REST API running on port 3002
order-service   | Order Service REST API running on port 3003
```

**Step 4: Verify Health Endpoints**

Open browser or Postman:
- `GET http://localhost:3001/health` → auth-service
- `GET http://localhost:3002/health` → product-service
- `GET http://localhost:3003/health` → order-service

**Stop All Services:**
```bash
docker compose down
# or to also remove volumes (wipes DB data):
docker compose down -v
```

---

### Option B — Run Locally (Development)

> For development, run services outside Docker but keep infra (DB, Redis, Kafka) in Docker.

**Step 1: Start Infrastructure Only**
```bash
docker compose up zookeeper kafka redis auth-db order-db product-db
```

**Step 2: Create `.env` files in each service**

`auth-service/.env`:
```env
PORT=3001
GRPC_PORT=50051
DATABASE_URL=postgresql://auth_user:auth_password@localhost:5433/auth_db?schema=public
JWT_SECRET=supersecret123_change_in_production
REDIS_HOST=localhost
REDIS_PORT=6379
```

`product-service/.env`:
```env
PORT=3002
GRPC_PORT=50052
DATABASE_URL=postgresql://product_user:product_password@localhost:5435/product_db?schema=public
KAFKA_BROKER=localhost:9093
AUTH_GRPC_URL=localhost:50051
REDIS_HOST=localhost
REDIS_PORT=6379
```

`order-service/.env`:
```env
PORT=3003
GRPC_PORT=50053
DATABASE_URL=postgresql://order_user:order_password@localhost:5434/order_db?schema=public
KAFKA_BROKER=localhost:9093
AUTH_GRPC_URL=localhost:50051
PRODUCT_GRPC_URL=localhost:50052
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Step 3: Install All Dependencies**
```bash
npm run install:all
```

**Step 4: Run DB Migrations**
```bash
cd auth-service && npx prisma db push && cd ..
cd product-service && npx prisma db push && cd ..
cd order-service && npx prisma db push && cd ..
```

**Step 5: Start Each Service (in separate terminals)**
```bash
# Terminal 1 — Auth Service
cd auth-service && npm run dev

# Terminal 2 — Product Service
cd product-service && npm run dev

# Terminal 3 — Order Service
cd order-service && npm run dev
```

---

### 🖥️ Admin Dashboards (Bonus)

| Dashboard | URL | Credentials |
|-----------|-----|-------------|
| Kafka UI | http://localhost:8080 | *(no login required)* |

---

## 🧪 Part 2 — Postman Testing Guide

### Base URLs

| Service | Base URL |
|---------|----------|
| Auth | `http://localhost:3001` |
| Products | `http://localhost:3002` |
| Orders | `http://localhost:3003` |

---

### 🔑 Step 1 — Register a User

**POST** `http://localhost:3001/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> [!IMPORTANT]
> Copy the `token` value — you need it for all protected endpoints!

---

### 🔑 Step 2 — Login (Get Token)

**POST** `http://localhost:3001/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 👤 Step 3 — Get Current User Profile

**GET** `http://localhost:3001/api/auth/me`

**Headers:**
```
Authorization: Bearer <your_token_here>
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "email": "test@example.com",
    "role": "USER",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 📦 Step 4 — Create a Product (requires auth)

**POST** `http://localhost:3002/api/products`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_token_here>
```

**Body (raw JSON):**
```json
{
  "name": "Wireless Headphones",
  "description": "High-quality noise-canceling headphones",
  "price": 99.99,
  "stock": 50,
  "category": "Electronics",
  "attributes": {
    "color": "black",
    "brand": "Sony",
    "warranty": "1 year"
  }
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Wireless Headphones",
    "description": "High-quality noise-canceling headphones",
    "price": 99.99,
    "stock": 50,
    "category": "Electronics",
    "attributes": { "color": "black", "brand": "Sony", "warranty": "1 year" },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

> [!IMPORTANT]
> Copy the product `id` — you'll need it when creating orders.

---

### 📋 Step 5 — List All Products (no auth required)

**GET** `http://localhost:3002/api/products`

**Expected Response (200):**
```json
{
  "success": true,
  "count": 1,
  "data": [...]
}
```

**Optional Query Params:**
| Param | Example | Description |
|-------|---------|-------------|
| `page` | `?page=1` | Page number |
| `limit` | `?limit=10` | Results per page |
| `search` | `?search=headphone` | Search by name/description |
| `category` | `?category=Electronics` | Filter by category |
| `minPrice` | `?minPrice=50` | Min price filter |
| `maxPrice` | `?maxPrice=200` | Max price filter |
| `sort` | `?sort=price:asc` | Sort by field:direction |

**Example with filters:**
`GET http://localhost:3002/api/products?category=Electronics&minPrice=50&maxPrice=200&sort=price:asc`

---

### 🔍 Step 6 — Get Single Product (no auth required)

**GET** `http://localhost:3002/api/products/{productId}`

**Example:**
`GET http://localhost:3002/api/products/uuid-of-product-here`

**Expected Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### ✏️ Step 7 — Update a Product (requires auth)

**PUT** `http://localhost:3002/api/products/{productId}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_token_here>
```

**Body (raw JSON):**
```json
{
  "name": "Wireless Headphones Pro",
  "price": 129.99,
  "stock": 45
}
```

---

### 🗑️ Step 8 — Delete a Product (requires auth)

**DELETE** `http://localhost:3002/api/products/{productId}`

**Headers:**
```
Authorization: Bearer <your_token_here>
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {}
}
```

---

### 🛍️ Step 9 — Create an Order (requires auth)

**POST** `http://localhost:3003/api/orders`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_token_here>
```

**Body (raw JSON):**
```json
{
  "items": [
    {
      "productId": "uuid-of-product-from-step-4",
      "quantity": 2
    }
  ]
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "userId": "user-id",
    "status": "PENDING",
    "totalAmount": 199.98,
    "items": [
      {
        "productId": "uuid-of-product",
        "quantity": 2,
        "price": 99.99
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

> After order creation, the order-service publishes an `order.created` event to Kafka → product-service consumes it and decrements stock automatically.

---

### 📋 Step 10 — List My Orders (requires auth)

**GET** `http://localhost:3003/api/orders`

**Headers:**
```
Authorization: Bearer <your_token_here>
```

**Expected Response (200):**
```json
{
  "success": true,
  "count": 1,
  "data": [...]
}
```

---

### 🔍 Step 11 — Get Single Order (requires auth)

**GET** `http://localhost:3003/api/orders/{orderId}`

**Headers:**
```
Authorization: Bearer <your_token_here>
```

---

## 🗺️ Complete API Reference

### Auth Service — `http://localhost:3001`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, get JWT |
| GET | `/api/auth/me` | ✅ | Get current user profile |

### Product Service — `http://localhost:3002`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| GET | `/api/products` | ❌ | List products (with filters) |
| POST | `/api/products` | ✅ | Create product |
| GET | `/api/products/:id` | ❌ | Get single product |
| PUT | `/api/products/:id` | ✅ | Update product |
| DELETE | `/api/products/:id` | ✅ | Delete product |

### Order Service — `http://localhost:3003`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| GET | `/api/orders` | ✅ | List user's orders |
| POST | `/api/orders` | ✅ | Create new order |
| GET | `/api/orders/:id` | ✅ | Get single order |

---

## 🔄 Complete Test Flow (Recommended Order)

```
1. POST /api/auth/register          → Register user
2. POST /api/auth/login             → Get JWT token
3. GET  /api/auth/me                → Verify token works
4. POST /api/products               → Create product (save the ID)
5. GET  /api/products               → List all products
6. GET  /api/products/:id           → Get single product
7. POST /api/orders                 → Create order using product ID
8. GET  /api/orders                 → List your orders
9. GET  /api/orders/:id             → Inspect order details
10. GET /api/products/:id           → Check stock decremented by Kafka!
```

---

## ⚙️ Postman Collection Setup (Quick Setup)

1. Open Postman
2. Create a **New Collection** named `Ecommerce Microservices`
3. Go to **Collection Variables** tab, add:

| Variable | Value |
|----------|-------|
| `auth_url` | `http://localhost:3001` |
| `product_url` | `http://localhost:3002` |
| `order_url` | `http://localhost:3003` |
| `token` | *(leave blank — will be set by test script)* |
| `product_id` | *(leave blank — will be set by test script)* |
| `order_id` | *(leave blank — will be set by test script)* |

4. In the **Register** or **Login** request → **Tests** tab, add:
```javascript
const json = pm.response.json();
if (json.token) {
    pm.collectionVariables.set("token", json.token);
}
```

5. In **Create Product** → **Tests** tab, add:
```javascript
const json = pm.response.json();
if (json.data && json.data.id) {
    pm.collectionVariables.set("product_id", json.data.id);
}
```

6. In **Create Order** → **Tests** tab, add:
```javascript
const json = pm.response.json();
if (json.data && json.data.id) {
    pm.collectionVariables.set("order_id", json.data.id);
}
```

Then use `{{token}}`, `{{product_id}}`, `{{order_id}}` in your requests!

---

## 🐞 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Missing or expired token | Re-login, copy fresh token |
| `400 User already exists` | Email already registered | Use a different email |
| `400 Invalid credentials` | Wrong email/password | Check credentials |
| `400 Order items are required` | Wrong body format | Ensure `items` is an array |
| `400 Product not found` | Wrong product ID in order | Copy correct UUID from product creation |
| `400 Insufficient stock` | Not enough stock | Update product stock first |
| Container unhealthy | DB not ready yet | Wait 30–60s after `docker compose up` |

---

## 📊 Service Ports Summary

| Service | REST Port | gRPC Port | DB Port |
|---------|-----------|-----------|---------|
| auth-service | 3001 | 50051 | 5433 (PG) |
| product-service | 3002 | 50052 | 5435 (PG) |
| order-service | 3003 | 50053 | 5434 (PG) |
| Redis | — | — | 6379 |
| Zookeeper | — | — | 2181 |
| Kafka | — | — | 9092 (internal) / 9093 (host) |
| Kafka UI | 8080 | — | — |
