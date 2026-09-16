// Shared helpers: a token from Keycloak's development client (password grant, development realm only).
import http from 'k6/http';
import { check } from 'k6';

export const API = __ENV.API_URL || 'http://localhost:8080';
const KEYCLOAK = __ENV.KEYCLOAK_URL || 'http://localhost:8081';

export function token(user = 'alice', password = 'alice-dev-password') {
  const res = http.post(`${KEYCLOAK}/realms/assetcare/protocol/openid-connect/token`, {
    grant_type: 'password', client_id: 'assetcare-dev-cli', username: user, password,
  });
  check(res, { 'token obtained': (r) => r.status === 200 });
  return res.json('access_token');
}

export function auth(t) {
  return { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } };
}

export const CATEGORY_COMPUTER = '0195b7a0-0000-7000-8000-000000000001';
