/**
 * PURE presentational geometry for the Simulate views (no React, no DOM).
 *
 * Three concerns, all unit-tested in tests/simulate.test.ts:
 *  1. azimuth → SVG coordinate mapping (top view), and the m↔px scale that fits
 *     the danger circle on a phone screen;
 *  2. the side-view fall curve θ(t) — a smoothstep 0 → ~90°, with a hinge-hold
 *     boundary and a height-scaled duration.
 *
 * Engine purity is one-directional: this file may consume nothing from the
 * engine except plain numbers passed in. It computes NO felling geometry — the
 * corridor/danger/collision all come from `src/engine/sim.ts`. Here we only map
 * already-computed metres/azimuths to screen space and animate a rigid rod.
 *
 * ## Coordinate frames (get this right — it's the #1 bug source)
 * The ENGINE frame is math-style: x = east, y = NORTH (y grows up), azimuth A
 * (deg cw from north) → world vector (sin A, cos A). Obstacle positions are
 * stored in THIS frame so they pass straight into `checkCorridor` untouched.
 *
 * SVG screen space has y growing DOWNWARD. So at the render boundary ONLY we
 * flip y: an engine point (xEast, yNorth) → screen (cx + xEast·s, cy − yNorth·s),
 * and an azimuth A → screen direction (sin A, −cos A). All the flipping lives in
 * the two functions below; nothing else should touch the sign of y.
 */

// ── Top view: azimuth → SVG ──────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

/**
 * Screen-space endpoint of a ray of pixel `length` from centre (cx, cy) along
 * azimuth `azimuthDeg` (degrees clockwise from north). SVG y grows down, so the
 * north component is negated: A → (sin A, −cos A).
 */
export function azimuthToScreen(
  azimuthDeg: number,
  length: number,
  cx: number,
  cy: number,
): Point {
  const r = (azimuthDeg * Math.PI) / 180;
  return {
    x: cx + Math.sin(r) * length,
    y: cy - Math.cos(r) * length,
  };
}

/**
 * Map an engine-frame point (metres, x = east, y = north) to SVG screen space.
 * `scalePxPerM` is pixels-per-metre; (cx, cy) is the tree base in screen space.
 * The y axis is flipped here (north is up on screen, but SVG y grows down).
 */
export function metresToScreen(
  xEastM: number,
  yNorthM: number,
  scalePxPerM: number,
  cx: number,
  cy: number,
): Point {
  return {
    x: cx + xEastM * scalePxPerM,
    y: cy - yNorthM * scalePxPerM,
  };
}

/**
 * Pixels-per-metre that fits a circle of `worldRadiusM` (the danger circle —
 * the largest thing we draw) inside a square viewport of side `viewSizePx`,
 * leaving `marginPx` of breathing room on every edge so labels/obstacle handles
 * aren't clipped. Returns a positive, finite scale; clamps a degenerate radius
 * to avoid divide-by-zero / Infinity.
 */
export function fitScalePxPerM(
  worldRadiusM: number,
  viewSizePx: number,
  marginPx: number,
): number {
  const usableHalf = Math.max(1, viewSizePx / 2 - marginPx);
  const r = Math.max(worldRadiusM, 0.001);
  return usableHalf / r;
}

// ── Side view: the fall curve θ(t) ───────────────────────────────────────────

/** Angle (deg) at which the hinge is annotated to give way to free fall.
 *  HANDOFF §2.3: "hinge holding until ~60°, then free fall annotation." */
export const HINGE_HOLD_DEG = 60;

/** The rod sweeps from upright (0°) to flat on the ground (90°). */
export const FALL_TOTAL_DEG = 90;

/** Base fall duration (ms) for a nominal tree, scaled by height below. */
const FALL_BASE_MS = 1800;
/** Per-metre additional duration (ms) — taller trees take visibly longer. */
const FALL_MS_PER_M = 55;
/** Clamp so the animation is never jarringly fast or tediously slow. */
const FALL_MIN_MS = 1500;
const FALL_MAX_MS = 3200;

/**
 * Total fall animation duration (ms), scaled by tree height. HANDOFF §2.3
 * accepts "a smoothstep over ~2.5 s scaled by height". A 15 m tree lands near
 * the ~2.5 s target; taller trees take longer, within a clamped band. PURE.
 */
export function fallDurationMs(heightM: number): number {
  const h = Number.isFinite(heightM) && heightM > 0 ? heightM : 0;
  const raw = FALL_BASE_MS + FALL_MS_PER_M * h;
  return Math.min(FALL_MAX_MS, Math.max(FALL_MIN_MS, raw));
}

/** Smoothstep easing on [0,1] (3t² − 2t³): zero velocity at both ends. PURE. */
export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Fall angle θ (degrees, 0 = upright, 90 = down) at elapsed time `tMs` over a
 * total `durationMs`. Monotonic non-decreasing 0 → 90, eased by smoothstep so
 * the rod starts and finishes gently. Honest kinematic visualization, NOT a
 * physics model — flagged as such in the UI. PURE.
 */
export function fallAngleAtTime(tMs: number, durationMs: number): number {
  if (!(durationMs > 0)) return FALL_TOTAL_DEG;
  const frac = tMs <= 0 ? 0 : tMs >= durationMs ? 1 : tMs / durationMs;
  return smoothstep(frac) * FALL_TOTAL_DEG;
}

/** Whether the hinge is still annotated as "holding" at fall angle `thetaDeg`. */
export function hingeHolds(thetaDeg: number): boolean {
  return thetaDeg < HINGE_HOLD_DEG;
}
