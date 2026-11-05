import { startFoundation } from '@ecommerce/grpc-kit';

// Business readiness stays false until the owned persistence and handlers exist.
startFoundation({ serviceName: 'cart-service', port: 3006 });
