import { describe, it, expect } from 'vitest';
import { checkCorridor, buildCorridor, type Obstacle } from '../../src/engine/sim';
import type { FellingPlan } from '../../src/engine/types';
import * as C from '../../src/engine/constants';

/**
 * Fall-simulation geometry tests (HANDOFF §2.3). Pure geometry only — no
 * animation, no SVG.
 *
 * Corridor = wedge centered on plan.fallAzimuth, half-angle =
 * plan.steeringConeDeg + uncertainty bonus. Footprint length = (height + ΔH),
 * recovered from plan.dangerRadiusM / DANGER_RADIUS_HEIGHT_MULT. Bounce/roll
 * extends the corridor BOUNCE_ROLL_EXTENSION_FRACTION past the tip.
 */

/** A plan that falls due NORTH (0°), 20 m worst-case footprint, 5° steering cone. */
function northPlan(overrides: Partial<FellingPlan> = {}): FellingPlan {
  return {
    verdict: 'ok',
    notch: { type: 'open-face', openingDeg: 70, depthCm: 10 },
    hinge: { thicknessCm: 3, lengthCm: 24 },
    backCut: { offsetCm: 2.5, boreCut: false, wedges: 0 },
    fallAzimuth: 0,
    steeringConeDeg: 5,
    escapeAzimuths: [135, 225],
    // footprint = dangerRadius / 2 = 20 m.
    dangerRadiusM: 40,
    reasons: [],
    ...overrides,
  };
}

/** Build an obstacle in polar form relative to the base (x=east, y=north). */
function atPolar(distanceM: number, azimuthDeg: number, radius = 0.5): Obstacle {
  const r = (azimuthDeg * Math.PI) / 180;
  return { shape: 'circle', x: distanceM * Math.sin(r), y: distanceM * Math.cos(r), radius };
}

describe('sim/buildCorridor', () => {
  it('half-angle = steeringCone + uncertainty base bonus; length includes bounce/roll', () => {
    const c = buildCorridor(northPlan());
    expect(c.axisAzimuth).toBe(0);
    expect(c.halfAngleDeg).toBeCloseTo(5 + C.CORRIDOR_UNCERTAINTY_BASE_DEG, 6);
    // footprint 20 m, +20% bounce/roll → 24 m.
    expect(c.lengthM).toBeCloseTo(20 * (1 + C.BOUNCE_ROLL_EXTENSION_FRACTION), 6);
  });
});

describe('sim/checkCorridor — obstacle in the fall path', () => {
  it('a circle squarely in the corridor is flagged', () => {
    // 10 m due north, dead center of a north-falling corridor.
    const p = northPlan();
    const obstacles = [atPolar(10, 0, 1)];
    const r = checkCorridor(p, obstacles);
    expect(r.conflicts).toHaveLength(1);
  });

  it('an obstacle behind the tree (opposite the fall) is NOT flagged', () => {
    // 10 m due SOUTH (180°) — behind a north fall → outside the corridor.
    const p = northPlan();
    const r = checkCorridor(p, [atPolar(10, 180, 1)]);
    expect(r.conflicts).toHaveLength(0);
  });

  it('an obstacle beyond the footprint but inside the bounce/roll zone IS flagged', () => {
    // footprint 20 m, bounce/roll to 24 m. Obstacle at 22 m due north → caught
    // only by the bounce/roll extension.
    const p = northPlan();
    const r = checkCorridor(p, [atPolar(22, 0, 0.5)]);
    expect(r.conflicts).toHaveLength(1);
  });

  it('an obstacle past the bounce/roll zone is NOT flagged', () => {
    // 30 m due north > 24 m bounce/roll tip → clear.
    const p = northPlan();
    const r = checkCorridor(p, [atPolar(30, 0, 0.5)]);
    expect(r.conflicts).toHaveLength(0);
  });

  it('an obstacle just outside the angular wedge is NOT flagged', () => {
    // half-angle = 5 + base bonus. Put an obstacle far off-axis (due east, 90°).
    const p = northPlan();
    const r = checkCorridor(p, [atPolar(10, 90, 0.5)]);
    expect(r.conflicts).toHaveLength(0);
  });

  it('a wide obstacle clipping the wedge edge IS flagged (radius reaches in)', () => {
    // Obstacle centered just outside the wedge but with a big radius that reaches
    // into it. half-angle ~10° at 10 m → lateral edge ≈ 10·tan(10°) ≈ 1.76 m east.
    // Center it 3 m east at 10 m north with radius 2 → it overlaps the wedge.
    const p = northPlan();
    const r = checkCorridor(p, [{ shape: 'circle', x: 3, y: 10, radius: 2 }]);
    expect(r.conflicts).toHaveLength(1);
  });
});

describe('sim/checkCorridor — rectangle obstacles', () => {
  it('a rectangle (house) straddling the corridor is flagged', () => {
    // Rect centered 12 m north, half-extents 4 m × 2 m → spans the corridor.
    const p = northPlan();
    const rect: Obstacle = { shape: 'rect', x: 0, y: 12, width: 4, height: 2 };
    expect(checkCorridor(p, [rect]).conflicts).toHaveLength(1);
  });

  it('a rectangle entirely to the side is not flagged', () => {
    // Rect centered 20 m east, 0 north → off the north corridor entirely.
    const p = northPlan();
    const rect: Obstacle = { shape: 'rect', x: 20, y: 0, width: 2, height: 2 };
    expect(checkCorridor(p, [rect]).conflicts).toHaveLength(0);
  });
});

describe('sim/checkCorridor — fall direction follows the plan', () => {
  it('rotating the fall azimuth rotates the corridor', () => {
    // Same obstacle due EAST (90°): clear for a north fall, flagged for an east fall.
    const obstacle = atPolar(10, 90, 1);
    expect(checkCorridor(northPlan({ fallAzimuth: 0 }), [obstacle]).conflicts).toHaveLength(0);
    expect(checkCorridor(northPlan({ fallAzimuth: 90 }), [obstacle]).conflicts).toHaveLength(1);
  });
});

describe('sim/checkCorridor — unhappy path', () => {
  it('rejects an obstacle with no usable shape data', () => {
    const p = northPlan();
    // circle with no radius
    expect(() => checkCorridor(p, [{ shape: 'circle', x: 1, y: 1 }])).toThrow();
    // rect with no extents
    expect(() => checkCorridor(p, [{ shape: 'rect', x: 1, y: 1 }])).toThrow();
  });
});
