import { test, expect, type Page } from '@playwright/test';
import { gotoApp, goToTab, fillPlan, submitPlan, cutCard, referralTakeover } from './helpers';
import { FIXTURE_1, FIXTURE_2 } from './fixtures';

/**
 * Area-clear reminder (DB-6) — it is an ATTESTATION, never a gate. These specs
 * encode the safety-auditor's hard guardrails as executable checks: it gates
 * nothing, persists nothing, and never appears on a referral. If any of these
 * fail, the reminder has drifted toward authorization — the posture forbids it.
 */

const reminder = (page: Page) => page.getByRole('region', { name: 'Area-clear reminder' });
const attestBox = (page: Page) => page.getByRole('checkbox', { name: /walked the full/i });

async function submitActionablePlan(page: Page): Promise<void> {
  await gotoApp(page);
  await goToTab(page, 'Plan');
  await fillPlan(page, FIXTURE_1.input);
  await submitPlan(page);
  await expect(cutCard(page)).toBeVisible();
}

test('reminder shows on an actionable plan, starts unchecked, and gates NOTHING', async ({ page }) => {
  await submitActionablePlan(page);

  await expect(reminder(page)).toBeVisible();
  await expect(reminder(page)).toContainText('You are responsible for clearing the danger zone');
  await expect(attestBox(page)).not.toBeChecked();

  // Cut specs are visible BEFORE attesting — the box is not a precondition.
  await expect(page.getByRole('heading', { name: 'Open-face notch' })).toBeVisible();
  await expect(cutCard(page)).toContainText('3.0 cm'); // hinge thickness

  // Attest. The re-affirmation appears; this is acknowledgement, not "unlock".
  await attestBox(page).check();
  await expect(attestBox(page)).toBeChecked();
  await expect(reminder(page)).toContainText('only your eyes on the ground');

  // Cut specs are STILL visible AFTER attesting — proves it gated nothing.
  await expect(page.getByRole('heading', { name: 'Open-face notch' })).toBeVisible();
  await expect(cutCard(page)).toContainText('3.0 cm');
});

test('Simulate is reachable with the attestation UNCHECKED (no navigation gate)', async ({ page }) => {
  await submitActionablePlan(page);
  await expect(attestBox(page)).not.toBeChecked();

  await goToTab(page, 'Sim');
  await expect(page.getByRole('heading', { name: 'Simulate the fall' })).toBeVisible();
  await expect(page.locator('.sim-topview-svg')).toBeVisible();
});

test('the attestation is NOT persisted — a reload re-renders it unchecked', async ({ page }) => {
  await submitActionablePlan(page);
  await attestBox(page).check();
  await expect(attestBox(page)).toBeChecked();

  // Full reload drops the in-memory plan; re-drive to the cut card.
  await page.reload();
  await goToTab(page, 'Plan');
  await fillPlan(page, FIXTURE_1.input);
  await submitPlan(page);
  await expect(cutCard(page)).toBeVisible();

  // If `checked` were persisted to storage it would come back checked. It must not.
  await expect(attestBox(page)).not.toBeChecked();
});

test('NO attestation on a referral — it must never imply "clear it and proceed"', async ({ page }) => {
  await gotoApp(page);
  await goToTab(page, 'Plan');
  await fillPlan(page, FIXTURE_2.input);
  await submitPlan(page);

  await expect(referralTakeover(page)).toBeVisible();
  await expect(reminder(page)).toHaveCount(0);
  await expect(attestBox(page)).toHaveCount(0);
});
