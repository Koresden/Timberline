/**
 * Fall simulation geometry (HANDOFF §2.3).
 *
 * A kinematic visualization, NOT a physics engine. Phase 1 implements the PURE
 * geometry only: the fall corridor (a wedge on `fallAzimuth`), the bounce/roll
 * extension, and corridor ∩ obstacle collision for rectangles and circles. The
 * animated θ(t) arc and SVG rendering land with sim-dev in Phase 3.
 *
 * Coordinate frame: metres relative to the tree base, x = east, y = north.
 * Azimuths are degrees clockwise from north, so an azimuth A points toward
 * (sin A, cos A).
 *
 * ## Conservative by construction.
 * The corridor is a hazard-checking region: when we approximate (e.g. the far
 * cap of the wedge), we round so the tested region is never SMALLER than the
 * true one. Catching a spurious obstacle is acceptable; missing a real one is not.
 */
import type { ActionablePlan } from './types';
import * as C from './constants';
import { DEG_TO_RAD } from './geometry';

export interface Obstacle {
  shape: 'rect' | 'circle';
  /** Position relative to the tree base (m), x = east, y = north. */
  x: number;
  y: number;
  /** Half-extents (rect): half-width (x) and half-height (y), in m. */
  width?: number;
  height?: number;
  /** Radius (circle), in m. */
  radius?: number;
}

export interface CorridorCheck {
  /** Obstacles intersecting the fall corridor (incl. bounce/roll zone). */
  conflicts: Obstacle[];
}

export interface Corridor {
  /** Direction the corridor points (degrees cw from north). */
  axisAzimuth: number;
  /** Half-angle of the wedge (degrees) = steering cone + uncertainty bonus. */
  halfAngleDeg: number;
  /** Corridor length (m) = footprint (height+ΔH) × (1 + bounce/roll). */
  lengthM: number;
}

interface Vec {
  x: number;
  y: number;
}

/**
 * Build the fall corridor from a plan (and optional lean/wind for the
 * uncertainty bonus — see ambiguity #5).
 *
 * - Footprint (height + ΔH) is recovered from the plan's danger radius:
 *   dangerRadiusM = DANGER_RADIUS_HEIGHT_MULT × (height + ΔH), so footprint =
 *   dangerRadiusM / DANGER_RADIUS_HEIGHT_MULT. This keeps the worst-case height
 *   flowing through without the sim re-deriving ΔH.
 * - Half-angle = steeringConeDeg + uncertainty bonus, where the bonus is
 *   CORRIDOR_UNCERTAINTY_BASE_DEG plus per-degree-of-lean and per-kph-of-wind
 *   terms. `checkCorridor` calls this with lean/wind = 0, applying only the
 *   conservative base bonus, because an `ActionablePlan` alone does not carry
 *   lean or wind. A caller that still has the raw inputs may pass them for a
 *   wider, even more conservative wedge.
 *
 * ## `residualLeanDeg` (F3 — Phase 4 audit): widening only, never narrowing.
 * The name implies the lean component the hinge could NOT correct, but the UI
 * deliberately feeds it the RAW total lean magnitude. That is an ACCEPTED
 * conservative over-estimate: a larger value only WIDENS the corridor (more
 * obstacles caught), which is the safe direction. This parameter must NEVER be
 * used to NARROW the corridor below the value passed here — i.e. do not "optimize"
 * it to a smaller true-residual lean, as that would shrink the hazard-checking
 * wedge. `Math.abs` is applied below so a signed lean can only ever widen.
 *
 * Takes an `ActionablePlan` (DB-1 §4): a referral has no fall direction or
 * corridor, so the union is narrowed at the seam — only actionable plans are
 * simulated.
 */
export function buildCorridor(
  plan: ActionablePlan,
  residualLeanDeg = 0,
  windKph = 0,
): Corridor {
  const footprintM = plan.dangerRadiusM / C.DANGER_RADIUS_HEIGHT_MULT;
  const bonus =
    C.CORRIDOR_UNCERTAINTY_BASE_DEG +
    C.CORRIDOR_UNCERTAINTY_LEAN_MULT * Math.abs(residualLeanDeg) +
    C.CORRIDOR_UNCERTAINTY_WIND_MULT * Math.max(windKph, 0);
  return {
    axisAzimuth: plan.fallAzimuth,
    halfAngleDeg: plan.steeringConeDeg + bonus,
    lengthM: footprintM * (1 + C.BOUNCE_ROLL_EXTENSION_FRACTION),
  };
}

// ── Wedge polygonization (circumscribed → conservative) ──────────────────────

