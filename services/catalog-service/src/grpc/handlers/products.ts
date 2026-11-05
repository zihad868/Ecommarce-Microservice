import { unary, requireAdmin } from '@ecommerce/grpc-kit';
import { ValidationError, NotFoundError } from '@ecommerce/errors';
import type { ProductServiceHandlers } from '@ecommerce/proto-gen';
import * as products from '../../services/productService';
import * as stock from '../../services/stockService';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from '../../validators/productValidators';
import type { Product } from '../../utils/prismaClient';

const toProductProto = (product: Product) => ({
  id: product.id,
  name: product.name,
  price: {
    amount: product.price.toString(),
    amount_minor: Math.round(Number(product.price) * 100),
    currency: 'USD',
  },
  stock: product.stock,
  category: product.category,
  description: product.description ?? '',
});

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new ValidationError('Invalid JSON');
  }
};

export const productHandlers: ProductServiceHandlers = {
  GetProduct: unary(async (request) => {
    const product = await products.getProductForOrder(request.productId);
    if (!product) throw new NotFoundError('Product');
    return toProductProto(product);
  }),
  ReserveStock: unary(async (request) => stock.reserveStock(request.orderId, request.items)),
  ReleaseStock: unary(async (request) => {
    await stock.releaseStock(request.orderId);
    return {};
  }),
  ListProducts: unary(async (request) => {
    let parsedInput: unknown = request;
    if ('queryJson' in request && (request as { queryJson?: string }).queryJson) {
      parsedInput = parseJson((request as { queryJson?: string }).queryJson ?? '{}');
    } else {
      parsedInput = {
        category: request.category || undefined,
        search: request.search || undefined,
        limit: request.limit || undefined,
      };
    }
    const input = listProductsQuerySchema.safeParse(parsedInput);
    if (!input.success)
      throw new ValidationError(
        'Invalid query',
        input.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      );
    const result = await products.getProducts(input.data);
    return {
      products: result.products.map(toProductProto),
      page: {
        total: result.meta.total,
        nextCursor:
          result.products.length > 0 ? result.products[result.products.length - 1].id : '',
      },
    };
  }),
  CreateProduct: unary(async (request, call) => {
    requireAdmin(call.metadata);
    const input = createProductSchema.safeParse(parseJson(request.dataJson));
    if (!input.success)
      throw new ValidationError(
        'Invalid product',
        input.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      );
    return toProductProto(await products.createProduct(input.data));
  }),
  UpdateProduct: unary(async (request, call) => {
    requireAdmin(call.metadata);
    const input = updateProductSchema.safeParse(parseJson(request.dataJson));
    if (!input.success)
      throw new ValidationError(
        'Invalid product',
        input.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      );
    return toProductProto(await products.updateProduct(request.productId, input.data));
  }),
  DeleteProduct: unary(async (request, call) => {
    requireAdmin(call.metadata);
    await products.deleteProduct(request.productId);
    return {};
  }),
};
