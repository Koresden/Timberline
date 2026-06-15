import { test, expect } from '@playwright/test';
import {
  gotoApp,
  goToTab,
  safetyBanner,
  fillMeasure,
  useMeasuredHeight,
  fillPlan,
  submitPlan,
  cutCard,
  expectNoCutSpecs,
  type Fixture,
} from './helpers';
import {
  FIXTURE_1,
  FIXTURE_2,
  FIXTURE_3,
  FIXTURE_5,
  FIXTURE_6,
  FIXTURE_7,
  FIXTURE_8_CALM,
  FIXTURE_8_WINDY,
} from './fixtures';

/**
 * Phase 4 e2e: measure → plan → simulate across the six §5 fixtures + the two
 * Phase-4 fix fixtures (palm-like F2, side-hazard-under-wind F1). Cross-checks
 * the UI against the DB-1 hand-computed values and asserts the safety invariants
 * end to end: referrals NEVER render cut specs, Simulate shows no corridor for a
 * referral, the banner is always present, and the danger radius = 2×(H+ΔH).
 */

// ── 1. Full flow on FIXTURE 1: measure → plan → simulate, all cross-checks ─────

test('FIXTURE 1 — full measure→plan→simulate flow, cross-checked vs DB-1', async ({ page }) => {
  await gotoApp(page);

  // ── Measure (the "+" branch): dist 15, top 40, base 5 → H 13.9 ± 1.0 m. ──
  const readout = await fillMeasure(page, '15', '40', '5');
  expect(readout).toContain('13.9');
  expect(readout).toContain('± 1.0');
  expect(readout).toContain('m');
  await useMeasuredHeight(page);
  await expect(page.getByText('Saved for planning', { exact: false })).toBeVisible();

  // ── Plan: the height is prefilled as the WORST-CASE H+ΔH (= 14.887 m), not ──
  // the bare 13.9. We then enter the rest of FIXTURE 1 and assert the plan.
  await goToTab(page, 'Plan');
  // CRITICAL CONTRACT #1: the prefilled height is the worst-case, ~14.9 m.
  const prefill = await page.locator('#plan-height').inputValue();
  expect(Number(prefill)).toBeGreaterThan(14.8);
  expect(Number(prefill)).toBeLessThan(15.0);

  // Use the canonical fixture height so the cross-check is exact.
  await fillPlan(page, FIXTURE_1.input);
  await submitPlan(page);

  // Actionable cut card, verdict "ok".
  await expect(cutCard(page)).toBeVisible();
  await expect(cutCard(page)).toHaveClass(/cut-card--ok/);
  await expect(page.getByText('Plan ready', { exact: false })).toBeVisible();

  // Notch: open-face 70°, depth 10 cm. Cut specs render at 1 decimal (finding D).
  await expect(page.getByRole('heading', { name: 'Open-face notch' })).toBeVisible();
  await expect(cutCard(page)).toContainText('70°');
  await expect(cutCard(page)).toContainText('10.0 cm'); // depth = ⅓·30

  // Hinge: 3 cm × 24 cm.
  await expect(cutCard(page)).toContainText('3.0 cm');
  await expect(cutCard(page)).toContainText('24.0 cm');

  // CRITICAL CONTRACT (H+ΔH): danger radius = 2 × worst-case 14.8867 = 29.773 → "29.8 m".
  await expect(cutCard(page)).toContainText('29.8 m');

  // Escape compass surfaces fall azimuth 180 and escapes 315 / 45 (DB-1).
  const compass = page.getByRole('img', { name: /Top-down escape plan/ });
  await expect(compass).toHaveAttribute('aria-label', /Fall direction 180°/);
  await expect(compass).toHaveAttribute('aria-label', /escape routes 315° and 45°/);
  await expect(compass).toHaveAttribute('aria-label', /danger radius 29.8 m/);

  // ── Simulate: an actionable plan publishes a corridor; no empty state. ──
  await goToTab(page, 'Sim');
  await expect(page.getByRole('heading', { name: 'Simulate the fall' })).toBeVisible();
  await expect(page.locator('.sim-empty')).toHaveCount(0);
  await expect(page.locator('.sim-topview-svg')).toBeVisible();
  // Danger ring label = 2×(H+ΔH) = "29.8 m" on the sim too.
  await expect(page.locator('.sim-legend-ring')).toContainText('29.8 m');
  // Clear verdict (no obstacles yet).
  await expect(page.locator('.sim-verdict--clear')).toBeVisible();

  // Banner persisted through all three screens.
  await expect(safetyBanner(page)).toBeVisible();
});

