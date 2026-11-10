import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

const base = __ENV.GATEWAY_URL || 'http://localhost:8081';
const peak = Number(__ENV.TARGET_RPS || 5000);
const scenario = (fraction, execName) => ({
  executor: 'ramping-arrival-rate',
  exec: execName,
  startRate: Math.ceil(peak * fraction * 0.1),
  timeUnit: '1s',
  preAllocatedVUs: Math.ceil(peak * fraction),
  maxVUs: Math.ceil(peak * fraction * 3),
  stages: [
    { duration: '2m', target: Math.ceil(3000 * fraction) },
    { duration: '3m', target: Math.ceil(peak * fraction) },
    { duration: '3m', target: Math.ceil(peak * fraction) },
    { duration: '1m', target: 0 },
  ],
});
export const options = {
  scenarios: {
    browse: scenario(0.8, 'browse'),
    login: scenario(0.05, 'login'),
    checkout: scenario(0.15, 'checkout'),
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    dropped_iterations: ['count==0'],
  },
};
const headers = { 'Content-Type': 'application/json' };
const credentials = () =>
  JSON.stringify({ email: __ENV.LOAD_EMAIL, password: __ENV.LOAD_PASSWORD });
export function setup() {
  if (!__ENV.LOAD_EMAIL || !__ENV.LOAD_PASSWORD || !__ENV.PRODUCT_ID)
    throw new Error('Provide LOAD_EMAIL, LOAD_PASSWORD and PRODUCT_ID for seeded test data');
  const response = http.post(`${base}/api/auth/login`, credentials(), { headers });
  if (response.status !== 200) throw new Error('Test login failed');
  return { token: response.json('data.tokens.accessToken'), runId: Date.now() };
}
export function browse() {
  const response = http.get(`${base}/api/products?limit=10`, { tags: { name: 'browse' } });
  check(response, { 'browse succeeds': (r) => r.status === 200 });
}
export function login() {
  const response = http.post(`${base}/api/auth/login`, credentials(), {
    headers,
    tags: { name: 'login' },
  });
  check(response, { 'login succeeds': (r) => r.status === 200 });
}
export function checkout(data) {
  const response = http.post(
    `${base}/api/orders`,
    JSON.stringify({ items: [{ productId: __ENV.PRODUCT_ID, quantity: 1 }] }),
    {
      headers: {
        ...headers,
        Authorization: `Bearer ${data.token}`,
        'Idempotency-Key': `k6-${data.runId}-${exec.scenario.name}-${exec.scenario.iterationInTest}`,
      },
      tags: { name: 'create-order' },
    },
  );
  check(response, { 'order reserved and created': (r) => r.status === 201 });
}
