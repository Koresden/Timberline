/**
 * Pure angle/geometry helpers shared by plan.ts and sim.ts.
 *
 * Azimuths are degrees clockwise from north (0–360). Distances are SI (m).
 * No side effects, no I/O — inputs in, outputs out.
 */

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/** Normalize any angle to [0, 360). */
export function normalizeAzimuth(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Smallest signed difference a − b, wrapped to (−180, 180].
 * Positive = a is clockwise of b.
 */
export function angleDiff(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

/** Absolute angular separation between two azimuths, in [0, 180]. */
export function angularSeparation(a: number, b: number): number {
  return Math.abs(angleDiff(a, b));
}

/**
 * Perpendicular distance (m) from a point to a RAY that starts at the origin
 * (the tree base) and runs out along `rayAzimuth` for `rayLengthM`.
 *
 * The point is given in polar form relative to the origin: `pointDistanceM` out
 * along `pointAzimuth`. We project onto the ray direction:
 *   - if the projection is behind the origin (t < 0) → distance to the origin;
 *   - if beyond the ray tip (t > rayLengthM) → distance to the tip;
 *   - otherwise → the true perpendicular distance to the ray line.
 *
 * Used for "hazard within k×height of a feasible fall line": the fall line is a
 * ray from the base out along a candidate fall azimuth.
 */
export function pointToRayDistanceM(
  pointDistanceM: number,
  pointAzimuth: number,
  rayAzimuth: number,
  rayLengthM: number,
): number {
  // Component of the point along the ray, and perpendicular to it.
  const delta = angleDiff(pointAzimuth, rayAzimuth) * DEG_TO_RAD;
  const along = pointDistanceM * Math.cos(delta);
  const perp = Math.abs(pointDistanceM * Math.sin(delta));

  if (along < 0) {
    // Behind the base: nearest point on the ray is the origin.
    return pointDistanceM;
  }
  if (along > rayLengthM) {
    // Past the tip: nearest point is the tip.
    const dxAlong = along - rayLengthM;
    return Math.hypot(dxAlong, perp);
  }
  return perp;
}
