// Read path: list, search and read one asset. The queries the dashboard and the list screen make.
//   k6 run performance/k6/read.js            (defaults: 20 VUs for 60 s against localhost)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, auth, token } from './lib.js';

export const options = {
  scenarios: { readers: { executor: 'constant-vus', vus: Number(__ENV.VUS || 20), duration: __ENV.DURATION || '60s' } },
  thresholds: {
    http_req_failed: ['rate<0.01'],          // SLO: fewer than 1% failed requests
    'http_req_duration{name:list}': ['p(95)<300'],
    'http_req_duration{name:search}': ['p(95)<400'],
    'http_req_duration{name:get}': ['p(95)<150'],
  },
};

export function setup() {
  const t = token();
  const list = http.get(`${API}/api/v1/assets?size=20`, auth(t)).json();
  return { t, ids: list.items.map((a) => a.id) };
}

export default function ({ t, ids }) {
  const h = auth(t);
  check(http.get(`${API}/api/v1/assets?size=20&sort=updatedAt,desc`, Object.assign({ tags: { name: 'list' } }, h)), { 'list 200': (r) => r.status === 200 });
  check(http.get(`${API}/api/v1/assets?search=lap&size=20`, Object.assign({ tags: { name: 'search' } }, h)), { 'search 200': (r) => r.status === 200 });
  if (ids.length) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    check(http.get(`${API}/api/v1/assets/${id}`, Object.assign({ tags: { name: 'get' } }, h)), { 'get 200': (r) => r.status === 200 });
  }
  sleep(0.5);
}
