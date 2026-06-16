import { defineConfig, devices } from '@playwright/test';

// Service-worker cache-update verification (follow-up to DB-5). Unlike the other
// suites, this spec owns its whole server lifecycle: it builds two production
// bundles and runs its own switchable static server on port 5182 (see
// e2e/sw-update.spec.ts). So there is no `webServer` here. Generous timeout —
// beforeAll runs two Vite production builds.
const PORT = 5182;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/sw-update.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  timeout: 120_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
});
