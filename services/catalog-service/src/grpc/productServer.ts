import type * as grpc from '@grpc/grpc-js';
import { loadProduct } from '@ecommerce/proto-gen';
import { bindGrpc } from '@ecommerce/grpc-kit';
import { toGrpcError } from '@ecommerce/errors';
import config from '../config';
import * as productService from '../services/productService';

const productProto = loadProduct();

interface ProductRequest {
  productId: string;
}

interface ProductResponse {
  success: boolean;
  id: string;
  name: string;
  price: number;
  stock: number;
  error: string;
}

const getProduct = async (
  call: grpc.ServerUnaryCall<ProductRequest, ProductResponse>,
  callback: grpc.sendUnaryData<ProductResponse>,
): Promise<void> => {
  try {
    const { productId } = call.request;
    const product = await productService.getProductById(productId);

    if (!product) {
      callback(null, {
        success: false,
        id: '',
        name: '',
        price: 0,
        stock: 0,
        error: 'Product not found',
      });
      return;
    }

    callback(null, {
      success: true,
      id: product.id,
      name: product.name,
      price: Number(product.price),
      stock: product.stock,
      error: '',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[gRPC] getProduct error:', errMsg);
    callback(toGrpcError(error));
  }
};

export const startGrpcServer = (): Promise<grpc.Server> => {
  return bindGrpc(
    productProto.product.v1.ProductService.service,
    {
      GetProduct: (
        call: grpc.ServerUnaryCall<ProductRequest, ProductResponse>,
        callback: grpc.sendUnaryData<ProductResponse>,
      ) => {
        void getProduct(call, callback);
      },
    },
    `0.0.0.0:${config.GRPC_PORT}`,
  );
};