// ── 2. FIXTURE 4 — slope measurement, the "−" branch (negative base angle) ─────

test('FIXTURE 4 — slope measure: dist 20, top 35°, base −8° → ≈ 11.2 m', async ({ page }) => {
  await gotoApp(page);
  // Negative base angle = base above the horizon (uphill). H = 20(tan35 + tan(−8))
  // = 11.193 m; ΔH ≈ 1.100 → readout "11.2 ± 1.1 m".
  const readout = await fillMeasure(page, '20', '35', '-8');
  expect(readout).toContain('11.2');
  expect(readout).toContain('± 1.1');
  expect(readout).toContain('m');
});

// ── 3. Caution fixture (FIXTURE 3 — back-leaner) ──────────────────────────────

test('FIXTURE 3 — back-leaner → caution, wedge, nearest-feasible 295°', async ({ page }) => {
  await gotoApp(page);
  await goToTab(page, 'Plan');
  await fillPlan(page, FIXTURE_3.input);
  await submitPlan(page);

  await expect(cutCard(page)).toBeVisible();
  await expect(cutCard(page)).toHaveClass(/cut-card--caution/);
  await expect(page.getByText('Proceed with caution', { exact: false })).toBeVisible();

  // Hinge 3.5 cm — now renders "3.5 cm" at 1 decimal (finding D fix; previously
  // the 0-dp formatter overstated it as "4 cm"). Length 28 cm.
  await expect(cutCard(page)).toContainText('3.5 cm');
  await expect(cutCard(page)).toContainText('28.0 cm');
  // At least one wedge (back lean).
  const wedges = page.locator('.cut-step', { hasText: 'Back cut' });
  await expect(wedges).toContainText('1');
  // Danger 2·12 = 24 m.
  await expect(cutCard(page)).toContainText('24.0 m');

  // Nearest-feasible fall azimuth = 295° (target 90 was outside the cone).
  const compass = page.getByRole('img', { name: /Top-down escape plan/ });
  await expect(compass).toHaveAttribute('aria-label', /Fall direction 295°/);
  await expect(cutCard(page)).toContainText('nearest', { ignoreCase: true });
});

// ── 4. Referral fixtures: NO cut specs + Simulate shows NO corridor ───────────

const REFERRALS: { fixture: Fixture; reasonRe: RegExp }[] = [
  { fixture: FIXTURE_2, reasonRe: /diameter|50 cm|structure/i },
  { fixture: FIXTURE_5, reasonRe: /wind/i },
  { fixture: FIXTURE_6, reasonRe: /dead|compromis/i },
  { fixture: FIXTURE_7, reasonRe: /palm/i },
  { fixture: FIXTURE_8_CALM, reasonRe: /structure|power line|road/i },
  { fixture: FIXTURE_8_WINDY, reasonRe: /structure|power line|road/i },
];

