/**
 * Display-only unit conversion (DB-0 Decision 2).
 *
 * The engine and the whole app store everything in SI (m, cm, kph, degrees) and
 * NEVER store imperial — see CLAUDE.md §3 and DB-0. These helpers exist purely
 * for the DISPLAY boundary: they convert an SI value to the user's chosen unit
 * for rendering, and parse a user-typed value in their chosen unit back to SI.
 *
 * They deliberately live in `src/units.ts`, NOT in `src/engine/**`, because the
 * engine stays unit-agnostic and SI-only (DB-0 Decision 2, structural note).
 * This module is pure: no React, no DOM, no I/O — just arithmetic + formatting.
 *
 * Rounding happens ONLY here, at display time. Internally we keep full precision
 * (including the ± error band) so safety margins are never silently truncated.
 */

export type UnitSystem = 'metric' | 'imperial';

// ── Exact conversion factors ─────────────────────────────────────────────────
// (1 inch ≡ 2.54 cm by definition; 1 mile ≡ 1.609344 km.)
const M_PER_FT = 0.3048;
const CM_PER_IN = 2.54;
const KPH_PER_MPH = 1.609344;

// ── Length: metres ⇄ feet ────────────────────────────────────────────────────

export function mToFt(m: number): number {
  return m / M_PER_FT;
}
export function ftToM(ft: number): number {
  return ft * M_PER_FT;
}

// ── Length: centimetres ⇄ inches ─────────────────────────────────────────────

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}
export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

// ── Speed: kph ⇄ mph ─────────────────────────────────────────────────────────

export function kphToMph(kph: number): number {
  return kph / KPH_PER_MPH;
}
export function mphToKph(mph: number): number {
  return mph * KPH_PER_MPH;
}

/** Which physical quantity a value represents — picks the conversion + label. */
export type Quantity = 'distance' | 'diameter' | 'speed';

interface UnitSpec {
  /** SI → display value. */
  toDisplay: (si: number) => number;
  /** Display value → SI. */
  toSI: (display: number) => number;
  /** Abbreviated unit label shown next to the number. */
  label: string;
  /** Decimal places used when formatting. */
  decimals: number;
}

/**
 * The single lookup that maps (quantity, unit system) → how to convert + label
 * it. Distances render in m/ft, diameters (small) in cm/in, speeds in kph/mph.
 * Centralising this keeps every screen consistent and makes unit confusion —
 * the safety-auditor's chief worry — a single, testable surface.
 */
const UNIT_TABLE: Record<Quantity, Record<UnitSystem, UnitSpec>> = {
  distance: {
    metric: { toDisplay: (m) => m, toSI: (m) => m, label: 'm', decimals: 1 },
    imperial: { toDisplay: mToFt, toSI: ftToM, label: 'ft', decimals: 1 },
  },
  diameter: {
    metric: { toDisplay: (cm) => cm, toSI: (cm) => cm, label: 'cm', decimals: 0 },
    imperial: { toDisplay: cmToIn, toSI: inToCm, label: 'in', decimals: 1 },
  },
  speed: {
    metric: { toDisplay: (kph) => kph, toSI: (kph) => kph, label: 'kph', decimals: 0 },
    imperial: { toDisplay: kphToMph, toSI: mphToKph, label: 'mph', decimals: 0 },
  },
};

export function unitLabel(quantity: Quantity, system: UnitSystem): string {
  return UNIT_TABLE[quantity][system].label;
}

/**
 * Format an SI value for display in the chosen unit system, e.g.
 * `formatLength(13.899, 'distance', 'imperial')` → `'45.6 ft'`.
 * Rounds only here; the stored SI value keeps full precision.
 */
export function formatLength(
  si: number,
  quantity: Quantity,
  system: UnitSystem,
  opts: { withUnit?: boolean } = {},
): string {
  const spec = UNIT_TABLE[quantity][system];
  const value = spec.toDisplay(si).toFixed(spec.decimals);
  return opts.withUnit === false ? value : `${value} ${spec.label}`;
}

/**
 * Parse a user-typed value (already in the chosen display unit) back to SI.
 * Returns `null` for blank/garbage input so callers can show a friendly error
 * instead of feeding `NaN` into the engine (which would throw). The unhappy path
 * is handled here, at the edge.
 */
export function parseLength(
  raw: string,
  quantity: Quantity,
  system: UnitSystem,
): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return UNIT_TABLE[quantity][system].toSI(n);
}

/**
 * Re-convert a user-facing display string from one unit system to another
 * (DB-2 Decision D2). Used when the global unit toggle flips while a value is
 * already typed/prefilled: parse the string in the OLD system back to SI, then
 * re-format it for the NEW system, so the number tracks its label instead of
 * silently reading wrong.
 *
 * Blank or unparseable input passes through UNCHANGED — we never clobber a field
 * the user has left empty or is mid-edit, and we never fabricate a number. If the
 * systems are identical the input is returned as-is (no spurious re-rounding).
 *
 * NOTE on drift: this round-trips through the *rounded* display string, so
 * repeated toggling could in principle creep. Callers that hold a canonical SI
 * value (see `useUnitField`) should reformat from that instead; this helper is
 * the fallback for state that only has the display string (e.g. hazard rows).
 */
export function convertDisplayValue(
  raw: string,
  quantity: Quantity,
  from: UnitSystem,
  to: UnitSystem,
): string {
  if (from === to) return raw;
  const si = parseLength(raw, quantity, from);
  if (si === null) return raw; // blank / garbage → leave it alone
  return formatLength(si, quantity, to, { withUnit: false });
}

/**
 * Format a height estimate as "H ± ΔH unit" in the chosen system, e.g.
 * `formatEstimate(13.899, 0.988, 'imperial')` → `'45.6 ± 3.2 ft'`. Both numbers
 * convert through the same factor so the band stays proportional.
 */
export function formatEstimate(
  heightM: number,
  errorM: number,
  system: UnitSystem,
): string {
  const h = formatLength(heightM, 'distance', system, { withUnit: false });
  const e = formatLength(errorM, 'distance', system, { withUnit: false });
  return `${h} ± ${e} ${unitLabel('distance', system)}`;
}
