/**
 * The HANDOFF §5 fixtures + the two Phase-4 fix fixtures, with DB-1 / engine-test
 * hand-computed expected values. UI inputs are entered in METRIC (the app's
 * default unit system) and DEGREES.
 *
 * Species labels MUST match the <option> text in PlanForm:
 *   softwood  → 'Softwood (e.g. pine, fir)'
 *   hardwood  → 'Hardwood (e.g. oak, maple)'
 *   dead      → 'Dead / compromised'
 *   palm-like → 'Palm-like'
 * Hazard kind labels: 'Structure' | 'Power line' | 'Road' | 'Tree' | 'Other'.
 */
import type { PlanInputUI } from './helpers';

export const SPECIES = {
  softwood: 'Softwood (e.g. pine, fir)',
  hardwood: 'Hardwood (e.g. oak, maple)',
  dead: 'Dead / compromised',
  palm: 'Palm-like',
} as const;

export interface FixtureExpect {
  verdict: 'ok' | 'caution' | 'refer';
  /** Substring checks against the rendered cut card / danger label, when actionable. */
  notchLabel?: string;
  openingDeg?: string;
  hingeThickness?: string; // formatted like the UI (cm, 0 decimals via formatDiameter)
  hingeLength?: string;
  fallAzimuth?: number; // surfaced in the EscapeCompass aria-label
  dangerLabel?: string; // e.g. "29.8 m" — surfaced in cut card / takeover
}

export interface Fixture {
  id: number;
  name: string;
  input: PlanInputUI;
  expect: FixtureExpect;
}

// FIXTURE 1 — small straight pine. H+ΔH 14.8867, DBH 30, lean 2°→180, tgt 180,
// wind 5, softwood. → ok, open-face 70°, hinge 3.0×24, fall 180, danger 29.773 → "29.8 m".
export const FIXTURE_1: Fixture = {
  id: 1,
  name: 'small straight pine',
  input: {
    heightM: '14.8867',
    dbhCm: '30',
    leanDeg: '2',
    leanAzimuth: '180',
    targetAzimuth: '180',
    windKph: '5',
    windAzimuth: '0',
    species: SPECIES.softwood,
  },
  expect: {
    verdict: 'ok',
    notchLabel: 'Open-face notch',
    openingDeg: '70°',
    hingeThickness: '3 cm',
    hingeLength: '24 cm',
    fallAzimuth: 180,
    dangerLabel: '29.8 m',
  },
};

// FIXTURE 2 — big oak near house. DBH 70 (>50) AND structure 10 m @90° on the
// fall line (1.5·18 = 27 m trigger). → refer. Danger 2·18 = 36 m → "36.0 m".
export const FIXTURE_2: Fixture = {
  id: 2,
  name: 'big oak near house',
  input: {
    heightM: '18',
    dbhCm: '70',
    leanDeg: '3',
    leanAzimuth: '90',
    targetAzimuth: '90',
    windKph: '4',
    windAzimuth: '0',
    species: SPECIES.hardwood,
    hazards: [{ kind: 'Structure', distance: '10', azimuth: '90' }],
  },
  expect: { verdict: 'refer', dangerLabel: '36.0 m' },
};

// FIXTURE 3 — back-leaner. lean 8°→280, tgt 90. away = 8·cos10° ≈ 7.88 ≤ 10 (no
// refer). Natural 280; tgt opposite → infeasible; nearest = 280+15 = 295. Back-lean
// → wedge. DBH 35 → hinge 3.5×28. Danger 2·12 = 24 m → "24.0 m". → caution.
export const FIXTURE_3: Fixture = {
  id: 3,
  name: 'back-leaner',
  input: {
    heightM: '12',
    dbhCm: '35',
    leanDeg: '8',
    leanAzimuth: '280',
    targetAzimuth: '90',
    windKph: '0',
    windAzimuth: '0',
    species: SPECIES.hardwood,
  },
  expect: {
    verdict: 'caution',
    notchLabel: 'Open-face notch',
    hingeThickness: '4 cm', // 3.5 cm → formatDiameter (0 decimals, metric) rounds to "4 cm"
    hingeLength: '28 cm',
    fallAzimuth: 295,
    dangerLabel: '24.0 m',
  },
};

// FIXTURE 5 — windy day. wind 25 > 15 → refer. Danger 2·13 = 26 m → "26.0 m".
export const FIXTURE_5: Fixture = {
  id: 5,
  name: 'windy day',
  input: {
    heightM: '13',
    dbhCm: '28',
    leanDeg: '2',
    leanAzimuth: '200',
    targetAzimuth: '200',
    windKph: '25',
    windAzimuth: '200',
    species: SPECIES.softwood,
  },
  expect: { verdict: 'refer', dangerLabel: '26.0 m' },
};

// FIXTURE 6 — dead tree → refer. Danger 2·15 = 30 m → "30.0 m".
export const FIXTURE_6: Fixture = {
  id: 6,
  name: 'dead tree',
  input: {
    heightM: '15',
    dbhCm: '30',
    leanDeg: '1',
    leanAzimuth: '180',
    targetAzimuth: '180',
    windKph: '3',
    windAzimuth: '0',
    species: SPECIES.dead,
  },
  expect: { verdict: 'refer', dangerLabel: '30.0 m' },
};

// FIXTURE 7 (Phase-4 F2) — palm-like → refer. Otherwise-benign inputs.
export const FIXTURE_7: Fixture = {
  id: 7,
  name: 'palm-like',
  input: {
    heightM: '12',
    dbhCm: '30',
    leanDeg: '1',
    leanAzimuth: '180',
    targetAzimuth: '180',
    windKph: '3',
    windAzimuth: '0',
    species: SPECIES.palm,
  },
  expect: { verdict: 'refer', dangerLabel: '24.0 m' },
};

// FIXTURE 8 (Phase-4 F1) — wind must not hide a side hazard. height 14, lean 0,
// tgt 180, softwood, structure 24 m @250°. Refers calm AND at 14 kph wind.
// Danger 2·14 = 28 m → "28.0 m". The under-wind variant is the regression case.
export const FIXTURE_8_CALM: Fixture = {
  id: 8,
  name: 'side hazard (calm) — F1 baseline',
  input: {
    heightM: '14',
    dbhCm: '30',
    leanDeg: '0',
    leanAzimuth: '0',
    targetAzimuth: '180',
    windKph: '0',
    windAzimuth: '0',
    species: SPECIES.softwood,
    hazards: [{ kind: 'Structure', distance: '24', azimuth: '250' }],
  },
  expect: { verdict: 'refer', dangerLabel: '28.0 m' },
};

export const FIXTURE_8_WINDY: Fixture = {
  id: 8,
  name: 'side hazard under wind (14 kph) — F1 regression',
  input: { ...FIXTURE_8_CALM.input, windKph: '14' },
  expect: { verdict: 'refer', dangerLabel: '28.0 m' },
};
