import { unary, requireAdmin } from '@ecommerce/grpc-kit';
import { ApiError } from '@ecommerce/errors';
import type { ProductServiceHandlers } from '@ecommerce/proto-gen';
import * as products from '../../services/productService';
import * as stock from '../../services/stockService';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from '../../validators/productValidators';
import type { Product } from '../../utils/prismaClient';
const response = (product: Product) => ({
  success: true,
  id: product.id,
  name: product.name,
  price: Number(product.price),
  stock: product.stock,
  error: '',
});
const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new ApiError(400, 'Invalid JSON');
  }
};
export const productHandlers: ProductServiceHandlers = {
  GetProduct: unary(async (request) => {
    const product = await products.getProductForOrder(request.productId);
    if (!product) throw new ApiError(404, 'Product not found');
    return response(product);
  }),
  ReserveStock: unary(async (request) => stock.reserveStock(request.orderId, request.items)),
  ReleaseStock: unary(async (request) => {
    await stock.releaseStock(request.orderId);
    return {};
  }),
  ListProducts: unary(async (request) => {
    const input = listProductsQuerySchema.safeParse(parseJson(request.queryJson));
    if (!input.success) throw new ApiError(400, 'Invalid query');
    const result = await products.getProducts(input.data);
    return { products: result.products.map(response), metaJson: JSON.stringify(result.meta) };
  }),
  CreateProduct: unary(async (request, call) => {
    requireAdmin(call.metadata);
    const input = createProductSchema.safeParse(parseJson(request.dataJson));
    if (!input.success) throw new ApiError(400, 'Invalid product');
    return response(await products.createProduct(input.data));
  }),
  UpdateProduct: unary(async (request, call) => {
    requireAdmin(call.metadata);
    const input = updateProductSchema.safeParse(parseJson(request.dataJson));
    if (!input.success) throw new ApiError(400, 'Invalid product');
    return response(await products.updateProduct(request.productId, input.data));
  }),
  DeleteProduct: unary(async (request, call) => {
    requireAdmin(call.metadata);
    await products.deleteProduct(request.productId);
    return {};
  }),
};
