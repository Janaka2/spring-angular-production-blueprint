// Write path: create then update, with Idempotency-Key and If-Match, then archive to keep the data set small.
//   k6 run performance/k6/write.js           (defaults: 5 VUs for 60 s)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, auth, token, CATEGORY_COMPUTER } from './lib.js';

export const options = {
  scenarios: { writers: { executor: 'constant-vus', vus: Number(__ENV.VUS || 5), duration: __ENV.DURATION || '60s' } },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:create}': ['p(95)<400'],
    'http_req_duration{name:update}': ['p(95)<400'],
  },
};

export function setup() { return { t: token() }; }

export default function ({ t }) {
  const h = auth(t);
  const key = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const body = JSON.stringify({ name: `k6 asset ${__VU}-${__ITER}`, categoryId: CATEGORY_COMPUTER, manufacturer: 'k6', purchasePrice: 10, currency: 'CHF' });
  const created = http.post(`${API}/api/v1/assets`, body, { headers: Object.assign({ 'Idempotency-Key': key }, h.headers), tags: { name: 'create' } });
  if (!check(created, { 'create 201': (r) => r.status === 201 })) return;
  const id = created.json('id');
  const etag = created.headers['Etag'] || created.headers['ETag'];
  const updated = http.put(`${API}/api/v1/assets/${id}`, JSON.stringify(Object.assign(JSON.parse(body), { location: 'bench' })),
    { headers: Object.assign({ 'If-Match': etag }, h.headers), tags: { name: 'update' } });
  check(updated, { 'update 200': (r) => r.status === 200 });
  http.del(`${API}/api/v1/assets/${id}`, null, { headers: h.headers, tags: { name: 'archive' } });
  sleep(1);
}
