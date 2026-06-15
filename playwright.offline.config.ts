import { defineConfig, devices } from '@playwright/test';

// Offline / service-worker verification (DB-5). The SW is intentionally
// disabled in `vite dev`, so this config runs the offline spec against the
// *production* build via `vite preview`. It uses its own port (5181) so it
// never collides with a dev server that may be on 5180.
const PORT = 5181;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/offline.spec.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
  // Build, then serve the built bundle (real SW) on the isolated port. Never
  // reuse an existing server — we specifically need the production preview, not
  // a dev server that has no service worker.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
