import { defineConfig, devices } from '@playwright/test';

// Smoke-only in Phase 0. Phase 4 (qa) expands this to the full
// measure -> plan -> simulate flow across the six fixtures.
export default defineConfig({
  testDir: './e2e',
  // The offline/SW spec needs the production build (the service worker is
  // disabled in `vite dev`), so it runs from its own config against `vite
  // preview` — see playwright.offline.config.ts. Keep it out of the dev suite.
  testIgnore: '**/offline.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  // Boot the real app for e2e; reuse a running dev server locally.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
  },
});
