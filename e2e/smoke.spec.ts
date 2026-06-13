import { test, expect } from '@playwright/test';

/**
 * Phase 0 smoke: the app boots and the persistent safety banner is present.
 * Phase 4 (qa) expands e2e to the full measure -> plan -> simulate flow and
 * asserts that refer-professional fixtures never render cut specs.
 *
 * Run with `npm run test:e2e` (requires `npx playwright install` once).
 */
test('app boots and shows the persistent safety banner', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Timberline' })).toBeVisible();
  await expect(page.getByRole('note', { name: 'Safety notice' })).toContainText(
    'Planning aid',
  );
});
