import { test, expect } from '@playwright/test';
import { gotoApp, safetyBanner, goToTab } from './helpers';

/**
 * Boot smoke: the app shell renders, the persistent safety banner is present on
 * EVERY tab (Measure / Plan / Simulate), and there is no dismiss/override control.
 * The full measure → plan → simulate flow + the six fixtures live in flow.spec.ts.
 */
test('app boots with the persistent, non-dismissable safety banner on every tab', async ({ page }) => {
  await gotoApp(page);

  await expect(safetyBanner(page)).toContainText('Planning aid — not authorization');
  // No override / dismiss affordance anywhere on the banner.
  await expect(page.getByRole('button', { name: /dismiss|override|ignore|hide/i })).toHaveCount(0);

  // Banner persists across all three steps.
  await expect(page.getByRole('heading', { name: 'Measure', exact: true })).toBeVisible();
  await expect(safetyBanner(page)).toBeVisible();

  await goToTab(page, 'Plan');
  await expect(page.getByRole('heading', { name: 'Plan the fall' })).toBeVisible();
  await expect(safetyBanner(page)).toBeVisible();

  await goToTab(page, 'Sim');
  await expect(page.getByRole('heading', { name: 'Simulate the fall' })).toBeVisible();
  await expect(safetyBanner(page)).toBeVisible();
});
