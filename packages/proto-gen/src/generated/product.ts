import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { EventMetadata as _common_v1_EventMetadata, EventMetadata__Output as _common_v1_EventMetadata__Output } from './common/v1/EventMetadata';
import type { Money as _common_v1_Money, Money__Output as _common_v1_Money__Output } from './common/v1/Money';
import type { ListProductsRequest as _product_v1_ListProductsRequest, ListProductsRequest__Output as _product_v1_ListProductsRequest__Output } from './product/v1/ListProductsRequest';
import type { ListProductsResponse as _product_v1_ListProductsResponse, ListProductsResponse__Output as _product_v1_ListProductsResponse__Output } from './product/v1/ListProductsResponse';
import type { PageInfo as _product_v1_PageInfo, PageInfo__Output as _product_v1_PageInfo__Output } from './product/v1/PageInfo';
import type { Product as _product_v1_Product, Product__Output as _product_v1_Product__Output } from './product/v1/Product';
import type { ProductMutationRequest as _product_v1_ProductMutationRequest, ProductMutationRequest__Output as _product_v1_ProductMutationRequest__Output } from './product/v1/ProductMutationRequest';
import type { ProductRequest as _product_v1_ProductRequest, ProductRequest__Output as _product_v1_ProductRequest__Output } from './product/v1/ProductRequest';
import type { ProductServiceClient as _product_v1_ProductServiceClient, ProductServiceDefinition as _product_v1_ProductServiceDefinition } from './product/v1/ProductService';
import type { ReleaseStockRequest as _product_v1_ReleaseStockRequest, ReleaseStockRequest__Output as _product_v1_ReleaseStockRequest__Output } from './product/v1/ReleaseStockRequest';
import type { ReleaseStockResponse as _product_v1_ReleaseStockResponse, ReleaseStockResponse__Output as _product_v1_ReleaseStockResponse__Output } from './product/v1/ReleaseStockResponse';
import type { ReserveStockRequest as _product_v1_ReserveStockRequest, ReserveStockRequest__Output as _product_v1_ReserveStockRequest__Output } from './product/v1/ReserveStockRequest';
import type { ReserveStockResponse as _product_v1_ReserveStockResponse, ReserveStockResponse__Output as _product_v1_ReserveStockResponse__Output } from './product/v1/ReserveStockResponse';
import type { StockItem as _product_v1_StockItem, StockItem__Output as _product_v1_StockItem__Output } from './product/v1/StockItem';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  common: {
    v1: {
      EventMetadata: MessageTypeDefinition<_common_v1_EventMetadata, _common_v1_EventMetadata__Output>
      Money: MessageTypeDefinition<_common_v1_Money, _common_v1_Money__Output>
    }
  }
  product: {
    v1: {
      ListProductsRequest: MessageTypeDefinition<_product_v1_ListProductsRequest, _product_v1_ListProductsRequest__Output>
      ListProductsResponse: MessageTypeDefinition<_product_v1_ListProductsResponse, _product_v1_ListProductsResponse__Output>
      PageInfo: MessageTypeDefinition<_product_v1_PageInfo, _product_v1_PageInfo__Output>
      Product: MessageTypeDefinition<_product_v1_Product, _product_v1_Product__Output>
      ProductMutationRequest: MessageTypeDefinition<_product_v1_ProductMutationRequest, _product_v1_ProductMutationRequest__Output>
      ProductRequest: MessageTypeDefinition<_product_v1_ProductRequest, _product_v1_ProductRequest__Output>
      ProductService: SubtypeConstructor<typeof grpc.Client, _product_v1_ProductServiceClient> & { service: _product_v1_ProductServiceDefinition }
      ReleaseStockRequest: MessageTypeDefinition<_product_v1_ReleaseStockRequest, _product_v1_ReleaseStockRequest__Output>
      ReleaseStockResponse: MessageTypeDefinition<_product_v1_ReleaseStockResponse, _product_v1_ReleaseStockResponse__Output>
      ReserveStockRequest: MessageTypeDefinition<_product_v1_ReserveStockRequest, _product_v1_ReserveStockRequest__Output>
      ReserveStockResponse: MessageTypeDefinition<_product_v1_ReserveStockResponse, _product_v1_ReserveStockResponse__Output>
      StockItem: MessageTypeDefinition<_product_v1_StockItem, _product_v1_StockItem__Output>
    }
  }
}