for (const { fixture, reasonRe } of REFERRALS) {
  test(`FIXTURE ${fixture.id} — ${fixture.name} → refer-professional, ZERO cut specs`, async ({
    page,
  }) => {
    await gotoApp(page);
    await goToTab(page, 'Plan');
    await fillPlan(page, fixture.input);
    await submitPlan(page);

    // THE load-bearing safety check: takeover shown, no cut specs anywhere.
    await expectNoCutSpecs(page);
    // The triggering reason is surfaced.
    await expect(page.locator('.referral-reasons')).toContainText(reasonRe);
    // The danger zone is still shown in the information-only state.
    if (fixture.expect.dangerLabel) {
      await expect(page.locator('.referral-danger-value')).toContainText(fixture.expect.dangerLabel);
    }

    // Simulate must show the information-only empty state — NO corridor.
    await goToTab(page, 'Sim');
    await expect(page.locator('.sim-empty')).toBeVisible();
    await expect(page.getByText('No simulation to show', { exact: false })).toBeVisible();
    await expect(page.locator('.sim-topview-svg')).toHaveCount(0);
    await expect(page.locator('.sim-verdict--clear')).toHaveCount(0);
    await expect(page.locator('.sim-verdict--blocked')).toHaveCount(0);

    // Banner persists on the referral and the empty sim.
    await expect(safetyBanner(page)).toBeVisible();
  });
}

// ── 5. F1 regression in the UI: wind must NOT hide the side hazard ────────────

test('F1 (UI) — side hazard refers calm AND under 14 kph wind (wind must not narrow the sweep)', async ({
  page,
}) => {
  await gotoApp(page);

  // Calm: refers.
  await goToTab(page, 'Plan');
  await fillPlan(page, FIXTURE_8_CALM.input);
  await submitPlan(page);
  await expectNoCutSpecs(page);

  // Reset back to inputs, then the SAME hazard at 14 kph wind must STILL refer.
  await page.getByRole('button', { name: 'Back to inputs' }).click();
  await fillPlan(page, FIXTURE_8_WINDY.input);
  await submitPlan(page);
  await expectNoCutSpecs(page);
});

// ── 6. Obstacle interaction on the Simulate top view (S1) ─────────────────────

test('S1 — adding an obstacle in the corridor flips the verdict to blocked', async ({ page }) => {
  await gotoApp(page);

  // Build FIXTURE 1's actionable plan so we have a corridor (fall azimuth 180 = south).
  await goToTab(page, 'Plan');
  await fillPlan(page, FIXTURE_1.input);
  await submitPlan(page);
  await expect(cutCard(page)).toBeVisible();

  await goToTab(page, 'Sim');
  await expect(page.locator('.sim-verdict--clear')).toBeVisible();

  // Default obstacle drop point is (0, +8 m) = 8 m NORTH of the base. The fall
  // corridor points SOUTH (azimuth 180), so a freshly-added obstacle is NOT in
  // the corridor → still clear. Then drag it south into the corridor.
  await page.getByRole('button', { name: '+ House' }).click();
  // A house at +8 m north is outside a south-pointing corridor → still clear.
  await expect(page.locator('.sim-verdict--clear')).toBeVisible();

  // Drag the house from its north position down through the base into the south
  // corridor using Playwright's trusted pointer. The SVG is 320px viewBox; the
  // base is at the centre. Dragging from above-centre to well-below-centre moves
  // it from +y (north) to −y (south), into the fall path.
  const svg = page.locator('.sim-topview-svg');
  const box = await svg.boundingBox();
  if (!box) throw new Error('top-view svg has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const obstacle = page.locator('.sim-obstacle').first();
  const obox = await obstacle.boundingBox();
  if (!obox) throw new Error('obstacle has no bounding box');

  // Press on the obstacle (north of centre), drag to a point south of centre,
  // inside the corridor (a fraction of the danger radius down the fall line).
  await page.mouse.move(obox.x + obox.width / 2, obox.y + obox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cx, cy, { steps: 8 }); // through the base
  await page.mouse.move(cx, cy + box.height * 0.22, { steps: 8 }); // south, into corridor
  await page.mouse.up();

  // Verdict flips to blocked, collision computed by the engine's checkCorridor.
  await expect(page.locator('.sim-verdict--blocked')).toBeVisible();
  await expect(page.locator('.sim-verdict--blocked')).toContainText(/blocked/i);

  // The danger ring / legend goes to the breach (red) state.
  await expect(page.locator('.sim-danger-ring.is-breached')).toHaveCount(1);
});
