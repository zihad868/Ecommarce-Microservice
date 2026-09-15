# 📦 E-Commerce Microservice — Complete Documentation

> **Stack:** TypeScript · Node.js · Express · gRPC · PostgreSQL · Redis · RabbitMQ · Prisma · Docker

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [How Services Communicate](#3-how-services-communicate)
   - [Communication #1 — REST (Client → Service)](#communication-1--rest-client--service)
   - [Communication #2 — gRPC (Service → Service)](#communication-2--grpc-service--service)
   - [Communication #3 — RabbitMQ (Async Events)](#communication-3--rabbitmq-async-events)
4. [RabbitMQ — Deep Explanation](#4-rabbitmq--deep-explanation)
5. [Auth Service](#5-auth-service)
6. [Product Service](#6-product-service)
7. [Order Service](#7-order-service)
8. [Shared Infrastructure](#8-shared-infrastructure)
9. [Docker & Deployment](#9-docker--deployment)
10. [Full Lifecycle — Place an Order](#10-full-lifecycle--place-an-order)
11. [API Reference](#11-api-reference)
12. [Dependencies](#12-dependencies)

---

## 1. Project Overview

This is a **production-style e-commerce backend** built with a **microservices architecture**. Instead of one giant application, the system is split into 3 independent services — each with its own database, its own logic, and its own responsibility.

### The 3 Services

| Service | Port (REST) | Port (gRPC) | Database | Role |
|---|---|---|---|---|
| `auth-service` | `:3001` | `:50051` | `auth-db` (PostgreSQL) | User registration, login, JWT token validation |
| `product-service` | `:3002` | `:50052` | `product-db` (PostgreSQL) | Product CRUD, stock management |
| `order-service` | `:3003` | `:50053` | `order-db` (PostgreSQL) | Order creation and retrieval |

### Shared Infrastructure

| Component | Port | Role |
|---|---|---|
| **Redis** | `:6379` | In-memory cache (users, products) |
| **RabbitMQ** | `:5672` / `:15672` | Async message broker (order events) |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL CLIENTS                           │
│                    (Browser / Mobile / Postman)                     │
└────────────────┬──────────────────┬──────────────────┬─────────────┘
                 │                  │                  │
         HTTP REST              HTTP REST          HTTP REST
         :3001                  :3002               :3003
                 │                  │                  │
┌────────────────▼──┐  ┌────────────▼────┐  ┌─────────▼────────────┐
│   AUTH-SERVICE    │  │ PRODUCT-SERVICE  │  │   ORDER-SERVICE      │
│                   │  │                  │  │                      │
│  • Register       │  │  • List products │  │  • Create order      │
│  • Login          │  │  • Get product   │  │  • Get my orders     │
│  • Get profile    │  │  • Create product│  │  • Get order by ID   │
│                   │  │  • Update product│  │                      │
│  gRPC Server      │  │  • Delete product│  │  gRPC Server         │
│  :50051           │  │                  │  │  :50053              │
│  ValidateToken    │  │  gRPC Server     │  │  GetOrder            │
│                   │  │  :50052          │  │  GetOrdersByUser     │
│                   │  │  GetProduct      │  │                      │
└────────┬──────────┘  └──────────────────┘  └──────┬──┬────────────┘
         │                       ▲                   │  │
         │                       │ gRPC GetProduct    │  │
         │                       └───────────────────┘  │
         │                                              │
         │◄──── gRPC ValidateToken ─────────────────────┘
         │
┌────────▼─────────┐   ┌───────────────────┐   ┌──────────────────────┐
│    auth-db       │   │   product-db       │   │     order-db         │
│  (PostgreSQL)    │   │   (PostgreSQL)     │   │   (PostgreSQL)       │
│  :5433           │   │   :5435            │   │   :5434              │
│  users table     │   │   products table   │   │   orders table       │
└──────────────────┘   └───────────────────┘   └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        REDIS   :6379                                │
│       auth: "user:<id>" TTL 5m     product: "product:<id>" TTL 10m │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     RABBITMQ   :5672                                │
│   order-service ──PUBLISH──► [order.created] ──CONSUME──► product  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. How Services Communicate

There are **3 different communication patterns** used in this project:

---

### Communication #1 — REST (Client → Service)

Used when **a browser/app/Postman** talks to any service.

```
CLIENT
  │
  │  POST /api/orders
  │  Authorization: Bearer <JWT>
  │  Body: { items: [...] }
  │
  ▼
ORDER-SERVICE (Express HTTP server on :3003)
```

- Format: **JSON over HTTP**
- Style: **Synchronous** — client waits for the response
- Used by: Humans / frontend apps / API tools

---

### Communication #2 — gRPC (Service → Service)

Used when **one service needs data from another service synchronously** (needs to wait for the answer before continuing).

```
ORDER-SERVICE                          AUTH-SERVICE
     │                                      │
     │  gRPC: ValidateToken({ token })      │
     │─────────────────────────────────────►│
     │                                      │  verify JWT
     │  ◄─────────────────────────────────── │
     │  { valid: true, userId: "abc" }      │
     │                                      │
(continue processing)
```

```
ORDER-SERVICE                          PRODUCT-SERVICE
     │                                      │
     │  gRPC: GetProduct({ productId })     │
     │─────────────────────────────────────►│
     │                                      │  check Redis + DB
     │  ◄─────────────────────────────────── │
     │  { name, price, stock }              │
     │                                      │
(calculate total, save order)
```

- Format: **Protobuf (binary)** — faster than JSON
- Style: **Synchronous** — waits for reply
- Defined by: `.proto` files in `/protos/`
- Used by: Services talking to each other

**Why not use REST between services?**
> gRPC is faster (binary vs text), has enforced contracts (`.proto`), supports streaming, and uses HTTP/2 which allows multiplexing.

---

### Communication #3 — RabbitMQ (Async Events)

Used when **a service wants to notify another service** but does NOT need to wait for the result.

```
ORDER-SERVICE                    RABBITMQ BROKER            PRODUCT-SERVICE
     │                               │                           │
     │  publish("order.created",     │                           │
     │    { orderId, items })        │                           │
     │──────────────────────────────►│                           │
     │                               │  store message in queue   │
     │  ← response to client ✅      │                           │
     │  (doesn't wait!)              │──────────────────────────►│
                                                          consume message
                                                          decrement stock
                                                          delete Redis cache
```

- Format: **JSON in a persistent queue**
- Style: **Asynchronous** — fire and forget
- Used by: order-service (publisher) → product-service (consumer)

---

## 4. RabbitMQ — Deep Explanation

### What is RabbitMQ?

RabbitMQ is a **Message Broker** — it's like a **post office** between services.

- **Publisher** = the one who drops a letter in the mailbox
- **Queue** = the mailbox where letters wait
- **Consumer** = the one who picks up and reads the letters

### Core Concepts

#### Queue
A named buffer that stores messages until a consumer is ready to process them.

```
"order.created" queue:
┌─────────────────────────────────────────────────┐
│  [msg1]  [msg2]  [msg3]  ...                    │
└─────────────────────────────────────────────────┘
  oldest ←─────────────────────────── newest
```

#### Publisher
Sends a message to a queue. It does NOT know or care about the consumer.

```typescript
// order-service/src/events/rabbitmq.ts
export const publishEvent = async (queue: string, data: unknown): Promise<void> => {
  await channel.assertQueue(queue, { durable: true }); // create queue if not exists
  channel.sendToQueue(
    queue,
    Buffer.from(JSON.stringify(data)), // convert to binary
    { persistent: true }               // survive RabbitMQ restart
  );
};

// Called like this after saving an order:
await publishEvent('order.created', {
  orderId: order.id,
  items: [{ productId: 'abc', quantity: 2 }]
});
```

#### Consumer
Listens to a queue and processes each message one-by-one.

```typescript
// product-service/src/events/rabbitmq.ts
await channel.consume('order.created', async (msg) => {
  if (msg !== null) {
    const event = JSON.parse(msg.content.toString()); // decode JSON
    // { orderId: "x", items: [{ productId, quantity }] }

    for (const item of event.items) {
      await productService.decrementProductStock(item.productId, item.quantity);
    }

    channel.ack(msg); // ✅ tell RabbitMQ: I processed this, remove it
  }
});
```

#### Acknowledgement (ack)
When a consumer calls `channel.ack(msg)`, it tells RabbitMQ:
> "I successfully processed this message. You can safely delete it."

If the consumer crashes **before acking**, RabbitMQ re-queues the message and delivers it again. This ensures **no messages are lost**.

#### Durability
Both the queue and the messages are marked as **durable/persistent**:

```typescript
channel.assertQueue('order.created', { durable: true });   // queue survives RabbitMQ restart
channel.sendToQueue('order.created', data, { persistent: true }); // message survives too
```

### The Full Message Lifecycle in This Project

```
1. User places an order via POST /api/orders

2. order-service:
   ├─ Validates user via gRPC (auth)
   ├─ Validates products via gRPC (product)
   ├─ Saves order to order-db
   ├─ PUBLISHES to "order.created" queue:
   │   {
   │     orderId: "clx_order_789",
   │     items: [
   │       { productId: "clx_prod_123", quantity: 2 },
   │       { productId: "clx_prod_456", quantity: 1 }
   │     ]
   │   }
   └─ Returns order to the user ✅ (does NOT wait for stock update)

3. RabbitMQ broker:
   └─ Stores message in "order.created" queue

4. product-service consumer (running in background):
   ├─ Receives the message from queue
   ├─ For productId "clx_prod_123": stock -= 2
   ├─ For productId "clx_prod_456": stock -= 1
   ├─ Deletes Redis cache for each product
   ├─ Deletes all "products:list:*" cache keys
   └─ Calls channel.ack(msg) → message removed from queue
```

### Why Not Use gRPC for Stock Decrement?

| Approach | Problem |
|---|---|
| gRPC (sync) | Order creation would be **blocked** waiting for stock update. If product-service is slow, the user waits longer. |
| RabbitMQ (async) | Order returns immediately. Stock update happens in background. If product-service is down, the message **waits in the queue** and is processed when it comes back online. |

### RabbitMQ Connection with Auto-Retry

Both services implement auto-retry if RabbitMQ isn't ready yet:

```typescript
export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('RabbitMQ Connected');
  } catch (err) {
    console.error('RabbitMQ failed, retrying in 5s...');
    setTimeout(() => void connectRabbitMQ(), 5000); // retry after 5 seconds
  }
};
```

---

## 5. Auth Service

**Directory:** `auth-service/`

### What It Does
The auth-service is the **identity provider** of the system. Every service that needs to know "who is this user?" asks auth-service via gRPC.

### Internal Architecture

```
auth-service/src/
│
├── server.ts             ← Entry point: boots Express + gRPC
├── routes/
│   └── authRoutes.ts     ← Defines URL paths
├── middlewares/
│   ├── authMiddleware.ts ← Protects /api/auth/me with local JWT check
│   └── errorHandler.ts   ← Global error catcher
├── controllers/
│   └── authController.ts ← Extracts req body, calls service, sends response
├── services/
│   └── authService.ts    ← Core business logic (JWT, bcrypt, Redis, Prisma)
├── grpc/
│   └── authServer.ts     ← gRPC server: exposes ValidateToken to other services
└── utils/
    └── redisClient.ts    ← Singleton Redis connection
```

### Request Flow (Layer by Layer)

```
HTTP Request → POST /api/auth/login
       │
       ▼
server.ts (Express app)
  - rate limiter: max 20 req/15 min on /api/auth/*
  - authLimiter applied
       │
       ▼
authRoutes.ts
  router.post('/login', login)
       │
       ▼
authController.ts → login()
  - Extract { email, password } from req.body
  - Validate: both fields must exist
  - Call authService.loginUser(email, password)
       │
       ▼
authService.ts → loginUser()
  1. prisma.user.findUnique({ where: { email } })
  2. bcrypt.compare(password, user.password)
  3. jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' })
  4. redis.setex("user:<id>", 300, JSON.stringify(user))
  5. return { token }
       │
       ▼
authController.ts
  res.status(200).json({ success: true, token })
```

### gRPC Server (authServer.ts) — Detailed

This is the **most important part** of auth-service for inter-service communication.

```typescript
// 1. Load the .proto file
const PROTO_PATH = path.join(__dirname, '../../../protos/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,  // don't convert camelCase
  longs: String,   // convert int64 to string
  enums: String,   // convert enums to string names
  defaults: true,  // populate default values
  oneofs: true,    // group oneof fields
});
const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

// 2. The handler function (runs when someone calls ValidateToken)
const validateToken = async (call, callback) => {
  const { token } = call.request; // input from the caller

  if (!token) {
    callback(null, { valid: false, userId: '', error: 'No token provided' });
    return;
  }

  const result = await authService.validateToken(token);
  //  result = { valid: true, userId: "abc", error: "" }
  //      OR = { valid: false, userId: "", error: "Invalid token" }

  callback(null, result); // send response back to caller
};

// 3. Create the gRPC server and register service
const server = new grpc.Server();
server.addService(authProto.auth.AuthService.service, {
  ValidateToken: validateToken   // maps proto method name to handler
});

// 4. Bind to port and start
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), ...);
```

### Token Validation Logic (authService.ts)

```typescript
export const validateToken = async (token: string) => {
  // Step 1: Verify the JWT signature and expiry
  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret123');
  } catch {
    return { valid: false, userId: '', error: 'Invalid token' };
  }

  const userId = decoded.id;

  // Step 2: Check Redis cache first (fast path - avoids DB query)
  const redis = getRedisClient();
  const cachedUser = await redis.get(`user:${userId}`);
  if (cachedUser) {
    return { valid: true, userId, error: '' }; // ← cache HIT, return immediately
  }

  // Step 3: Cache MISS — query the database
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { valid: false, userId: '', error: 'User not found' };
  }

  // Step 4: Store in Redis for next time (5 min TTL)
  await redis.setex(`user:${userId}`, 300, JSON.stringify({
    id: user.id, email: user.email, role: user.role
  }));

  return { valid: true, userId: user.id, error: '' };
};
```

### REST API Endpoints

| Method | Path | Auth Required | Controller | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ No | `register()` | Create account, returns JWT |
| `POST` | `/api/auth/login` | ❌ No | `login()` | Login, returns JWT |
| `GET` | `/api/auth/me` | ✅ Yes (local JWT) | `getMe()` | Get current user profile |
| `GET` | `/health` | ❌ No | inline | Docker health check |

> **Note:** The `/me` endpoint in auth-service uses **local JWT verification** (not gRPC) because it's internal to auth-service itself.

### Rate Limiting

```
Global limiter:  500 req / 60 sec    (all routes)
Auth limiter:     20 req / 15 min    (/api/auth/* only — prevents brute force)
```

### Database Schema

```prisma
// auth-service/prisma/schema.prisma
enum Role {
  USER
  ADMIN
}

model User {
  id        String   @id @default(cuid())  // unique ID like "clx1abc2def3"
  email     String   @unique
  password  String                          // bcrypt hash, never plain text
  role      Role     @default(USER)         // for future role-based access control
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])                          // index for fast login lookup
}
```

### NPM Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP REST API server |
| `@grpc/grpc-js` | gRPC server implementation |
| `@grpc/proto-loader` | Load `.proto` files at runtime |
| `jsonwebtoken` | Create and verify JWT tokens |
| `bcryptjs` | Hash passwords securely |
| `ioredis` | Redis client |
| `@prisma/client` | Type-safe database ORM |
| `express-rate-limit` | Rate limiting middleware |
| `cors` | Enable cross-origin requests |
| `dotenv` | Load `.env` environment variables |

---

## 6. Product Service

**Directory:** `product-service/`

### What It Does
The product-service manages the product catalog. It is the **only source of truth for product data**. It exposes:
- A **REST API** for CRUD operations
- A **gRPC server** so order-service can look up product prices and stock
- A **RabbitMQ consumer** to decrement stock when orders are placed

### Internal Architecture

```
product-service/src/
│
├── server.ts              ← Entry point: boots Express + gRPC + RabbitMQ consumer
├── routes/
│   └── productRoutes.ts   ← Defines URL paths + which need auth
├── middlewares/
│   ├── authMiddleware.ts  ← Calls auth-service via gRPC to protect write routes
│   └── errorHandler.ts   ← Global error catcher
├── controllers/
│   └── productController.ts ← Extracts req data, calls service, sends response
├── services/
│   └── productService.ts  ← All business logic: CRUD, cache, stock
├── grpc/
│   └── productServer.ts   ← gRPC server: exposes GetProduct to order-service
├── events/
│   └── rabbitmq.ts        ← Connects to RabbitMQ, CONSUMES "order.created"
└── utils/
    ├── redisClient.ts     ← Redis singleton connection
    └── prismaClient.ts    ← Prisma singleton connection
```

### Request Flow — GET /api/products (with filters)

```
GET /api/products?category=electronics&minPrice=100&page=2
       │
       ▼
server.ts → productRoutes.ts → getProducts()
       │
       ▼
productController.ts → getProducts()
  - Extract query params from req.query
  - Call productService.getProducts({ category, minPrice, page })
       │
       ▼
productService.ts → getProducts()
  1. Build cacheKey: "products:list:{"category":"electronics",...}"
  2. Redis GET cacheKey
       │
     HIT ▼──────────────────────────────────────► return cached JSON (fast ⚡)
       │ MISS
       ▼
  3. Build Prisma where filter:
       where = { category: "electronics", price: { gte: 100 } }
  4. Apply sorting, pagination (skip, take)
  5. prisma.product.findMany({ where, orderBy, skip, take })
  6. Redis SETEX cacheKey 60 <result>      (cache for 60 seconds)
  7. return { success: true, count: 5, data: [...] }
       │
       ▼
productController.ts
  res.status(200).json(result)
```

### Request Flow — POST /api/products (create product, protected)

```
POST /api/products
Authorization: Bearer <JWT>
Body: { name, price, stock, category, ... }
       │
       ▼
productRoutes.ts: router.post('/', protect, createProduct)
       │
       ▼  (protect middleware runs first)
authMiddleware.ts → protect()
  - Extract token from Authorization header
  - authClient.ValidateToken({ token })  ← gRPC call to auth-service:50051
  - If invalid → 401
  - If valid → req.user = { id: userId }
       │
       ▼
productController.ts → createProduct()
  - Call productService.createProduct(req.body)
       │
       ▼
productService.ts → createProduct()
  1. prisma.product.create({ data: { name, price, stock, ... } })
  2. Invalidate all "products:list:*" cache keys
  3. return product
```

### gRPC Server (productServer.ts) — Detailed

```typescript
// Handler for GetProduct — called by order-service
const getProduct = async (call, callback) => {
  const { productId } = call.request;  // input from order-service

  // getProductById checks Redis first, then PostgreSQL
  const product = await productService.getProductById(productId);

  if (!product) {
    callback(null, {
      success: false, id: '', name: '', price: 0, stock: 0,
      error: 'Product not found'
    });
    return;
  }

  // Send back the full product details
  callback(null, {
    success: true,
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    error: '',
  });
};

// Register handler and start server
server.addService(productProto.product.ProductService.service, {
  GetProduct: getProduct
});
server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), ...);
```

### RabbitMQ Consumer (events/rabbitmq.ts) — Detailed

```typescript
export const connectRabbitMQ = async (): Promise<void> => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();
  const queue = 'order.created';

  // Declare the queue (idempotent — safe to call multiple times)
  await channel.assertQueue(queue, { durable: true });

  // Start consuming messages
  await channel.consume(queue, async (msg) => {
    if (msg !== null && channel) {
      try {
        // Parse the message
        const event: OrderCreatedEvent = JSON.parse(msg.content.toString());
        // event = { orderId: "x", items: [{ productId: "y", quantity: 2 }] }

        // For each item in the order, reduce stock
        for (const item of event.items) {
          await productService.decrementProductStock(item.productId, item.quantity);
          // This does: UPDATE products SET stock = stock - 2 WHERE id = "y"
          // And deletes Redis cache: DEL "product:y"
        }

        // Invalidate all list caches (stock count changed)
        const redis = getRedisClient();
        const listKeys = await redis.keys('products:list:*');
        if (listKeys.length > 0) await redis.del(...listKeys);

        channel.ack(msg); // ✅ Mark as processed
      } catch (err) {
        channel.ack(msg); // Ack even on error to avoid blocking queue
      }
    }
  });
};
```

### REST API Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/products` | ❌ No | List products (supports filters) |
| `GET` | `/api/products/:id` | ❌ No | Get single product |
| `POST` | `/api/products` | ✅ gRPC auth | Create product |
| `PUT` | `/api/products/:id` | ✅ gRPC auth | Update product |
| `DELETE` | `/api/products/:id` | ✅ gRPC auth | Delete product |
| `GET` | `/health` | ❌ No | Docker health check |

### Query Filters for GET /api/products

| Query Param | Type | Example | Description |
|---|---|---|---|
| `page` | number | `?page=2` | Page number (default: 1) |
| `limit` | number | `?limit=20` | Items per page (default: 10) |
| `search` | string | `?search=laptop` | Search in name & description |
| `category` | string | `?category=electronics` | Filter by category |
| `minPrice` | number | `?minPrice=50` | Minimum price |
| `maxPrice` | number | `?maxPrice=500` | Maximum price |
| `sort` | string | `?sort=price:asc` | Sort by field:direction |

### Redis Caching Strategy

```
Individual product:   key = "product:<id>"            TTL = 600s (10 min)
Product lists:        key = "products:list:<query>"   TTL = 60s  (1 min)

Cache is DELETED when:
  - Product is updated  → del "product:<id>" + del "products:list:*"
  - Product is deleted  → del "product:<id>" + del "products:list:*"
  - Order placed (via RabbitMQ) → del "product:<id>" + del "products:list:*"
```

### Database Schema

```prisma
// product-service/prisma/schema.prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Float
  stock       Int
  category    String?
  attributes  Json     @default("{}")  // flexible key-value extra data
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### NPM Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP REST API server |
| `@grpc/grpc-js` | gRPC server implementation |
| `@grpc/proto-loader` | Load `.proto` files at runtime |
| `amqplib` | RabbitMQ client (AMQP protocol) |
| `ioredis` | Redis client |
| `@prisma/client` | Type-safe database ORM |
| `express-rate-limit` | Rate limiting (1000 req/min — read-heavy) |
| `cors` | Enable cross-origin requests |
| `dotenv` | Load `.env` environment variables |

---

## 7. Order Service

**Directory:** `order-service/`

### What It Does
The order-service is the most **connected** service — it talks to every other component:
- Calls **auth-service** via gRPC to verify the user's JWT on every request
- Calls **product-service** via gRPC to get product details and validate stock
- Saves orders to **order-db** (PostgreSQL)
- Publishes to **RabbitMQ** after each successful order
- Exposes its own **gRPC server** for querying orders

### Internal Architecture

```
order-service/src/
│
├── server.ts               ← Entry point: boots Express + gRPC + RabbitMQ publisher
├── routes/
│   └── orderRoutes.ts      ← Defines URL paths (all protected)
├── middlewares/
│   ├── authMiddleware.ts   ← Calls auth-service gRPC to verify JWT on every request
│   └── errorHandler.ts    ← Global error catcher
├── controllers/
│   └── orderController.ts  ← Extracts req data, calls service, sends response
├── services/
│   └── orderService.ts     ← Core logic: validate products, calculate total, save order
├── grpc/
│   ├── orderServer.ts      ← gRPC SERVER: exposes GetOrder, GetOrdersByUser
│   └── grpcClients.ts      ← gRPC CLIENTS: connects to auth + product services
├── events/
│   └── rabbitmq.ts         ← PUBLISHES "order.created" to RabbitMQ
└── types/
    └── express.d.ts        ← TypeScript type extension (adds req.user)
```

### Request Flow — POST /api/orders (full detail)

```
POST /api/orders
Authorization: Bearer eyJhbGci...
Body: {
  "items": [
    { "productId": "clx_prod_123", "quantity": 2 },
    { "productId": "clx_prod_456", "quantity": 1 }
  ]
}

━━━━━ LAYER 1: server.ts ━━━━━
  - Express app receives request
  - Rate limiter: max 300 req/min
  - Route matched: POST /api/orders

━━━━━ LAYER 2: authMiddleware.ts ━━━━━
  protect() function:
  1. Extract token from "Authorization: Bearer ..." header
  2. If no token → 401 Unauthorized (stop here)
  3. authClient.ValidateToken({ token }) ← gRPC CALL to auth-service:50051
  4. Wait for gRPC response:
     - If { valid: false } → 401 (stop here)
     - If { valid: true, userId: "clx_user_456" } → continue
  5. req.user = { id: "clx_user_456" }
  6. next() → go to controller

━━━━━ LAYER 3: orderController.ts ━━━━━
  createOrder():
  1. Extract items from req.body
  2. Validate: items must be a non-empty array
  3. Call orderService.createOrder(req.user.id, items)
  4. On success → res.status(201).json({ success: true, data: order })
  5. On "not found" / "insufficient stock" → 400 error

━━━━━ LAYER 4: orderService.ts ━━━━━
  createOrder(userId, items):
  1. Loop through each item:
     a. getProductDetails(item.productId) ← gRPC CALL to product-service:50052
     b. If !response.success → throw Error("Product X not found")
     c. If response.stock < item.quantity → throw Error("Insufficient stock")
     d. totalAmount += response.price * item.quantity
     e. Push validated item (productId, quantity, price)

  2. prisma.order.create({
       data: {
         userId,
         totalAmount,
         status: 'COMPLETED',
         items: { create: validatedItems }  // nested write
       }
     })

  3. publishEvent('order.created', {
       orderId: order.id,
       items: validatedItems  // contains { productId, quantity, price }
     })

  4. return order

━━━━━ RESPONSE ━━━━━
  {
    "success": true,
    "data": {
      "id": "clx_order_789",
      "userId": "clx_user_456",
      "totalAmount": 1999.98,
      "status": "COMPLETED",
      "items": [
        { "productId": "clx_prod_123", "quantity": 2, "price": 999.99 },
        { "productId": "clx_prod_456", "quantity": 1, "price": 0 }
      ]
    }
  }
```

### gRPC Clients (grpcClients.ts) — Detailed

```typescript
// Load auth.proto and create a client pointing to auth-service
const authProto = grpc.loadPackageDefinition(
  protoLoader.loadSync('protos/auth.proto', { ... })
) as any;

export const authClient = new authProto.auth.AuthService(
  process.env.AUTH_GRPC_URL || 'localhost:50051',  // Docker: "auth-service:50051"
  grpc.credentials.createInsecure()                // no TLS (internal network)
);

// Load product.proto and create a client pointing to product-service
const productProto = grpc.loadPackageDefinition(
  protoLoader.loadSync('protos/product.proto', { ... })
) as any;

export const productClient = new productProto.product.ProductService(
  process.env.PRODUCT_GRPC_URL || 'localhost:50052', // Docker: "product-service:50052"
  grpc.credentials.createInsecure()
);

// Wrapper: converts callback-style gRPC to a Promise (easier to use with async/await)
export const getProductDetails = (productId: string): Promise<ProductResponse> => {
  return new Promise((resolve, reject) => {
    productClient.GetProduct(
      { productId },                        // request payload
      (err: Error | null, response) => {    // callback when response arrives
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
};
```

### Auth Middleware in Order Service (authMiddleware.ts)

```typescript
// This runs before EVERY order route handler
export const protect = (req, res, next): void => {
  // Step 1: Get token
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>" → "<token>"
  if (!token) {
    res.status(401).json({ error: 'Not authorized' });
    return;
  }

  // Step 2: Call auth-service via gRPC
  authClient.ValidateToken({ token }, (err, response) => {
    if (err || !response.valid) {
      res.status(401).json({ error: response?.error || 'Not authorized' });
      return;
    }
    // Step 3: Attach user info to request
    req.user = { id: response.userId };
    next(); // go to controller
  });
};
```

### gRPC Server (orderServer.ts) — Exposes Orders to Other Services

```typescript
// Two handlers:

// 1. GetOrder — find a specific order by ID
const getOrder = async (call, callback) => {
  const { orderId } = call.request;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  callback(null, order
    ? { success: true, id: order.id, userId: order.userId, ... }
    : { success: false, error: 'Order not found' }
  );
};

// 2. GetOrdersByUser — find all orders for a user
const getOrdersByUser = async (call, callback) => {
  const { userId } = call.request;
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,                          // max 50 orders per query
  });
  callback(null, {
    success: true,
    orders: orders.map(o => ({ id: o.id, userId: o.userId, ... })),
    error: '',
  });
};

// Register both handlers
server.addService(orderProto.order.OrderService.service, {
  GetOrder: getOrder,
  GetOrdersByUser: getOrdersByUser,
});
server.bindAsync('0.0.0.0:50053', ...);
```

### REST API Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/orders` | ✅ gRPC auth | Create a new order |
| `GET` | `/api/orders` | ✅ gRPC auth | Get all orders for current user |
| `GET` | `/api/orders/:id` | ✅ gRPC auth | Get specific order (must belong to user) |
| `GET` | `/health` | ❌ No | Docker health check |

### Security: Order Isolation

When fetching a single order, the service ensures the order **belongs to the requesting user**:

```typescript
// orderService.ts
export const getOrderByIdAndUser = async (orderId: string, userId: string) => {
  return await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,           // ← BOTH conditions must match
    },
    include: { items: true },
  });
};
// If orderId is valid but userId doesn't match → returns null → 404
// This prevents user A from seeing user B's orders
```

### Database Schema

```prisma
// order-service/prisma/schema.prisma
enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
}

model Order {
  id          String      @id @default(cuid())
  userId      String                            // references User in auth-db
  totalAmount Float
  status      OrderStatus @default(PENDING)
  items       OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([userId])              // fast lookup: "my orders"
  @@index([status])              // fast lookup: "all pending orders"
  @@index([createdAt])           // fast sort by date
  @@index([userId, createdAt])   // most common: "my orders sorted by date"
}

model OrderItem {
  id        String @id @default(cuid())
  productId String              // references Product in product-db
  quantity  Int
  price     Float               // price at time of order (snapshot!)
  orderId   String
  order     Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([productId])
}
```

> **Important:** The `price` in `OrderItem` is a **snapshot** of the product price at the time of order. If the product price changes later, old orders are unaffected.

### NPM Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP REST API server |
| `@grpc/grpc-js` | gRPC (server + client) |
| `@grpc/proto-loader` | Load `.proto` files at runtime |
| `amqplib` | RabbitMQ client (publish events) |
| `@prisma/client` | Type-safe database ORM |
| `express-rate-limit` | Rate limiting (300 req/min — write-heavy) |
| `cors` | Enable cross-origin requests |
| `dotenv` | Load `.env` environment variables |

---

## 8. Shared Infrastructure

### Redis (ioredis)

Both `auth-service` and `product-service` use Redis as a **read-through cache**.

**Singleton pattern** — one connection per service, reused everywhere:

```typescript
let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => Math.min(times * 100, 3000), // exponential backoff
      lazyConnect: true,        // don't connect until first use
      maxRetriesPerRequest: 3,  // fail fast on errors
    });
  }
  return redis;
};
```

**All cache keys:**

| Key Pattern | Service | TTL | Content |
|---|---|---|---|
| `user:<userId>` | auth | 300s | `{ id, email, role }` |
| `product:<id>` | product | 600s | Full product object |
| `products:list:<query>` | product | 60s | `{ success, count, data: [...] }` |

### Proto Files (Shared via Docker Volume)

All three `.proto` files are in `/protos/` and mounted into every container:

```yaml
# docker-compose.yml
volumes:
  - ./protos:/usr/src/app/protos
```

This ensures all services use the **exact same contract** — no version mismatch.

```
protos/
├── auth.proto      → AuthService { ValidateToken }
├── product.proto   → ProductService { GetProduct }
└── order.proto     → OrderService { GetOrder, GetOrdersByUser }
```

### Error Handling (errorHandler.ts)

All services share the same error handler pattern:

```typescript
const errorHandler = (err: Error, req, res, next): void => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[Error] ${err.message}`);
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
};
// Registered last: app.use(errorHandler)
```

---

## 9. Docker & Deployment

### Container Map

```
Container           Image                   Ports
─────────────────────────────────────────────────────────
rabbitmq            rabbitmq:3-management   5672, 15672
redis               redis:7-alpine          6379
auth-db             postgres:15-alpine      5433→5432
product-db          postgres:15-alpine      5435→5432
order-db            postgres:15-alpine      5434→5432
auth-service        ./auth-service          3001, 50051
product-service     ./product-service       3002, 50052
order-service       ./order-service         3003, 50053
```

### Startup Order

Docker Compose waits for health checks before starting dependent services:

```
Step 1: auth-db, order-db, product-db, redis, rabbitmq
         (all start in parallel, each with health checks)

Step 2: auth-service
         (waits for: auth-db ✅ + redis ✅)

Step 3: product-service
         (waits for: product-db ✅ + rabbitmq ✅ + redis ✅ + auth-service ✅)

Step 4: order-service
         (waits for: order-db ✅ + rabbitmq ✅ + redis ✅ + auth-service ✅ + product-service ✅)
```

### Environment Variables

**auth-service:**
```env
PORT=3001
GRPC_PORT=50051
DATABASE_URL=postgresql://auth_user:auth_password@auth-db:5432/auth_db
JWT_SECRET=supersecret123_change_in_production
REDIS_HOST=redis
REDIS_PORT=6379
```

**product-service:**
```env
PORT=3002
GRPC_PORT=50052
DATABASE_URL=postgresql://product_user:product_password@product-db:5432/product_db
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
AUTH_GRPC_URL=auth-service:50051
REDIS_HOST=redis
REDIS_PORT=6379
```

**order-service:**
```env
PORT=3003
GRPC_PORT=50053
DATABASE_URL=postgresql://order_user:order_password@order-db:5432/order_db
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
AUTH_GRPC_URL=auth-service:50051
PRODUCT_GRPC_URL=product-service:50052
REDIS_HOST=redis
REDIS_PORT=6379
```

### Run the Project

```bash
# Start all services
docker-compose up --build

# Stop all services
docker-compose down

# Rebuild a specific service
docker-compose up --build auth-service

# View logs for a specific service
docker-compose logs -f order-service

# Access RabbitMQ management UI
open http://localhost:15672  # login: user / password
```

---

## 10. Full Lifecycle — Place an Order

This traces every single step when a user places an order.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST http://localhost:3003/api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImNseF91c2VyIn0.abc
Content-Type: application/json

{
  "items": [
    { "productId": "clx_prod_laptop", "quantity": 1 },
    { "productId": "clx_prod_mouse", "quantity": 2 }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — order-service receives request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rate limiter: 300/min — OK ✅
Route match: POST /api/orders → [protect, createOrder]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — authMiddleware.protect()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Token extracted: "eyJhbGciOiJIUzI1NiJ9..."

gRPC call → auth-service:50051
  Request:  ValidateToken({ token: "eyJ..." })
  auth-service internally:
    → jwt.verify(token) → decoded: { id: "clx_user_456" }
    → Redis GET "user:clx_user_456" → HIT! (cached)
    → return { valid: true, userId: "clx_user_456", error: "" }
  Response: { valid: true, userId: "clx_user_456" }

req.user = { id: "clx_user_456" }
next() called → go to controller

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — orderController.createOrder()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
items = [{ productId: "clx_prod_laptop", quantity: 1 }, ...]
userId = "clx_user_456"
Call orderService.createOrder(userId, items)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — orderService.createOrder() — Item 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
gRPC call → product-service:50052
  Request:  GetProduct({ productId: "clx_prod_laptop" })
  product-service internally:
    → Redis GET "product:clx_prod_laptop" → MISS
    → prisma.product.findUnique({ where: { id: "clx_prod_laptop" } })
    → Returns: { name: "Laptop Pro", price: 1299.99, stock: 5 }
    → Redis SETEX "product:clx_prod_laptop" 600 <json>
    → return { success: true, name: "Laptop Pro", price: 1299.99, stock: 5 }
  Response: { success: true, price: 1299.99, stock: 5 }

Check: stock(5) >= quantity(1) ✅
totalAmount += 1299.99 × 1 = 1299.99
validatedItems.push({ productId, quantity: 1, price: 1299.99 })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — orderService.createOrder() — Item 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
gRPC call → product-service:50052
  GetProduct({ productId: "clx_prod_mouse" })
  → { success: true, name: "Wireless Mouse", price: 29.99, stock: 100 }

Check: stock(100) >= quantity(2) ✅
totalAmount += 29.99 × 2 = 59.98
totalAmount = 1299.99 + 59.98 = 1359.97
validatedItems.push({ productId, quantity: 2, price: 29.99 })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — Save order to database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
prisma.order.create({
  data: {
    userId: "clx_user_456",
    totalAmount: 1359.97,
    status: "COMPLETED",
    items: {
      create: [
        { productId: "clx_prod_laptop", quantity: 1, price: 1299.99 },
        { productId: "clx_prod_mouse",  quantity: 2, price: 29.99   }
      ]
    }
  }
})
→ order.id = "clx_order_abc123"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — Publish event to RabbitMQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
publishEvent('order.created', {
  orderId: "clx_order_abc123",
  items: [
    { productId: "clx_prod_laptop", quantity: 1, price: 1299.99 },
    { productId: "clx_prod_mouse",  quantity: 2, price: 29.99 }
  ]
})
→ Message stored in RabbitMQ queue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE (returned to user immediately) ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTTP 201 Created
{
  "success": true,
  "data": {
    "id": "clx_order_abc123",
    "userId": "clx_user_456",
    "totalAmount": 1359.97,
    "status": "COMPLETED",
    "items": [
      { "productId": "clx_prod_laptop", "quantity": 1, "price": 1299.99 },
      { "productId": "clx_prod_mouse",  "quantity": 2, "price": 29.99 }
    ]
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — Async: product-service processes event
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(happens separately, user already got their response)

RabbitMQ delivers message to product-service consumer:
  For "clx_prod_laptop": stock 5 → 4, DELETE Redis "product:clx_prod_laptop"
  For "clx_prod_mouse":  stock 100 → 98, DELETE Redis "product:clx_prod_mouse"
  DELETE Redis keys matching "products:list:*"
  channel.ack(msg) → message removed from queue ✅
```

---

## 11. API Reference

### Auth Service — Base URL: `http://localhost:3001`

#### POST /api/auth/register
```json
// Request Body
{ "email": "user@example.com", "password": "mypassword123" }

// Response 201
{ "success": true, "token": "eyJhbGci..." }

// Response 400
{ "success": false, "error": "User already exists" }
```

#### POST /api/auth/login
```json
// Request Body
{ "email": "user@example.com", "password": "mypassword123" }

// Response 200
{ "success": true, "token": "eyJhbGci..." }

// Response 401
{ "success": false, "error": "Invalid credentials" }
```

#### GET /api/auth/me
```
Headers: Authorization: Bearer <token>

// Response 200
{ "success": true, "data": { "id": "clx...", "email": "...", "role": "USER" } }
```

---

### Product Service — Base URL: `http://localhost:3002`

#### GET /api/products
```
// Optional query params: page, limit, search, category, minPrice, maxPrice, sort

// Response 200
{
  "success": true,
  "count": 3,
  "data": [
    { "id": "clx...", "name": "Laptop", "price": 999.99, "stock": 10, ... }
  ]
}
```

#### GET /api/products/:id
```json
// Response 200
{ "success": true, "data": { "id": "clx...", "name": "Laptop", "price": 999.99 } }

// Response 404
{ "success": false, "error": "Product not found" }
```

#### POST /api/products
```
Headers: Authorization: Bearer <token>
Body: { "name": "Laptop", "price": 999.99, "stock": 10, "category": "electronics" }

// Response 201
{ "success": true, "data": { "id": "clx...", ... } }
```

#### PUT /api/products/:id
```
Headers: Authorization: Bearer <token>
Body: { "price": 899.99, "stock": 15 }

// Response 200
{ "success": true, "data": { "id": "clx...", "price": 899.99, ... } }
```

#### DELETE /api/products/:id
```
Headers: Authorization: Bearer <token>

// Response 200
{ "success": true, "data": {} }
```

---

### Order Service — Base URL: `http://localhost:3003`

#### POST /api/orders
```
Headers: Authorization: Bearer <token>
Body:
{
  "items": [
    { "productId": "clx...", "quantity": 2 },
    { "productId": "clx...", "quantity": 1 }
  ]
}

// Response 201
{
  "success": true,
  "data": {
    "id": "clx_order...",
    "userId": "clx_user...",
    "totalAmount": 1359.97,
    "status": "COMPLETED",
    "items": [ ... ]
  }
}

// Response 400
{ "success": false, "error": "Insufficient stock for product Laptop" }
```

#### GET /api/orders
```
Headers: Authorization: Bearer <token>

// Response 200
{ "success": true, "count": 3, "data": [ { "id": "...", ... } ] }
```

#### GET /api/orders/:id
```
Headers: Authorization: Bearer <token>

// Response 200
{ "success": true, "data": { "id": "...", "items": [...] } }

// Response 404 (or not owned by user)
{ "success": false, "error": "Order not found" }
```

---

## 12. Dependencies

### Shared across all services

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP web server |
| `@grpc/grpc-js` | ^1.14.4 | gRPC implementation for Node.js |
| `@grpc/proto-loader` | ^0.8.1 | Load `.proto` files dynamically at runtime |
| `@prisma/client` | ^6.4.0 | Type-safe PostgreSQL ORM |
| `cors` | ^2.8.6 | Enable cross-origin HTTP requests |
| `dotenv` | ^17.4.2 | Load environment variables from `.env` |
| `express-rate-limit` | ^7.5.0 | Rate limiting middleware |
| `typescript` | ^5.8.3 | Type-safe JavaScript |
| `ts-node` | ^10.9.2 | Run TypeScript directly without build step |
| `nodemon` | ^3.1.10 | Auto-restart on file changes (dev) |
| `prisma` | ^6.4.0 | Database migrations and schema generation |

### auth-service only

| Package | Purpose |
|---|---|
| `jsonwebtoken` | Create and verify JWT tokens |
| `bcryptjs` | Securely hash passwords |
| `ioredis` | Redis client (Node.js) |

### product-service only

| Package | Purpose |
|---|---|
| `amqplib` | AMQP client to connect to RabbitMQ |
| `ioredis` | Redis client (Node.js) |

### order-service only

| Package | Purpose |
|---|---|
| `amqplib` | AMQP client to connect to RabbitMQ |

---

*Last updated: September 2026 | Stack: TypeScript · Node.js · Express · gRPC · Prisma · PostgreSQL · Redis · RabbitMQ · Docker*
