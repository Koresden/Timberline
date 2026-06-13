import { describe, it, expect } from 'vitest';
import { measureByTangent, STICK_METHOD_STEPS } from '../../src/engine/measure';
import { ANGLE_ERROR_DEG, DISTANCE_ERROR_FRACTION } from '../../src/engine/constants';

/**
 * Measurement engine tests (HANDOFF §2.1).
 *
 * Tangent method:  H = distance × (tan(angleTop) + tan(angleBase))
 *   - base BELOW horizontal → angleBaseDeg positive → adds (the "+" branch)
 *   - base ABOVE horizontal (on a slope) → angleBaseDeg negative → tan negative
 *     → effectively the "−" branch of the §2.1 formula.
 *
 * Error model: ±1° angle (ANGLE_ERROR_DEG) and ±2% distance
 * (DISTANCE_ERROR_FRACTION) propagated WORST-CASE (linear sum of the absolute
 * partial-derivative contributions). We use worst-case rather than RSS because
 * the simulation consumes H+ΔH as a safety margin — over-estimating ΔH errs
 * toward a larger danger zone, which is the safe direction.
 */

const d2r = (d: number) => (d * Math.PI) / 180;

/** Reference worst-case ΔH, recomputed independently in the test. */
function expectedErr(distanceM: number, aTopDeg: number, aBaseDeg: number): number {
  const aT = d2r(aTopDeg);
  const aB = d2r(aBaseDeg);
  const secT2 = 1 / Math.cos(aT) ** 2;
  const secB2 = 1 / Math.cos(aB) ** 2;
  const dDist = distanceM * DISTANCE_ERROR_FRACTION;
  const dAng = d2r(ANGLE_ERROR_DEG);
  return (
    Math.abs(Math.tan(aT) + Math.tan(aB)) * dDist +
    Math.abs(distanceM * secT2) * dAng +
    Math.abs(distanceM * secB2) * dAng
  );
}

describe('measure/tangent — height & worst-case error', () => {
  it('FIXTURE 4 dependency: "+" branch, base below horizontal', () => {
    // distance 15 m, top +40°, base +5° (below horizontal).
    // H = 15·(tan40 + tan5) = 15·(0.83910 + 0.08749) = 13.8988 m
    // ΔH (worst) ≈ 0.2780 (dist) + 0.4461 (top) + 0.2638 (base) = 0.9879 m
    const r = measureByTangent({ distanceM: 15, angleTopDeg: 40, angleBaseDeg: 5 });
    expect(r.method).toBe('tangent');
    expect(r.heightM).toBeCloseTo(13.8988, 3);
    expect(r.errorM).toBeCloseTo(0.9879, 3);
    expect(r.errorM).toBeCloseTo(expectedErr(15, 40, 5), 9);
  });

  it('slope "−" branch: base ABOVE horizontal (negative base angle)', () => {
    // distance 20 m, top +35°, base −8° (uphill, base above horizontal).
    // H = 20·(tan35 + tan(−8)) = 20·(0.70021 − 0.14054) = 11.1933 m
    // ΔH (worst) ≈ 0.2239 + 0.5202 + 0.3560 = 1.1000 m
    const r = measureByTangent({ distanceM: 20, angleTopDeg: 35, angleBaseDeg: -8 });
    expect(r.heightM).toBeCloseTo(11.1933, 3);
    expect(r.errorM).toBeCloseTo(1.1000, 3);
  });

  it('error grows with distance and steepness (sanity)', () => {
    const near = measureByTangent({ distanceM: 10, angleTopDeg: 30, angleBaseDeg: 3 });
    const far = measureByTangent({ distanceM: 40, angleTopDeg: 30, angleBaseDeg: 3 });
    expect(far.errorM).toBeGreaterThan(near.errorM);
  });
});

describe('measure/tangent — unhappy path (sensor garbage)', () => {
  it('rejects NaN angles', () => {
    expect(() => measureByTangent({ distanceM: 15, angleTopDeg: NaN, angleBaseDeg: 5 })).toThrow();
  });
  it('rejects non-finite distance', () => {
    expect(() =>
      measureByTangent({ distanceM: Infinity, angleTopDeg: 40, angleBaseDeg: 5 }),
    ).toThrow();
  });
  it('rejects non-positive distance', () => {
    expect(() => measureByTangent({ distanceM: 0, angleTopDeg: 40, angleBaseDeg: 5 })).toThrow();
    expect(() => measureByTangent({ distanceM: -5, angleTopDeg: 40, angleBaseDeg: 5 })).toThrow();
  });
  it('rejects out-of-range angles (≥90° → tan blows up / vertical sighting)', () => {
    expect(() => measureByTangent({ distanceM: 15, angleTopDeg: 90, angleBaseDeg: 5 })).toThrow();
    expect(() => measureByTangent({ distanceM: 15, angleTopDeg: 40, angleBaseDeg: -90 })).toThrow();
  });
  it('rejects a negative computed height (garbage geometry)', () => {
    // top below base would yield negative H — physically impossible.
    expect(() => measureByTangent({ distanceM: 15, angleTopDeg: 2, angleBaseDeg: -40 })).toThrow();
  });
});

describe('measure/stick — guided checklist, not math', () => {
  it('exposes ordered checklist steps (no numeric solve)', () => {
    expect(Array.isArray(STICK_METHOD_STEPS)).toBe(true);
    expect(STICK_METHOD_STEPS.length).toBeGreaterThanOrEqual(3);
    for (const s of STICK_METHOD_STEPS) {
      expect(typeof s).toBe('string');
    }
  });
});
