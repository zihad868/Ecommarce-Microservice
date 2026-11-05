import { createLogger } from '@ecommerce/common';

/**
 * Shared service logger for order-service modules.
 * Centralised here so all files import from the same instance.
 */
export const logger = createLogger({ serviceName: 'order-service' });
