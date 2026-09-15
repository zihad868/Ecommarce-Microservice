# 📦 E-Commerce Microservice — Full Project Review

> **Beginner-friendly guide** to understand this project end-to-end, especially **gRPC**.

---

## 📑 Table of Contents

- [What Is This Project?](#-what-is-this-project)
- [Architecture Overview](#-architecture-overview)
- [What is gRPC?](#-what-is-grpc-for-beginners)
- [The Proto Files — Contracts](#-the-proto-files--the-contracts)
- [Auth Service](#-auth-service--deep-dive)
- [Product Service](#-product-service--deep-dive)
- [Order Service](#-order-service--deep-dive)
- [RabbitMQ — Async Messaging](#-rabbitmq--async-messaging)
- [Redis — Caching Layer](#-redis--caching-layer)
- [Docker Setup](#-docker-setup)
- [Full Request Lifecycle](#-full-request-lifecycle-place-an-order)
- [File Map](#-full-file-map)
- [Key Patterns](#-key-patterns-to-remember)

---

## 🧠 What Is This Project?

This is a **Node.js + TypeScript microservices-based e-commerce backend** with **3 independent services** that communicate using:

| Method | Used For | Style |
|---|---|---|
| **gRPC** | Service-to-service calls (auth check, product lookup) | Synchronous (waits for reply) |
| **RabbitMQ** | Events after an action (stock decrement) | Asynchronous (fire and forget) |
| **REST HTTP** | External clients (browsers, mobile apps) | Synchronous |

---

## 🏗️ Architecture Overview

```
          ┌──────────────────────────────────────────────────────┐
          │                  CLIENT (HTTP Requests)              │
          └──────────┬─────────────────┬─────────────┬──────────┘
                     │                 │             │
               :3001/api         :3002/api      :3003/api
                     │                 │             │
     ┌───────────────▼──┐   ┌──────────▼──┐   ┌─────▼────────────┐
     │   auth-service   │   │product-     │   │  order-service   │
     │                  │   │service      │   │                  │
     │  REST  → :3001   │   │ REST → :3002│   │  REST  → :3003   │
     │  gRPC  → :50051  │   │ gRPC → :50052   │  gRPC  → :50053  │
     └──────────┬───────┘   └──────┬──────┘   └────┬─────────────┘
                │                  │               │
     ┌──────────▼──────┐  ┌────────▼──────┐  ┌────▼──────────────┐
     │    auth-db      │  │  product-db   │  │    order-db        │
     │  (PostgreSQL)   │  │ (PostgreSQL)  │  │  (PostgreSQL)      │
     │    Port 5433    │  │   Port 5435   │  │    Port 5434       │
     └─────────────────┘  └───────────────┘  └───────────────────┘

     ┌──────────────────────────────────────────────────────────────┐
     │                   Redis (Cache)  :6379                       │
     └──────────────────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────────────────┐
     │           RabbitMQ (Message Broker)  :5672 / :15672          │
     └──────────────────────────────────────────────────────────────┘
```

### 🔗 Who Talks to Whom?

```
order-service  ──gRPC──►  auth-service    (validate JWT token)
order-service  ──gRPC──►  product-service (get product price/stock)
order-service  ──MQ────►  product-service (order.created event)
product-service ◄──MQ───  order-service   (consumes: decrement stock)
```

---

## 🔑 What is gRPC? (For Beginners)

### The Simple Analogy

> **REST API** = Sending a letter (text, slow, waits for postman)
> **gRPC** = Making a phone call (binary, fast, direct connection)

### REST vs gRPC

| Feature | REST (HTTP/JSON) | gRPC (Protobuf) |
|---|---|---|
| Data format | JSON (human-readable text) | Protobuf (binary, compact) |
| Speed | Slower | **~7x faster** |
| Schema | Optional (OpenAPI) | **Required** (`.proto` file) |
| Transport | HTTP/1.1 | HTTP/2 |
| Best for | Client ↔ Server | **Server ↔ Server** |
| Error handling | HTTP status codes | gRPC status codes |

### How gRPC Works — 4 Steps

```
STEP 1 — DEFINE
  Write a .proto file describing functions & data shapes
  Both the server AND client must use the same .proto

STEP 2 — SERVE
  One service creates a gRPC Server
  Registers handler functions
  Listens on a port (e.g. :50051)

STEP 3 — CALL
  Another service creates a gRPC Client
  Points it at the server's address
  Calls a function as if it were local

STEP 4 — RESPOND
  Server runs the handler
  Returns the result back to the client
```

### Code Example (simplified)

```typescript
// === SERVER SIDE (auth-service) ===
server.addService(AuthService.service, {
  ValidateToken: (call, callback) => {
    const { token } = call.request;   // input from caller
    const result = verify(token);
    callback(null, result);            // send reply back
  }
});
server.bindAsync('0.0.0.0:50051', ...); // listen

// === CLIENT SIDE (order-service) ===
const authClient = new AuthService('auth-service:50051', credentials);

authClient.ValidateToken({ token }, (err, response) => {
  if (response.valid) {
    // user is authenticated ✅
  }
});
```

---

## 📄 The Proto Files — The "Contracts"

All proto files live in `/protos/` and are **shared via Docker volume** across all 3 services.

> **Rule:** If the `.proto` says a function exists, the server MUST implement it and the client CAN call it.

---

### `auth.proto`

```protobuf
syntax = "proto3";
package auth;

service AuthService {
  rpc ValidateToken (TokenRequest) returns (TokenResponse) {}
}

message TokenRequest {
  string token = 1;            // the JWT token to validate
}

message TokenResponse {
  bool   valid  = 1;           // is the token valid?
  string userId = 2;           // who owns it?
  string error  = 3;           // error message if invalid
}
```

**Plain English:** *"Send me a JWT, I'll tell you if it's valid and whose it is."*

---

### `product.proto`

```protobuf
syntax = "proto3";
package product;

service ProductService {
  rpc GetProduct (ProductRequest) returns (ProductResponse) {}
}

message ProductRequest {
  string productId = 1;
}

message ProductResponse {
  bool   success = 1;
  string id      = 2;
  string name    = 3;
  double price   = 4;
  int32  stock   = 5;
  string error   = 6;
}
```

**Plain English:** *"Send me a product ID, I'll return its price and stock level."*

---

### `order.proto`

```protobuf
syntax = "proto3";
package order;

service OrderService {
  rpc GetOrder        (OrderRequest)      returns (OrderResponse)      {}
  rpc GetOrdersByUser (UserOrdersRequest) returns (UserOrdersResponse) {}
}
```

**Plain English:** *"Get a single order by ID, or get all orders for a user."*

---

## 🔐 Auth Service — Deep Dive

**Location:** `auth-service/src/`

### Responsibilities
- ✅ Register & login users (REST on `:3001`)
- ✅ Issue JWT tokens (valid 1 day)
- ✅ **Validate JWT tokens for other services via gRPC** (`:50051`)
- ✅ Cache users in Redis to avoid DB hits on every request

### gRPC Server Startup (`authServer.ts`)

```typescript
// 1. Load the proto file at runtime
const packageDefinition = protoLoader.loadSync('protos/auth.proto');
const authProto = grpc.loadPackageDefinition(packageDefinition);

// 2. Create gRPC server
const server = new grpc.Server();

// 3. Register functions from the proto
server.addService(authProto.auth.AuthService.service, {
  ValidateToken: validateToken     // ← handler function
});

// 4. Start listening
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), ...);
```

### Token Validation Flow

```
[gRPC request] token arrives
        │
        ▼
  jwt.verify(token, JWT_SECRET)
        │
   INVALID ──────────────────► return { valid: false, error: "Invalid token" }
        │ VALID
        ▼
  Check Redis: GET "user:<userId>"
        │
    HIT ▼ ────────────────────────────► Return cached data (fast ⚡)
        │ MISS
        ▼
  PostgreSQL query
        │
        ▼
  Redis SETEX "user:<id>" 300 <json>   ← store for next time
        │
        ▼
  Return { valid: true, userId }
```

### Database Schema (auth-db)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String                         // bcrypt hashed (never plain text)
  role      Role     @default(USER)        // USER | ADMIN (RBAC ready)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])                         // fast login lookups
}
```

### REST Endpoints

| Method | URL | What it does |
|---|---|---|
| `POST` | `/api/auth/register` | Create account, return JWT |
| `POST` | `/api/auth/login` | Login, return JWT |
| `GET` | `/health` | Health check for Docker |

---

## 📦 Product Service — Deep Dive

**Location:** `product-service/src/`

### Responsibilities
- ✅ CRUD for products (REST on `:3002`)
- ✅ **Expose `GetProduct` via gRPC** (`:50052`) — used by Order Service
- ✅ **Listen to RabbitMQ** `order.created` → decrement stock automatically
- ✅ Cache products in Redis (10 min individual, 1 min lists)

### gRPC Handler (`productServer.ts`)

```typescript
const getProduct = async (call, callback) => {
  const { productId } = call.request;           // from order-service

  const product = await productService.getProductById(productId);
  // checks Redis first, then PostgreSQL

  if (!product) {
    callback(null, { success: false, error: 'Product not found' });
    return;
  }

  callback(null, {
    success: true,
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    error: '',
  });
};
```

### RabbitMQ Consumer Flow

```
order-service publishes ──► "order.created" queue
                                       │
product-service consumes ◄─────────────┘
        │
        ├─ Parse event: { orderId, items: [{ productId, quantity }] }
        │
        ├─ For each item:
        │     UPDATE products SET stock = stock - quantity WHERE id = productId
        │     DELETE Redis cache for that product
        │
        └─ Invalidate all "products:list:*" cache keys
```

### REST Endpoints

| Method | URL | Auth Required | What it does |
|---|---|---|---|
| `GET` | `/api/products` | ❌ | List all (filterable/pageable) |
| `GET` | `/api/products/:id` | ❌ | Get single product |
| `POST` | `/api/products` | ✅ | Create product |
| `PUT` | `/api/products/:id` | ✅ | Update product |
| `DELETE` | `/api/products/:id` | ✅ | Delete product |

### Database Schema (product-db)

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Float
  stock       Int
  category    String?
  attributes  Json     @default("{}")   // flexible extra data
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🛒 Order Service — Deep Dive

**Location:** `order-service/src/`

### Responsibilities
- ✅ Create and retrieve orders (REST on `:3003`)
- ✅ **Call Auth Service via gRPC** to verify every incoming JWT
- ✅ **Call Product Service via gRPC** to validate product + stock
- ✅ **Publish `order.created`** to RabbitMQ after saving
- ✅ Expose gRPC server (`:50053`) for other services to query orders

### Two gRPC Clients (`grpcClients.ts`)

```typescript
// Client 1: talks to auth-service
export const authClient = new authProto.auth.AuthService(
  process.env.AUTH_GRPC_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

// Client 2: talks to product-service
export const productClient = new productProto.product.ProductService(
  process.env.PRODUCT_GRPC_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);

// Helper wrapper (callback → Promise)
export const getProductDetails = (productId: string): Promise<ProductResponse> => {
  return new Promise((resolve, reject) => {
    productClient.GetProduct({ productId }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
};
```

### Auth Middleware — gRPC protecting REST routes

```
HTTP Request → POST /api/orders
  Header: "Authorization: Bearer eyJhbGci..."
                │
                ▼
  authMiddleware.protect()
                │
  Extract token from header
                │
  authClient.ValidateToken({ token })  ← gRPC call to auth-service:50051
                │
        INVALID ▼                  VALID ▼
   401 Unauthorized          req.user = { id: userId }
                                        │
                                        ▼
                                   next() → controller
```

### Create Order Flow (`orderService.ts`)

```
createOrder(userId, items[])
        │
        ├─ For each item:
        │    1. getProductDetails(productId)  ← gRPC to product-service
        │    2. if !product → throw Error("Product not found")
        │    3. if stock < quantity → throw Error("Insufficient stock")
        │    4. totalAmount += price × quantity
        │
        ▼
  prisma.order.create({
    userId, totalAmount, status: 'COMPLETED',
    items: { create: validatedItems }
  })
        │
        ▼
  publishEvent('order.created', { orderId, items })  ← RabbitMQ
        │
        ▼
  return order ✅
```

### Database Schema (order-db)

```prisma
model Order {
  id          String      @id @default(cuid())
  userId      String                              // auth-service user ID
  totalAmount Float
  status      OrderStatus @default(PENDING)       // PENDING|PROCESSING|COMPLETED|CANCELLED
  items       OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([userId])
  @@index([status])
  @@index([userId, createdAt])                    // most common query
}

model OrderItem {
  id        String @id @default(cuid())
  productId String
  quantity  Int
  price     Float                                 // price snapshot at order time
  orderId   String
  order     Order  @relation(...)

  @@index([orderId])
  @@index([productId])
}
```

### REST Endpoints

| Method | URL | Auth Required | What it does |
|---|---|---|---|
| `POST` | `/api/orders` | ✅ | Create a new order |
| `GET` | `/api/orders` | ✅ | Get my orders |
| `GET` | `/api/orders/:id` | ✅ | Get single order |

---

## 🐇 RabbitMQ — Async Messaging

### Why Not Just Use gRPC for Everything?

After placing an order, we need to decrement stock. But:
- The user **shouldn't have to wait** for the stock update before getting their order confirmation
- If product-service is temporarily down, the stock update should **retry later**, not fail the order

### Solution: Event-Driven with RabbitMQ

```
SYNCHRONOUS (gRPC) — used when you need an IMMEDIATE answer:
  order-service ──ValidateToken──► auth-service    "Is this user valid?"
  order-service ──GetProduct─────► product-service "Does this product exist?"

ASYNCHRONOUS (RabbitMQ) — used when you DON'T need to wait:
  order-service ──publish──► [order.created queue] ──► product-service
```

### Message Flow

```
Order Service                              Product Service
     │                                           │
     │── publish "order.created" ──────────────► │
     │   { orderId, items }                      │ (separate process)
     │                                           ▼
     │                              consume message from queue
     │                              for each item:
     │                                decrementProductStock(id, qty)
     │                                invalidate Redis cache
     │                              ack message (mark as done)
     ▼
Return order to user immediately ✅
```

### Queue Configuration

```typescript
// Publisher (order-service)
channel.assertQueue('order.created', { durable: true });   // survives restart
channel.sendToQueue('order.created', Buffer.from(JSON.stringify(data)), {
  persistent: true,                                         // survives broker restart
});

// Consumer (product-service)
channel.assertQueue('order.created', { durable: true });
channel.consume('order.created', async (msg) => {
  // process message...
  channel.ack(msg);  // tell RabbitMQ: done, remove from queue
});
```

---

## 🗃️ Redis — Caching Layer

Redis sits between all services and their databases to avoid redundant DB queries.

### Cache Strategy

| Service | Cache Key | TTL | When Invalidated |
|---|---|---|---|
| auth-service | `user:<userId>` | 5 min | Never (expires naturally) |
| product-service | `product:<id>` | 10 min | On update, delete, or stock change |
| product-service | `products:list:<query>` | 1 min | On any create/update/delete/order |

### Cache Flow (Read-Through Pattern)

```
Request for product X
        │
        ▼
  Redis GET "product:X"
        │
    HIT ▼ ────────────────────────────► Return cached data (fast ⚡)
        │ MISS
        ▼
  PostgreSQL query
        │
        ▼
  Redis SETEX "product:X" 600 <json>   ← store for next time
        │
        ▼
  Return data
```

---

## 🐳 Docker Setup

Everything runs as containers via `docker-compose.yml`.

### Services

```
rabbitmq:        :5672  (broker)   :15672 (management UI)
redis:           :6379
auth-db:         :5433  (PostgreSQL)
product-db:      :5435  (PostgreSQL)
order-db:        :5434  (PostgreSQL)
auth-service:    :3001  (REST)     :50051 (gRPC)
product-service: :3002  (REST)     :50052 (gRPC)
order-service:   :3003  (REST)     :50053 (gRPC)
```

### Startup Order (depends_on with health checks)

```
rabbitmq ──healthy──►┐
redis    ──healthy──►├──► product-service ──healthy──►┐
product-db──healthy──►┘                               ├──► order-service
auth-db  ──healthy──►┐                               │
redis    ──healthy──►├──► auth-service  ──healthy──►──┘
                     │
order-db ──healthy──►┘──► order-service
```

### Shared Proto Volume

```yaml
volumes:
  - ./protos:/usr/src/app/protos   # all services mount the same proto files
```

This ensures all services always use the **same version** of the contract.

---

## 🔄 Full Request Lifecycle: "Place an Order"

```
User sends:
  POST http://localhost:3003/api/orders
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  {
    "items": [
      { "productId": "clx123abc", "quantity": 2 }
    ]
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: order-service (Express) receives POST /api/orders

STEP 2: authMiddleware runs
  → Extracts token from "Authorization: Bearer ..." header

STEP 3: gRPC call → auth-service:50051
  → authClient.ValidateToken({ token: "eyJ..." })
  ← Response: { valid: true, userId: "clx_user_456" }
  → req.user = { id: "clx_user_456" }

STEP 4: orderController.createOrder() called
  → userId = req.user.id
  → items  = [{ productId: "clx123abc", quantity: 2 }]

STEP 5: For each item — gRPC call → product-service:50052
  → productClient.GetProduct({ productId: "clx123abc" })
  ← Response: { success: true, name: "Laptop", price: 999.99, stock: 10 }

STEP 6: Validation
  → stock (10) >= quantity (2)? ✅
  → totalAmount = 999.99 × 2 = 1999.98

STEP 7: Save to order-db (PostgreSQL via Prisma)
  → Order { userId, totalAmount: 1999.98, status: "COMPLETED" }
  → OrderItem { productId, quantity: 2, price: 999.99 }

STEP 8: Publish to RabbitMQ
  → queue: "order.created"
  → payload: { orderId: "clx_order_789", items: [...] }

STEP 9: Return to user ✅
  {
    "success": true,
    "data": {
      "id": "clx_order_789",
      "totalAmount": 1999.98,
      "status": "COMPLETED",
      "items": [...]
    }
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 10 (async — happens separately):
  product-service RabbitMQ consumer wakes up
  → decrementProductStock("clx123abc", 2)
  → stock: 10 → 8
  → Redis cache for "product:clx123abc" deleted
```

---

## 📁 Full File Map

```
Ecommarce-Microservice/
│
├── protos/                                ← Shared gRPC contracts
│   ├── auth.proto                         │   AuthService.ValidateToken
│   ├── product.proto                      │   ProductService.GetProduct
│   └── order.proto                        │   OrderService.GetOrder / GetOrdersByUser
│
├── docker-compose.yml                     ← Wires all containers together
├── PROJECT_REVIEW.md                      ← This file
│
├── auth-service/
│   ├── Dockerfile
│   ├── prisma/schema.prisma               ← User model (id, email, password, role)
│   └── src/
│       ├── server.ts                      ← Starts Express + gRPC
│       ├── grpc/
│       │   └── authServer.ts              ← gRPC SERVER on :50051
│       ├── services/
│       │   └── authService.ts             ← JWT verify + bcrypt + Redis cache
│       ├── controllers/
│       │   └── authController.ts          ← REST request handlers
│       ├── routes/
│       │   └── authRoutes.ts              ← POST /register, /login
│       ├── middlewares/
│       │   ├── authMiddleware.ts          ← Protect REST routes with JWT
│       │   └── errorHandler.ts
│       └── utils/
│           └── redisClient.ts             ← Redis connection singleton
│
├── product-service/
│   ├── Dockerfile
│   ├── prisma/schema.prisma               ← Product model
│   └── src/
│       ├── server.ts                      ← Starts Express + gRPC + RabbitMQ
│       ├── grpc/
│       │   └── productServer.ts           ← gRPC SERVER on :50052
│       ├── services/
│       │   └── productService.ts          ← CRUD + Redis cache logic
│       ├── events/
│       │   └── rabbitmq.ts                ← CONSUMER of "order.created"
│       ├── controllers/
│       │   └── productController.ts
│       ├── routes/
│       │   └── productRoutes.ts           ← GET/POST/PUT/DELETE /products
│       ├── middlewares/
│       │   ├── authMiddleware.ts
│       │   └── errorHandler.ts
│       └── utils/
│           ├── redisClient.ts
│           └── prismaClient.ts
│
└── order-service/
    ├── Dockerfile
    ├── prisma/schema.prisma               ← Order + OrderItem models
    └── src/
        ├── server.ts                      ← Starts Express + gRPC + RabbitMQ
        ├── grpc/
        │   ├── orderServer.ts             ← gRPC SERVER on :50053
        │   └── grpcClients.ts             ← gRPC CLIENTS → auth + product
        ├── services/
        │   └── orderService.ts            ← createOrder (gRPC calls + DB + MQ)
        ├── events/
        │   └── rabbitmq.ts                ← PUBLISHER to "order.created"
        ├── controllers/
        │   └── orderController.ts
        ├── routes/
        │   └── orderRoutes.ts             ← POST /orders, GET /orders/:id
        ├── middlewares/
        │   ├── authMiddleware.ts          ← calls auth-service via gRPC
        │   └── errorHandler.ts
        └── types/
            └── express.d.ts               ← Adds req.user type extension
```

---

## ✅ Key Patterns to Remember

| Pattern | Where | Why |
|---|---|---|
| **gRPC Server** | auth, product, order | Expose internal functions to other services |
| **gRPC Client** | order → auth, order → product | Call another service's function directly |
| **Proto file** | `/protos/` (shared) | Contract both caller & server agree on |
| **Read-through cache** | auth + product | Check Redis → miss → DB → store in Redis |
| **Cache invalidation** | product on update/delete | Keep cached data fresh |
| **RabbitMQ publish** | order-service | Fire event after order, don't wait |
| **RabbitMQ consume** | product-service | React to orders, update stock async |
| **Prisma ORM** | all 3 services | Type-safe PostgreSQL queries |
| **JWT + bcrypt** | auth-service | Secure user auth (hash passwords) |
| **Rate limiting** | all 3 servers | Protect against brute force / overload |
| **Health checks** | all services | Docker knows when service is ready |
| **Separate DBs** | each service | Microservice data isolation principle |

---

## 🔐 Security Features

| Feature | Where | Details |
|---|---|---|
| Password hashing | auth-service | bcrypt with salt rounds = 10 |
| JWT tokens | auth-service | Expires in 1 day |
| Rate limiting (auth) | auth-service | 20 requests / 15 minutes |
| Rate limiting (global) | all services | 300–1000 req/min depending on service |
| Token validation | order + product | Every request goes through gRPC auth check |
| No plain text passwords | auth-service | Password stripped before caching in Redis |

---

## 🚀 How to Run

```bash
# Start everything with Docker Compose
docker-compose up --build

# Access points:
# Auth REST API:     http://localhost:3001/api/auth
# Product REST API:  http://localhost:3002/api/products
# Order REST API:    http://localhost:3003/api/orders
# RabbitMQ UI:       http://localhost:15672  (user / password)
# Redis:             localhost:6379
```

---

*Generated: September 2026 | Stack: TypeScript · Node.js · gRPC · PostgreSQL · Redis · RabbitMQ · Docker*