/**
 * Convert the wedge to a closed polygon in the local frame (axis along +Y).
 * The far cap is polygonized with several segments; arc vertices are pushed out
 * to the CIRCUMSCRIBED radius (length / cos(stepHalfAngle)) so the polygon fully
 * contains the true wedge — never smaller, so collision can't be missed.
 */
function wedgePolygon(halfAngleDeg: number, lengthM: number): Vec[] {
  const half = halfAngleDeg * DEG_TO_RAD;
  const segments = Math.max(2, Math.ceil(halfAngleDeg / 5)); // ~5° per segment
  const step = (2 * half) / segments;
  const circumR = lengthM / Math.cos(step / 2); // push arc vertices outward

  const pts: Vec[] = [{ x: 0, y: 0 }]; // wedge apex at the base
  for (let i = 0; i <= segments; i++) {
    const a = -half + i * step; // angle from +Y axis
    pts.push({ x: circumR * Math.sin(a), y: circumR * Math.cos(a) });
  }
  return pts;
}

/** Rotate world (east,north) into the corridor-local frame (axis → +Y). */
function toLocal(p: Vec, axisAzimuthDeg: number): Vec {
  // Axis direction in world = (sin A, cos A). Local +Y = axis, local +X = its
  // right-hand perpendicular. Rotate world by −A about the origin.
  const a = axisAzimuthDeg * DEG_TO_RAD;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // x' (right of axis) = x·cosA − y·sinA ; y' (along axis) = x·sinA + y·cosA
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

// ── Polygon primitives ────────────────────────────────────────────────────────

function pointInPolygon(pt: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersects =
      a.y > pt.y !== b.y > pt.y &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distPointToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function distPointToPolygon(p: Vec, poly: Vec[]): number {
  if (pointInPolygon(p, poly)) return 0;
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    min = Math.min(min, distPointToSegment(p, poly[j], poly[i]));
  }
  return min;
}

function segmentsIntersect(a: Vec, b: Vec, c: Vec, d: Vec): boolean {
  const cross = (o: Vec, p: Vec, q: Vec) =>
    (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function polygonsIntersect(p: Vec[], q: Vec[]): boolean {
  // Any vertex of one inside the other → overlap.
  if (p.some((v) => pointInPolygon(v, q))) return true;
  if (q.some((v) => pointInPolygon(v, p))) return true;
  // Any edges crossing → overlap.
  for (let i = 0, pj = p.length - 1; i < p.length; pj = i++) {
    for (let k = 0, qj = q.length - 1; k < q.length; qj = k++) {
      if (segmentsIntersect(p[pj], p[i], q[qj], q[k])) return true;
    }
  }
  return false;
}

// ── Obstacle ∩ corridor ────────────────────────────────────────────────────────

function obstacleIntersectsWedge(obstacle: Obstacle, wedge: Vec[], axisAzimuth: number): boolean {
  if (obstacle.shape === 'circle') {
    if (obstacle.radius == null || !Number.isFinite(obstacle.radius) || obstacle.radius < 0) {
      throw new Error('sim.checkCorridor: circle obstacle needs a finite, non-negative radius.');
    }
    const center = toLocal({ x: obstacle.x, y: obstacle.y }, axisAzimuth);
    return distPointToPolygon(center, wedge) <= obstacle.radius;
  }

  // rect
  if (
    obstacle.width == null ||
    obstacle.height == null ||
    !Number.isFinite(obstacle.width) ||
    !Number.isFinite(obstacle.height) ||
    obstacle.width < 0 ||
    obstacle.height < 0
  ) {
    throw new Error('sim.checkCorridor: rect obstacle needs finite, non-negative width/height half-extents.');
  }
  const cx = obstacle.x;
  const cy = obstacle.y;
  const hw = obstacle.width;
  const hh = obstacle.height;
  const cornersWorld: Vec[] = [
    { x: cx - hw, y: cy - hh },
    { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh },
    { x: cx - hw, y: cy + hh },
  ];
  const cornersLocal = cornersWorld.map((c) => toLocal(c, axisAzimuth));
  return polygonsIntersect(cornersLocal, wedge);
}

/**
 * Obstacles intersecting the fall corridor (including the bounce/roll zone).
 * Pure: inputs in, conflicts out.
 */
export function checkCorridor(plan: ActionablePlan, obstacles: Obstacle[]): CorridorCheck {
  const corridor = buildCorridor(plan);
  const wedge = wedgePolygon(corridor.halfAngleDeg, corridor.lengthM);
  const conflicts = obstacles.filter((o) =>
    obstacleIntersectsWedge(o, wedge, corridor.axisAzimuth),
  );
  return { conflicts };
}
