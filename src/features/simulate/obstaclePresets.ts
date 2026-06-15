/**
 * Obstacle presets for the top view (presentational data only — no engine math).
 *
 * Each preset builds an engine `Obstacle` in the ENGINE frame (metres, x = east,
 * y = north) so it can be fed straight into `checkCorridor`. A `PlacedObstacle`
 * wraps it with a stable id + label for React keys and the legend. New obstacles
 * are dropped a little NORTH of the base (in front of the typical fall line) so
 * the user immediately sees them and can drag them into / out of the corridor.
 *
 * Half-extents convention matches `sim.ts`: rect width/height are HALF-widths.
 */
import type { Obstacle } from '../../engine/sim';

export type ObstacleKind = 'house' | 'fence' | 'vehicle' | 'tree';

export interface PlacedObstacle {
  id: string;
  kind: ObstacleKind;
  label: string;
  obstacle: Obstacle;
}

interface PresetSpec {
  label: string;
  make: (x: number, y: number) => Obstacle;
}

/** Default footprints (metres). Half-extents for rects; radius for circles. */
const PRESETS: Record<ObstacleKind, PresetSpec> = {
  house: {
    label: 'House',
    make: (x, y) => ({ shape: 'rect', x, y, width: 4, height: 3 }),
  },
  fence: {
    label: 'Fence',
    make: (x, y) => ({ shape: 'rect', x, y, width: 3, height: 0.3 }),
  },
  vehicle: {
    label: 'Vehicle',
    make: (x, y) => ({ shape: 'rect', x, y, width: 2.2, height: 1 }),
  },
  tree: {
    label: 'Tree',
    make: (x, y) => ({ shape: 'circle', x, y, radius: 1.5 }),
  },
};

export const OBSTACLE_KINDS = Object.keys(PRESETS) as ObstacleKind[];

export function obstacleLabel(kind: ObstacleKind): string {
  return PRESETS[kind].label;
}

let counter = 0;

/**
 * Build a new placed obstacle of `kind`, positioned at (xM, yM) in the engine
 * frame. Default drop point is a few metres NORTH of the base so it lands in
 * view; the caller can override to drop it elsewhere.
 */
export function createObstacle(
  kind: ObstacleKind,
  xM = 0,
  yM = 8,
): PlacedObstacle {
  const spec = PRESETS[kind];
  counter += 1;
  return {
    id: `${kind}-${counter}`,
    kind,
    label: spec.label,
    obstacle: spec.make(xM, yM),
  };
}

/** Return a copy of `placed` with its obstacle moved to (xM, yM) (engine frame). */
export function moveObstacle(
  placed: PlacedObstacle,
  xM: number,
  yM: number,
): PlacedObstacle {
  return { ...placed, obstacle: { ...placed.obstacle, x: xM, y: yM } };
}
