import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
// Timberline pins its own port (5180) with strictPort so dev, preview, and the
// Playwright webServer always agree — and so it never silently drifts onto a
// neighbouring project's Vite server (5173 is a common default collision).
const PORT = 5180;

// Build stamp (DB-5): an offline-cached *safety* tool can serve stale safety
// logic, so we surface which build the user is holding. The date is resolved
// once at build time and frozen into the bundle via `define`. `TIMBERLINE_BUILD_DATE`
// pins it for reproducible builds and lets the SW cache-update e2e produce two
// distinguishable builds (see e2e/sw-update.spec.ts).
const BUILD_DATE =
  process.env.TIMBERLINE_BUILD_DATE ?? new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [
    react(),
    // Offline service worker (DB-5). The manifest is already hand-authored at
    // public/manifest.webmanifest and linked from index.html, so the plugin
    // generates *only* the SW (`manifest: false`) — no duplicate manifest.
    VitePWA({
      registerType: 'autoUpdate', // latest assets on next launch — shortest stale-safety-logic window
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        // Precache the full shell so the app is fully styled offline, not just
        // functional: built JS/CSS/HTML, the manifest, the icon, and every
        // self-hosted font (public/fonts/*.woff2 → dist/fonts/*).
        globPatterns: ['**/*.{js,css,html,svg,woff2,webmanifest}'],
        // SPA: a cold offline launch on any path resolves to the app shell.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      // No SW in `vite dev` — keeps the stale-asset friction DB-0 flagged out of
      // the dev loop entirely. Offline is verified against the production build.
      devOptions: { enabled: false },
    }),
  ],
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  test: {
    // Engine + unit tests are pure TS and need no DOM. Feature/component
    // tests added in later phases can opt into jsdom per-file via
    // `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
  },
});
