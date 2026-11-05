# Gateway API

The gateway listens on `http://localhost:8081` in Compose. Successful API
responses use `{ "success": true, "data": ... }` (logout returns only `success`).
Errors now use an object instead of the previous string:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock",
    "details": { "productId": "p1", "available": 1, "requested": 2 },
    "requestId": "request-uuid"
  }
}
```

`details` is optional. Frontends must read `error.message` for display and
`error.code` for behavior. Coordinate this response change before release.
`x-request-id` and `x-correlation-id` are echoed in response headers; a missing
correlation ID is generated and forwarded to gRPC. Internal error messages and
details are withheld from clients and logged with request context.

| Method | Path                     | Authentication                           | RPC                                       |
| ------ | ------------------------ | ---------------------------------------- | ----------------------------------------- |
| POST   | `/api/auth/register`     | Public                                   | `auth.v2.AuthService.Register`            |
| POST   | `/api/auth/login`        | Public                                   | `auth.v2.AuthService.Login`               |
| POST   | `/api/auth/refresh`      | Refresh token in body                    | `auth.v2.AuthService.Refresh`             |
| POST   | `/api/auth/logout`       | Bearer token                             | `auth.v2.AuthService.Logout`              |
| GET    | `/api/auth/me`           | Bearer token                             | `auth.v2.AuthService.GetUser`             |
| GET    | `/api/products`          | Public                                   | `product.v1.ProductService.ListProducts`  |
| GET    | `/api/products/:id`      | Public                                   | `product.v1.ProductService.GetProduct`    |
| POST   | `/api/products`          | ADMIN                                    | `product.v1.ProductService.CreateProduct` |
| PATCH  | `/api/products/:id`      | ADMIN                                    | `product.v1.ProductService.UpdateProduct` |
| DELETE | `/api/products/:id`      | ADMIN                                    | `product.v1.ProductService.DeleteProduct` |
| POST   | `/api/orders`            | Bearer token                             | `order.v2.OrderService.CreateOrder`       |
| GET    | `/api/orders`            | Bearer token                             | `order.v2.OrderService.GetOrdersByUser`   |
| GET    | `/api/orders/:id`        | Owner or ADMIN                           | `order.v2.OrderService.GetOrder`          |
| PATCH  | `/api/orders/:id/status` | Owner cancellation or ADMIN              | `order.v2.OrderService.UpdateOrderStatus` |
| POST   | `/api/orders/:id/pay`    | Owner or ADMIN; development mock enabled | `order.v2.OrderService.PayOrder`          |

Register/login accept `{ "email": "customer@example.com", "password": "..." }`.
Registration enforces the service password policy. Refresh accepts
`{ "refreshToken": "..." }`. Sessions contain `user` and `tokens`.

Order creation accepts `{ "items": [{ "productId": "p1", "quantity": 1 }] }`
and an optional `Idempotency-Key` header. Order responses now contain `id`,
`userId`, enum `status`, `total: { amount_minor: "1000", currency: "USD" }`,
and `items` with product IDs, quantities and unit `price` in the same Money
shape. `amount_minor` is a decimal string to preserve int64 precision. This
replaces `totalAmount` and nested `success`/`error` fields. Current persistence
still uses Decimal USD; the currency-aware storage migration is Part C.
Order listing returns `data` and `nextCursor` with a default limit of 50.

Both v1 and v2 gRPC endpoints remain available. Deploy identity/order services
with v2 support before deploying the updated gateway. Existing v1 schemas and
the Buf compatibility baseline remain unchanged.

| Error code                                                        | HTTP status |
| ----------------------------------------------------------------- | ----------- |
| `VALIDATION_ERROR`, `INVALID_JSON`                                | 400         |
| `UNAUTHENTICATED`                                                 | 401         |
| `FORBIDDEN`                                                       | 403         |
| `NOT_FOUND`, `ROUTE_NOT_FOUND`                                    | 404         |
| `INSUFFICIENT_STOCK`, `ALREADY_EXISTS`, `CONCURRENT_MODIFICATION` | 409         |
| `PAYLOAD_TOO_LARGE`                                               | 413         |
| `IDEMPOTENCY_KEY_REUSED`                                          | 422         |
| `HTTP_429`                                                        | 429         |
| `INTERNAL`                                                        | 500         |
| `DEPENDENCY_UNAVAILABLE`                                          | 503         |

Legacy ApiError callers use `HTTP_<status>`; gRPC failures without domain
metadata use `UPSTREAM_ERROR`. Deadlines map to 504, unavailable services to 503. The mock payment route returns 501 unless `ENABLE_MOCK_PAYMENTS=true`
and the gateway is outside production; order-service also rejects it in
production. Unknown routes return `ROUTE_NOT_FOUND`.

`/health/live` and `/health/ready` retain operations status responses. Readiness
checks gRPC connectivity. Metrics use the internal gateway listener on port
9081, which Compose does not publish.
