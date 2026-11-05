import { startFoundation } from '@ecommerce/grpc-kit';

// Business readiness stays false until the owned persistence and handlers exist.
startFoundation({ serviceName: 'notification-service', port: 3008 });
