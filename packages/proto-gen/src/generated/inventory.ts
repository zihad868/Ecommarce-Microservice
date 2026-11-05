import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { InventoryServiceClient as _inventory_v1_InventoryServiceClient, InventoryServiceDefinition as _inventory_v1_InventoryServiceDefinition } from './inventory/v1/InventoryService';
import type { ReleaseStockRequest as _inventory_v1_ReleaseStockRequest, ReleaseStockRequest__Output as _inventory_v1_ReleaseStockRequest__Output } from './inventory/v1/ReleaseStockRequest';
import type { ReleaseStockResponse as _inventory_v1_ReleaseStockResponse, ReleaseStockResponse__Output as _inventory_v1_ReleaseStockResponse__Output } from './inventory/v1/ReleaseStockResponse';
import type { ReserveStockRequest as _inventory_v1_ReserveStockRequest, ReserveStockRequest__Output as _inventory_v1_ReserveStockRequest__Output } from './inventory/v1/ReserveStockRequest';
import type { ReserveStockResponse as _inventory_v1_ReserveStockResponse, ReserveStockResponse__Output as _inventory_v1_ReserveStockResponse__Output } from './inventory/v1/ReserveStockResponse';
import type { StockItem as _inventory_v1_StockItem, StockItem__Output as _inventory_v1_StockItem__Output } from './inventory/v1/StockItem';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  inventory: {
    v1: {
      InventoryService: SubtypeConstructor<typeof grpc.Client, _inventory_v1_InventoryServiceClient> & { service: _inventory_v1_InventoryServiceDefinition }
      ReleaseStockRequest: MessageTypeDefinition<_inventory_v1_ReleaseStockRequest, _inventory_v1_ReleaseStockRequest__Output>
      ReleaseStockResponse: MessageTypeDefinition<_inventory_v1_ReleaseStockResponse, _inventory_v1_ReleaseStockResponse__Output>
      ReserveStockRequest: MessageTypeDefinition<_inventory_v1_ReserveStockRequest, _inventory_v1_ReserveStockRequest__Output>
      ReserveStockResponse: MessageTypeDefinition<_inventory_v1_ReserveStockResponse, _inventory_v1_ReserveStockResponse__Output>
      StockItem: MessageTypeDefinition<_inventory_v1_StockItem, _inventory_v1_StockItem__Output>
    }
  }
}

