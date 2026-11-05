import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { ProductRequest as _product_v1_ProductRequest, ProductRequest__Output as _product_v1_ProductRequest__Output } from './product/v1/ProductRequest';
import type { ProductResponse as _product_v1_ProductResponse, ProductResponse__Output as _product_v1_ProductResponse__Output } from './product/v1/ProductResponse';
import type { ProductServiceClient as _product_v1_ProductServiceClient, ProductServiceDefinition as _product_v1_ProductServiceDefinition } from './product/v1/ProductService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  product: {
    v1: {
      ProductRequest: MessageTypeDefinition<_product_v1_ProductRequest, _product_v1_ProductRequest__Output>
      ProductResponse: MessageTypeDefinition<_product_v1_ProductResponse, _product_v1_ProductResponse__Output>
      ProductService: SubtypeConstructor<typeof grpc.Client, _product_v1_ProductServiceClient> & { service: _product_v1_ProductServiceDefinition }
    }
  }
}

