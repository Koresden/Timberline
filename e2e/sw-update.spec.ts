import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { existsSync, rmSync, cpSync, readFileSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safetyBanner } from './helpers';

/**
 * Offline cache-update verification (follow-up to DB-5 / the PR #2 review).
 *
 * The central safety property of an offline-cached *safety* tool: when a
 * CORRECTED build ships, the offline user must stop receiving the STALE build's
 * logic. DB-5 chose `registerType: 'autoUpdate'` + `cleanupOutdatedCaches` to
 * bound that stale window; this spec drives that path end to end:
 *
 *   build A → cache it → "deploy" build B → relaunch → user is on B,
 *   and B is what's served OFFLINE (A's precache is gone).
 *
 * The DB-5 build stamp is the visible proxy for "which safety logic"; we pin it
 * per build via TIMBERLINE_BUILD_DATE so A and B are distinguishable. The SW is
 * disabled in `vite dev`, so — like the offline spec — this runs against the
 * production build, here served by a tiny switchable static server the test owns.
 */

const HERE = fileURLToPath(new URL('.', import.meta.url)); // the e2e/ dir
const ROOT = resolve(HERE, '..');
const SW = join(ROOT, '.swtest');
const DIR_A = join(SW, 'a');
const DIR_B = join(SW, 'b');
const CURRENT = join(SW, 'current');
const DATE_A = '2026-01-02';
const DATE_B = '2026-11-30';
const PORT = 5182;

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function buildInto(dir: string, date: string): void {
  execFileSync(join(ROOT, 'node_modules', '.bin', 'vite'), ['build', '--outDir', dir, '--emptyOutDir'], {
    cwd: ROOT,
    env: { ...process.env, TIMBERLINE_BUILD_DATE: date },
    stdio: 'ignore',
  });
}

/** Swap which build the static server serves — i.e. "deploy" a new version. */
function deploy(dir: string): void {
  rmSync(CURRENT, { recursive: true, force: true });
  cpSync(dir, CURRENT, { recursive: true });
}

let server: Server;

test.beforeAll(async () => {
  rmSync(SW, { recursive: true, force: true });
  // Two production builds that differ only by their pinned stamp → different
  // asset hashes → a genuinely different sw.js the browser will update to.
  buildInto(DIR_A, DATE_A);
  buildInto(DIR_B, DATE_B);
  deploy(DIR_A);

  // Minimal static server over `CURRENT`. `no-cache` everywhere so the browser's
  // own HTTP cache never masks the new sw.js bytes during the update check.
  server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = join(CURRENT, urlPath);
    try {
      if (urlPath === '/' || !existsSync(file) || statSync(file).isDirectory()) {
        file = join(CURRENT, 'index.html'); // SPA fallback
      }
      res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(readFileSync(file));
    } catch {
      res.statusCode = 404;
      res.end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(PORT, r));
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  rmSync(SW, { recursive: true, force: true });
});

const stampDate = (page: Page) => page.locator('.app-foot time');

async function waitForControllingSW(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller != null;
  });
}

test('a corrected build replaces the stale one — including what is served OFFLINE', async ({
  page,
  context,
}) => {
  // Build A is live and precached by the service worker.
  await page.goto('/');
  await waitForControllingSW(page);
  await expect(stampDate(page)).toHaveAttribute('datetime', DATE_A);

  // Ship the corrected build B to the same origin.
  deploy(DIR_B);

  // `autoUpdate` applies on a SUBSEQUENT relaunch — force the update check and
  // relaunch until the new SW has taken over. The loop documents exactly that:
  // the fix lands on the next launch-with-connectivity, not mid-session.
  let seen = DATE_A;
  for (let i = 0; i < 8 && seen !== DATE_B; i++) {
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    });
    await page.reload();
    seen = (await stampDate(page).getAttribute('datetime')) ?? '';
  }
  expect(seen).toBe(DATE_B);

  // The safety property: with the network CUT, the app now serves B — the
  // corrected logic — not the stale A. (A's precache was cleaned up.)
  await waitForControllingSW(page);
  await context.setOffline(true);
  await page.reload();
  await expect(stampDate(page)).toHaveAttribute('datetime', DATE_B);
  await expect(safetyBanner(page)).toBeVisible();
  await context.setOffline(false);
});
