# Gateway API

The gateway listens on `http://localhost:8081` in Compose. Responses use
`{ "success": true, "data": ... }` or `{ "success": false, "error": ... }`.

| Method | Path                 | Authentication        | gRPC operation                          |
| ------ | -------------------- | --------------------- | --------------------------------------- |
| POST   | `/api/auth/register` | Public                | `auth.v1.AuthService.Register`          |
| POST   | `/api/auth/login`    | Public                | `auth.v1.AuthService.Login`             |
| POST   | `/api/auth/refresh`  | Refresh token in body | `auth.v1.AuthService.Refresh`           |
| GET    | `/api/products/:id`  | Public                | `product.v1.ProductService.GetProduct`  |
| GET    | `/api/orders`        | Bearer token          | `order.v1.OrderService.GetOrdersByUser` |
| GET    | `/api/orders/:id`    | Owner or ADMIN        | `order.v1.OrderService.GetOrder`        |

Register/login accept `{ "email": "customer@example.com", "password": "..." }`.
Registration enforces the existing service password policy. Refresh accepts
`{ "refreshToken": "..." }`. Successful sessions contain `user` and `tokens`.
Order list returns up to 50 records from the existing gRPC query.

`/health/live` and `/health/ready` are operations endpoints. Gateway readiness
checks gRPC connectivity to all three services and Redis. Metrics are on the
internal gateway listener at port 9081; Compose does not publish it to the host.

Product listing/administration, order creation/status/payment, user profile and
logout currently use the existing service REST endpoints on 3001–3003. The
gateway returns 404 for those unmigrated routes. Kubernetes ingress routes only
to the gateway, so those commands need internal access until their typed RPCs
are implemented. The archived OpenAPI document describes the legacy REST API,
not gateway coverage.
