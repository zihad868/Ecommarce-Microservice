import { getClientCredentials } from '@ecommerce/grpc-kit';
import type { Client, ServiceError, Metadata } from '@grpc/grpc-js';
import { loadAuthV2, loadProduct, loadOrderV2 } from '@ecommerce/proto-gen';
import type { OrderV2Status } from '@ecommerce/proto-gen';

export interface TokenResult {
  valid: boolean;
  userId: string;
  role: string;
  error: string;
}
export interface Money {
  amount_minor?: string | number;
  amount?: string;
  currency?: string;
}
export interface ProductResult {
  id: string;
  name: string;
  price?: Money | null;
  stock: number;
  category?: string;
  description?: string;
}
export interface PageInfo {
  total?: number;
  nextCursor?: string;
}
export interface OrderResult {
  id: string;
  userId: string;
  total: Money | null;
  items: { productId: string; quantity: number; price: Money | null }[];
  status: string;
}
export interface SessionResult {
  user: { id: string; email: string; role: string } | null;
  tokens: TokensResult | null;
}
export interface TokensResult {
  accessToken: string;
  refreshToken: string;
}
export interface Credentials {
  email: string;
  password: string;
}
export interface GatewayBackend {
  logout(this: void, refreshToken: string, context: Metadata): Promise<unknown>;
  me(this: void, context: Metadata): Promise<{ id: string; email: string; role: string }>;
  createOrder(
    this: void,
    items: { productId: string; quantity: number }[],
    key: string,
    context: Metadata,
  ): Promise<OrderResult>;
  updateOrder(
    this: void,
    orderId: string,
    status: OrderV2Status,
    context: Metadata,
  ): Promise<OrderResult>;
  products(
    this: void,
    query: { category?: string; search?: string; limit?: number; cursor?: string } | string,
    context: Metadata,
  ): Promise<{ products: ProductResult[]; page?: PageInfo | null; metaJson?: string }>;
  mutateProduct(
    this: void,
    action: 'create' | 'update' | 'delete',
    id: string,
    data: string,
    context: Metadata,
  ): Promise<unknown>;

  validateToken(this: void, token: string, context: Metadata): Promise<TokenResult>;
  login(this: void, input: Credentials, context: Metadata): Promise<SessionResult>;
  register(this: void, input: Credentials, context: Metadata): Promise<SessionResult>;
  refresh(this: void, refreshToken: string, context: Metadata): Promise<TokensResult>;
  product(this: void, productId: string, context: Metadata): Promise<ProductResult>;
  order(this: void, orderId: string, context: Metadata): Promise<OrderResult>;
  orders(
    this: void,
    userId: string,
    pagination: { limit?: number; cursor?: string } | undefined,
    context: Metadata,
  ): Promise<{ orders: OrderResult[]; nextCursor?: string }>;
}

export function createBackend(options: {
  identity: string;
  catalog: string;
  order: string;
  timeoutMs?: number;
  verifyToken?: (token: string) => Promise<TokenResult>;
}): GatewayBackend & { close(): void; ready(): Promise<void> } {
  const auth = new (loadAuthV2().auth.v2.AuthService)(options.identity, getClientCredentials());
  const product = new (loadProduct().product.v1.ProductService)(
    options.catalog,
    getClientCredentials(),
  );
  const order = new (loadOrderV2().order.v2.OrderService)(options.order, getClientCredentials());
  const clients: Client[] = [auth, product, order];
  const deadline = () => new Date(Date.now() + (options.timeoutMs ?? 3000));
  function call<T>(
    invoke: (callback: (error: ServiceError | null, response?: T) => void) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) =>
      invoke((error, response) => {
        if (error) reject(error);
        else if (response === undefined) reject(new Error('Empty gRPC response'));
        else resolve(response);
      }),
    );
  }
  return {
    logout: (refreshToken, meta) =>
      call((cb) => {
        auth.Logout({ refreshToken }, meta, { deadline: deadline() }, cb);
      }),
    me: (meta) =>
      call((cb) => {
        auth.GetUser({}, meta, { deadline: deadline() }, cb);
      }),
    createOrder: (items, idempotencyKey, meta) =>
      call((cb) => {
        order.CreateOrder({ items, idempotencyKey }, meta, { deadline: deadline() }, cb);
      }),
    updateOrder: (orderId, status, meta) =>
      call((cb) => {
        order.UpdateOrderStatus({ orderId, status }, meta, { deadline: deadline() }, cb);
      }),
    products: (query, meta) =>
      call((cb) => {
        const req =
          typeof query === 'string'
            ? { queryJson: query }
            : {
                category: query.category,
                search: query.search,
                limit: query.limit,
                cursor: query.cursor,
              };
        product.ListProducts(req, meta, { deadline: deadline() }, cb);
      }),
    mutateProduct: (action, productId, dataJson, meta) =>
      call((cb) => {
        if (action === 'delete')
          product.DeleteProduct({ productId }, meta, { deadline: deadline() }, cb);
        else if (action === 'create')
          product.CreateProduct({ productId, dataJson }, meta, { deadline: deadline() }, cb);
        else product.UpdateProduct({ productId, dataJson }, meta, { deadline: deadline() }, cb);
      }),
    validateToken: (token) => {
      if (!options.verifyToken) throw new Error('Local JWT verifier is required');
      return options.verifyToken(token);
    },
    login: (input, meta) =>
      call((cb) => {
        auth.Login(input, meta, { deadline: deadline() }, cb);
      }),
    register: (input, meta) =>
      call((cb) => {
        auth.Register(input, meta, { deadline: deadline() }, cb);
      }),
    refresh: (refreshToken, meta) =>
      call((cb) => {
        auth.Refresh({ refreshToken }, meta, { deadline: deadline() }, cb);
      }),
    product: (productId, meta) =>
      call((cb) => {
        product.GetProduct({ productId }, meta, { deadline: deadline() }, cb);
      }),
    order: (orderId, meta) =>
      call((cb) => {
        order.GetOrder({ orderId }, meta, { deadline: deadline() }, cb);
      }),
    orders: (userId, pagination, meta) =>
      call((cb) => {
        order.GetOrdersByUser(
          { userId, limit: pagination?.limit, cursor: pagination?.cursor },
          meta,
          { deadline: deadline() },
          cb,
        );
      }),
    close: () => {
      for (const client of clients) client.close();
    },
    ready: async () => {
      await Promise.all(
        clients.map(
          (client) =>
            new Promise<void>((resolve, reject) => {
              client.waitForReady(deadline(), (error) => (error ? reject(error) : resolve()));
            }),
        ),
      );
    },
  };
}
