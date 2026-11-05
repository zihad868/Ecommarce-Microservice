import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up to 20 users
    { duration: '1m', target: 50 },  // Maintain 50 users
    { duration: '20s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'], // 95% of requests under 300ms
    http_req_failed: ['rate<0.01'],                // Error rate under 1%
  },
};

const BASE_AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';
const BASE_PRODUCT_URL = __ENV.PRODUCT_URL || 'http://localhost:3002';
const BASE_ORDER_URL = __ENV.ORDER_URL || 'http://localhost:3003';

export default function () {
  const correlationId = `k6-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId,
    },
  };

  // 1. Health check & Metrics check
  const healthRes = http.get(`${BASE_PRODUCT_URL}/health/live`, params);
  check(healthRes, {
    'health live returns 200': (r) => r.status === 200,
  });

  // 2. Product listing (versioned cached endpoint)
  const listRes = http.get(`${BASE_PRODUCT_URL}/api/products?page=1&limit=10`, params);
  check(listRes, {
    'product list returns 200': (r) => r.status === 200,
  });

  sleep(1);
}
