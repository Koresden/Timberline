import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// Timberline pins its own port (5180) with strictPort so dev, preview, and the
// Playwright webServer always agree — and so it never silently drifts onto a
// neighbouring project's Vite server (5173 is a common default collision).
const PORT = 5180;

export default defineConfig({
  plugins: [react()],
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
