import { describe, it, expect } from 'vitest';
import {
  normalizeAzimuth,
  angleDiff,
  angularSeparation,
  pointToRayDistanceM,
} from '../../src/engine/geometry';

describe('geometry/azimuth helpers', () => {
  it('normalizes into [0,360)', () => {
    expect(normalizeAzimuth(0)).toBe(0);
    expect(normalizeAzimuth(360)).toBe(0);
    expect(normalizeAzimuth(405)).toBe(45);
    expect(normalizeAzimuth(-45)).toBe(315);
  });

  it('signed difference wraps to (−180,180]', () => {
    expect(angleDiff(10, 0)).toBe(10);
    expect(angleDiff(350, 0)).toBe(-10);
    expect(angleDiff(0, 350)).toBe(10);
    expect(angularSeparation(350, 10)).toBe(20);
  });
});

describe('geometry/point-to-ray distance', () => {
  it('perpendicular when alongside the ray', () => {
    // ray points north (0°), length 20. Point 5 m due east of base, 10 m north:
    // place via polar: distance hypot(5,10)=11.18, azimuth atan2(east,north).
    // Simpler: point directly east at 5 m, azimuth 90, abeam the ray within length.
    const d = pointToRayDistanceM(5, 90, 0, 20);
    expect(d).toBeCloseTo(5, 6); // perpendicular distance is the full 5 m east
  });

  it('clamps to the origin when behind the base', () => {
    // point due south (180°) at 7 m; ray points north → nearest point is origin.
    const d = pointToRayDistanceM(7, 180, 0, 20);
    expect(d).toBeCloseTo(7, 6);
  });

  it('clamps to the tip when beyond the ray length', () => {
    // point due north at 30 m; ray north length 20 → nearest is the tip, 10 m away.
    const d = pointToRayDistanceM(30, 0, 0, 20);
    expect(d).toBeCloseTo(10, 6);
  });
});
