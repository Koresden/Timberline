/**
 * Shared Playwright helpers + the six HANDOFF §5 fixtures (plus the two Phase-4
 * fix fixtures) with their DB-1 hand-computed expected values.
 *
 * These drive the real Measure / Plan / Simulate screens by their stable ids and
 * roles. No felling math here — the expected values are the hand-calcs from
 * DB-1 / the engine fixture tests, asserted against what the UI surfaces.
 */
import { type Page, type Locator, expect } from '@playwright/test';

// ── Plan input shape mirrored from the form (metric / degrees) ────────────────

export interface HazardInput {
  /** Matches the option label in the hazard-type <select> (e.g. "Structure"). */
  kind: string;
  distance: string;
  azimuth: string;
}

export interface PlanInputUI {
  heightM: string;
  dbhCm: string;
  leanDeg: string;
  leanAzimuth: string;
  targetAzimuth: string;
  windKph: string;
  windAzimuth: string;
  /** Visible label in the species <select> (e.g. "Softwood (e.g. pine, fir)"). */
  species: string;
  hazards?: HazardInput[];
}

// ── Navigation ────────────────────────────────────────────────────────────────

export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  // App shell present: the stepper and banner render immediately (client SPA).
  await expect(page.getByRole('note', { name: 'Safety notice' })).toBeVisible();
}

/** Click a stepper tab by its visible label: 'Measure' | 'Plan' | 'Sim'. */
export async function goToTab(page: Page, label: 'Measure' | 'Plan' | 'Sim'): Promise<void> {
  await page.getByRole('navigation', { name: 'Progress' }).getByRole('button', { name: label }).click();
}

export function safetyBanner(page: Page): Locator {
  return page.getByRole('note', { name: 'Safety notice' });
}

// ── Measure (tangent) ─────────────────────────────────────────────────────────

/**
 * Fill the tangent measure form and return the readout text (the "H ± ΔH unit"
 * string). Does NOT click "Use this height" — the caller decides.
 */
export async function fillMeasure(
  page: Page,
  distance: string,
  angleTop: string,
  angleBase: string,
): Promise<string> {
  await page.locator('#tan-distance').fill(distance);
  await page.locator('#tan-angle-top').fill(angleTop);
  await page.locator('#tan-angle-base').fill(angleBase);
  const readout = page.locator('.readout-h');
  await expect(readout).toBeVisible();
  return (await readout.textContent())?.trim() ?? '';
}

export async function useMeasuredHeight(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Use this height for planning' }).click();
}

// ── Plan ──────────────────────────────────────────────────────────────────────

/** Fill the plan form (assumes the Plan tab is active and the form is shown). */
export async function fillPlan(page: Page, input: PlanInputUI): Promise<void> {
  await page.locator('#plan-height').fill(input.heightM);
  await page.locator('#plan-dbh').fill(input.dbhCm);
  await page.locator('#plan-lean-deg').fill(input.leanDeg);
  await page.locator('#plan-lean-az').fill(input.leanAzimuth);
  await page.locator('#plan-target-az').fill(input.targetAzimuth);
  await page.locator('#plan-wind').fill(input.windKph);
  await page.locator('#plan-wind-az').fill(input.windAzimuth);
  await page.locator('#plan-species').selectOption({ label: input.species });

  for (let i = 0; i < (input.hazards?.length ?? 0); i++) {
    const hz = input.hazards![i];
    await page.getByRole('button', { name: 'Add hazard' }).click();
    await page.getByLabel(`Hazard ${i + 1} type`).selectOption({ label: hz.kind });
    await page.locator(`#hazard-${i}-dist`).fill(hz.distance);
    await page.locator(`#hazard-${i}-az`).fill(hz.azimuth);
  }
}

export async function submitPlan(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Get felling plan' }).click();
}

export function cutCard(page: Page): Locator {
  return page.locator('.cut-card');
}

export function referralTakeover(page: Page): Locator {
  return page.locator('.referral');
}

/**
 * The load-bearing safety assertion: a referral renders ZERO cut specs.
 * The discriminated union means the spec fields cannot exist; this proves the
 * UI honours that end to end (no CutCard, no notch/hinge/back-cut text anywhere
 * in the result area).
 */
export async function expectNoCutSpecs(page: Page): Promise<void> {
  await expect(referralTakeover(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Consult a professional arborist' })).toBeVisible();
  // No cut card at all.
  await expect(cutCard(page)).toHaveCount(0);
  // None of the cut-spec headings/strings the CutCard would render.
  await expect(page.getByRole('heading', { name: 'Hinge' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Back cut' })).toHaveCount(0);
  await expect(page.getByText('Open-face notch', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Conventional notch', { exact: false })).toHaveCount(0);
  await expect(page.getByText('never cut through the hinge', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Bore (plunge) cut', { exact: false })).toHaveCount(0);
  // The takeover states plainly that instructions are withheld.
  await expect(page.getByText('Cut instructions are withheld', { exact: false })).toBeVisible();
}
