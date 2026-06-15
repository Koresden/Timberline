import { test, expect } from '@playwright/test';
import { gotoApp, safetyBanner, goToTab } from './helpers';

/**
 * Offline PWA verification (DB-5). Proves the stated v1 requirement — the app
 * works offline (HANDOFF §1) — against the *production* build, where the service
 * worker is live (it is disabled in `vite dev`; see playwright.offline.config.ts).
 *
 * The load-bearing assertions: after the SW caches the shell, going fully
 * offline and reloading still renders the app AND the persistent SafetyBanner.
 * A safety tool that silently failed to load offline would be worse than useless.
 */
test('app loads offline from the service-worker cache, banner intact', async ({ page, context }) => {
  await gotoApp(page);

  // Wait until the service worker actually *controls* this page — not merely
  // active. `controller != null` is the deterministic signal that an offline
  // reload will be served from the precache (the shell: HTML/JS/CSS/fonts);
  // a bare `active` check races with clientsClaim and can reload onto the network.
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller != null;
  });

  // Cut the network entirely, then cold-reload. The SW must serve the shell.
  await context.setOffline(true);
  await page.reload();

  // App shell came back from cache: Measure screen + the non-dismissable banner.
  await expect(page.getByRole('heading', { name: 'Measure', exact: true })).toBeVisible();
  await expect(safetyBanner(page)).toBeVisible();
  await expect(safetyBanner(page)).toContainText('Planning aid — not authorization');

  // SPA navigation still works offline (no network round-trips for tab changes).
  await goToTab(page, 'Plan');
  await expect(page.getByRole('heading', { name: 'Plan the fall' })).toBeVisible();
  await expect(safetyBanner(page)).toBeVisible();

  await context.setOffline(false);
});

/**
 * The build stamp (DB-5) is present so an offline user can tell which build's
 * safety logic they hold. Cheap honesty; asserted so it can't silently regress.
 */
test('build stamp is shown in the footer', async ({ page }) => {
  await gotoApp(page);
  const stamp = page.locator('.app-foot');
  await expect(stamp).toBeVisible();
  // Auditor-vetted copy: names what is dated and carries the caveat (the action
  // that closes the stale-safety-logic gap), not an "offline is fine" reassurance.
  await expect(stamp).toContainText('Safety logic build');
  await expect(stamp).toContainText('reconnect for updates');
  // A real YYYY-MM-DD build date, frozen at build time.
  await expect(stamp.locator('time')).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
});
