import { credentials } from '@grpc/grpc-js';
import type { Client, ServiceError, Metadata } from '@grpc/grpc-js';
import { loadAuth, loadProduct, loadOrder } from '@ecommerce/proto-gen';

export interface TokenResult {
  valid: boolean;
  userId: string;
  role: string;
  error: string;
}
export interface ProductResult {
  success: boolean;
  id: string;
  name: string;
  price: number;
  stock: number;
  error: string;
}
export interface OrderResult {
  success: boolean;
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  error: string;
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
  validateToken(this: void, token: string, context: Metadata): Promise<TokenResult>;
  login(this: void, input: Credentials, context: Metadata): Promise<SessionResult>;
  register(this: void, input: Credentials, context: Metadata): Promise<SessionResult>;
  refresh(this: void, refreshToken: string, context: Metadata): Promise<TokensResult>;
  product(this: void, productId: string, context: Metadata): Promise<ProductResult>;
  order(this: void, orderId: string, context: Metadata): Promise<OrderResult>;
  orders(
    this: void,
    userId: string,
    context: Metadata,
  ): Promise<{ success: boolean; orders: OrderResult[]; error: string }>;
}

export function createBackend(options: {
  identity: string;
  catalog: string;
  order: string;
  timeoutMs?: number;
}): GatewayBackend & { close(): void; ready(): Promise<void> } {
  const auth = new (loadAuth().auth.v1.AuthService)(options.identity, credentials.createInsecure());
  const product = new (loadProduct().product.v1.ProductService)(
    options.catalog,
    credentials.createInsecure(),
  );
  const order = new (loadOrder().order.v1.OrderService)(
    options.order,
    credentials.createInsecure(),
  );
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
    validateToken: (token, meta) =>
      call((cb) => {
        auth.ValidateToken({ token }, meta, { deadline: deadline() }, cb);
      }),
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
    orders: (userId, meta) =>
      call((cb) => {
        order.GetOrdersByUser({ userId }, meta, { deadline: deadline() }, cb);
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
