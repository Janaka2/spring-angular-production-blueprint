import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real stack: Keycloak, the API on PostgreSQL, and the SPA.
 * Locally: make deps, make backend, make frontend, then `npx playwright test`.
 * In CI the workflow starts the same services (see .github/workflows/ci.yml, job e2e).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
