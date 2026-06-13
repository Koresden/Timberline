/**
 * Tree-height measurement (HANDOFF §2.1).
 *
 * Tangent (clinometer) method with worst-case error propagation, plus the
 * stick-method guided checklist (data only — no numeric solve).
 *
 * Pure, dependency-free, SI throughout (m, degrees). UI consumes this; the
 * engine never reaches back into UI.
 */
import type { HeightEstimate } from './types';
import { ANGLE_ERROR_DEG, DISTANCE_ERROR_FRACTION } from './constants';

export interface TangentInput {
  /** Horizontal distance to the tree (m). */
  distanceM: number;
  /** Angle to the top, above horizontal (degrees). */
  angleTopDeg: number;
  /** Angle to the base (degrees): positive = below horizontal, negative = above
   *  horizontal (on a slope, sighting uphill at the base). */
  angleBaseDeg: number;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Largest finite sighting angle we accept (degrees). At/above this the tangent
 * explodes toward infinity and the geometry is unusable (you'd be standing under
 * the tree). Kept just below 90° so `tan` and `sec²` stay finite and bounded.
 */
const MAX_SIGHT_ANGLE_DEG = 89;

function assertFiniteNumber(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`measure.measureByTangent: ${label} must be a finite number (got ${value}).`);
  }
}

/**
 * Tangent method.
 *
 *   H = distance × (tan(angleTop) + tan(angleBase))
 *
 * The §2.1 "−" branch (base above horizontal on a slope) is expressed by passing
 * a NEGATIVE `angleBaseDeg`: tan of a negative angle is negative, so the formula
 * subtracts automatically. One branch of arithmetic, two physical cases.
 *
 * ## Error model — WORST CASE, by design.
 * We propagate ±ANGLE_ERROR_DEG and ±DISTANCE_ERROR_FRACTION as the linear sum
 * of the absolute partial-derivative contributions:
 *
 *   ΔH = |∂H/∂d|·Δd + |∂H/∂aT|·ΔaT + |∂H/∂aB|·ΔaB
 *      = |tan aT + tan aB|·(d·f)
 *      + d·sec²(aT)·(ε·π/180)
 *      + d·sec²(aB)·(ε·π/180)
 *
 * This is deliberately more conservative than root-sum-square: the simulation
 * uses H+ΔH as the danger-zone radius, so an over-estimate of ΔH only ever
 * enlarges the safety margin. Over-estimating the danger zone is the safe error.
 */
export function measureByTangent(input: TangentInput): HeightEstimate {
  const { distanceM, angleTopDeg, angleBaseDeg } = input;

  assertFiniteNumber(distanceM, 'distanceM');
  assertFiniteNumber(angleTopDeg, 'angleTopDeg');
  assertFiniteNumber(angleBaseDeg, 'angleBaseDeg');

  if (distanceM <= 0) {
    throw new Error(`measure.measureByTangent: distanceM must be positive (got ${distanceM}).`);
  }
  if (Math.abs(angleTopDeg) > MAX_SIGHT_ANGLE_DEG || Math.abs(angleBaseDeg) > MAX_SIGHT_ANGLE_DEG) {
    throw new Error(
      `measure.measureByTangent: sighting angles must be within ±${MAX_SIGHT_ANGLE_DEG}° ` +
        `(got top=${angleTopDeg}, base=${angleBaseDeg}).`,
    );
  }

  const aT = angleTopDeg * DEG_TO_RAD;
  const aB = angleBaseDeg * DEG_TO_RAD;
  const tanT = Math.tan(aT);
  const tanB = Math.tan(aB);

  const heightM = distanceM * (tanT + tanB);
  if (!Number.isFinite(heightM) || heightM <= 0) {
    throw new Error(
      `measure.measureByTangent: computed a non-positive height (${heightM}); ` +
        'the top sighting must be above the base sighting.',
    );
  }

  const secT2 = 1 / Math.cos(aT) ** 2;
  const secB2 = 1 / Math.cos(aB) ** 2;
  const distErr = distanceM * DISTANCE_ERROR_FRACTION;
  const angErrRad = ANGLE_ERROR_DEG * DEG_TO_RAD;

  const contribDist = Math.abs(tanT + tanB) * distErr;
  const contribTop = Math.abs(distanceM * secT2) * angErrRad;
  const contribBase = Math.abs(distanceM * secB2) * angErrRad;
  const errorM = contribDist + contribTop + contribBase;

  return { heightM, errorM, method: 'tangent' };
}

/**
 * Stick (45°) method — a guided checklist, NOT a numeric solve (HANDOFF §2.1 B).
 * Exposed as ordered data so the UI can render it as a step list. There is no
 * height arithmetic here: the user walks until the geometry is satisfied and the
 * distance walked ≈ the height.
 */
export const STICK_METHOD_STEPS: readonly string[] = [
  'Hold a straight stick upright at arm’s length, gripped at the bottom.',
  'Slide your grip so the length of stick above your hand equals the distance from your hand to your eye.',
  'Keeping the stick vertical, walk toward or away from the tree.',
  'Stop when the top of the stick lines up with the treetop and your hand lines up with the tree’s base.',
  'The horizontal distance from you to the tree base now ≈ the tree’s height. Pace or tape it.',
] as const;
