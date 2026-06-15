/**
 * Top view (SVG, plan view from above) — the live go/no-go surface.
 *
 * Renders, from the engine's geometry (we compute NONE of it here):
 *  - the fall-corridor wedge (apex at the base, `axisAzimuth`, `halfAngleDeg`),
 *    split into a solid footprint band and a HATCHED bounce/roll extension
 *    (the engine's corridor length already includes the 20% extension);
 *  - the 2× tree-height danger circle (`dangerRadiusM`);
 *  - draggable obstacles (rect/circle) the user adds and drags (pointer events,
 *    mouse + touch). Positions live in the ENGINE frame (m, x=east, y=north) so
 *    they feed straight into `checkCorridor`.
 *
 * On ANY change (drag/add/remove/plan) we re-run `checkCorridor` INSTANTLY (no
 * submit). Conflicting obstacles pulse red (CSS on --danger) and the verdict
 * downgrades to a clear no-go. North is up; azimuth A → screen (sin A, −cos A);
 * y is flipped only at this render boundary (see geometry.ts). SVG, all colours
 * via CSS variables (CLAUDE.md §3).
 */
import { useMemo, useRef, useState } from 'react';
import type { ActionablePlan, PlanInput } from '../../engine/types';
import type { Obstacle } from '../../engine/sim';
import { buildCorridor, checkCorridor } from '../../engine/sim';
import { BOUNCE_ROLL_EXTENSION_FRACTION } from '../../engine/constants';
import {
  azimuthToScreen,
  fitScalePxPerM,
  metresToScreen,
  type Point,
} from './geometry';
import {
  OBSTACLE_KINDS,
  createObstacle,
  moveObstacle,
  obstacleLabel,
  type PlacedObstacle,
} from './obstaclePresets';

interface TopViewProps {
  plan: ActionablePlan;
  /** Raw input, if available — its residual lean / wind widen the wedge. */
  input: PlanInput | null;
  /** Pre-formatted danger radius (already unit-converted via useUnits). */
  dangerRadiusLabel: string;
}

const VIEW = 320; // square viewport (px)
const CENTER = VIEW / 2;
const MARGIN = 26; // px breathing room so the danger ring + labels aren't clipped

export function TopView({ plan, input, dangerRadiusLabel }: TopViewProps) {
  const [obstacles, setObstacles] = useState<PlacedObstacle[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragId = useRef<string | null>(null);

  // Residual lean component (not corrected by the hinge) + wind widen the wedge,
  // exactly the bonus `buildCorridor` expects. ActionablePlan alone carries
  // neither, so we pass them from the raw input when we have it.
  const residualLeanDeg = input ? Math.max(0, input.leanDeg) : 0;
  const windKph = input ? Math.max(0, input.windKph) : 0;

  const corridor = useMemo(
    () => buildCorridor(plan, residualLeanDeg, windKph),
    [plan, residualLeanDeg, windKph],
  );

  // m↔px scale: fit the danger circle (the largest thing) on screen.
  const scale = fitScalePxPerM(plan.dangerRadiusM, VIEW, MARGIN);

  // Live collision — re-runs on every render (drag/add/remove/plan change).
  const conflictIds = useMemo(() => {
    const raw = obstacles.map((o) => o.obstacle);
    const { conflicts } = checkCorridor(plan, raw);
    const conflictSet = new Set<Obstacle>(conflicts);
    return new Set(obstacles.filter((o) => conflictSet.has(o.obstacle)).map((o) => o.id));
  }, [obstacles, plan]);

  const conflictCount = conflictIds.size;
  const blocked = conflictCount > 0;

  // ── Pointer drag (mouse + touch) ───────────────────────────────────────────

  const screenToMetres = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    // Map client px → viewBox px → metres in the engine frame (flip y back).
    const vx = ((clientX - rect.left) / rect.width) * VIEW;
    const vy = ((clientY - rect.top) / rect.height) * VIEW;
    return {
      x: (vx - CENTER) / scale,
      y: -(vy - CENTER) / scale, // north is up; SVG y grows down
    };
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    dragId.current = id;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragId.current == null) return;
    const { x, y } = screenToMetres(e.clientX, e.clientY);
    setObstacles((prev) =>
      prev.map((o) => (o.id === dragId.current ? moveObstacle(o, x, y) : o)),
    );
  };

  const endDrag = () => {
    dragId.current = null;
  };

  const addObstacle = (kind: Parameters<typeof createObstacle>[0]) => {
    setObstacles((prev) => [...prev, createObstacle(kind)]);
  };
  const removeObstacle = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  };

  // ── Geometry → screen ───────────────────────────────────────────────────────

  const dangerR = plan.dangerRadiusM * scale;

  // Solid footprint band ends where the bounce/roll extension begins.
  const footprintLenM = corridor.lengthM / (1 + BOUNCE_ROLL_EXTENSION_FRACTION);
  const footprintWedge = wedgePath(corridor.axisAzimuth, corridor.halfAngleDeg, footprintLenM, scale);
  const fullWedge = wedgePath(corridor.axisAzimuth, corridor.halfAngleDeg, corridor.lengthM, scale);
  // Planned fell line: centerline from base along the fall azimuth (footprint length).
  const fellTip = azimuthToScreen(corridor.axisAzimuth, footprintLenM * scale, CENTER, CENTER);

  return (
    <section className="sim-topview">
      <div className="sim-topview-head">
        <h3>Top view — fall corridor</h3>
        <span
          className={`sim-verdict ${blocked ? 'sim-verdict--blocked' : 'sim-verdict--clear'}`}
          role="status"
          aria-live="polite"
        >
          {blocked
            ? `Fall path blocked — ${conflictCount} obstacle${conflictCount === 1 ? '' : 's'} in the corridor`
            : 'Clear — no obstacles in the fall path'}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width="100%"
        className="sim-topview-svg"
        role="img"
        aria-label={`Top-down fall plan, north up. ${blocked ? `${conflictCount} obstacles block the corridor.` : 'Corridor clear.'}`}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <pattern
            id="bounce-hatch"
            width="6"
            height="6"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--diagram-stroke)" strokeWidth="1.5" opacity="0.7" />
          </pattern>
          {/* Arrowhead for the planned fell line — accent (orange). */}
          <marker
            id="fell-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
          </marker>
        </defs>

        {/*
          Danger zone ring (2× tree height). Calm/clear = neutral dashed diagram
          stroke, NO red fill — red is reserved strictly for a real breach
          (SPEC §9). When an obstacle conflicts it switches to --danger.
        */}
        <circle
          className={`sim-danger-ring${blocked ? ' is-breached' : ''}`}
          cx={CENTER}
          cy={CENTER}
          r={dangerR}
          strokeDasharray="5 6"
        />

        {/* Bounce/roll extension — neutral hatched (hazard-check region only) */}
        <path d={fullWedge} fill="url(#bounce-hatch)" stroke="none" />
        {/* Fall corridor cone — accent (orange) @ ~16% fill */}
        <path
          d={footprintWedge}
          fill="var(--accent)"
          opacity={0.16}
          stroke="var(--accent)"
          strokeWidth={1.5}
        />
        {/* Planned fell line — accent centerline + arrowhead (SPEC §9) */}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={fellTip.x}
          y2={fellTip.y}
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd="url(#fell-arrow)"
        />

        {/* North marker */}
        <text x={CENTER} y={16} textAnchor="middle" className="diagram-label sim-map-label">
          N
        </text>

        {/* Obstacles */}
        {obstacles.map((o) => (
          <ObstacleShape
            key={o.id}
            placed={o}
            scale={scale}
            conflicting={conflictIds.has(o.id)}
            onPointerDown={onPointerDown(o.id)}
          />
        ))}

        {/* Tree base */}
        <circle cx={CENTER} cy={CENTER} r={5} fill="var(--diagram-stroke)" />
      </svg>

      <div className="sim-obstacle-bar">
        <span className="sim-obstacle-bar-label">Add:</span>
        {OBSTACLE_KINDS.map((kind) => (
          <button key={kind} type="button" className="btn sim-add-btn" onClick={() => addObstacle(kind)}>
            + {obstacleLabel(kind)}
          </button>
        ))}
      </div>

      {obstacles.length > 0 && (
        <ul className="sim-obstacle-list">
          {obstacles.map((o) => (
            <li key={o.id} className={conflictIds.has(o.id) ? 'is-conflict' : ''}>
              <span>{o.label}</span>
              <button type="button" className="btn btn-ghost" onClick={() => removeObstacle(o.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <figcaption className="sim-legend">
        <span className="legend legend--corridor">Fall corridor</span>
        <span className="legend legend--bounce">Bounce / roll (hatched)</span>
        <span className={`legend sim-legend-ring${blocked ? ' is-breached' : ''}`}>
          Danger {dangerRadiusLabel}
        </span>
        <span className="sim-legend-hint">Drag obstacles into the corridor to test the path.</span>
      </figcaption>
    </section>
  );
}

// ── Obstacle rendering ─────────────────────────────────────────────────────────

interface ObstacleShapeProps {
  placed: PlacedObstacle;
  scale: number;
  conflicting: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}

function ObstacleShape({ placed, scale, conflicting, onPointerDown }: ObstacleShapeProps) {
  const { obstacle, label } = placed;
  const center = metresToScreen(obstacle.x, obstacle.y, scale, CENTER, CENTER);
  const cls = `sim-obstacle${conflicting ? ' is-conflict' : ''}`;
  const common = {
    className: cls,
    onPointerDown,
    style: { cursor: 'grab', touchAction: 'none' as const },
    'aria-label': `${label}${conflicting ? ', conflicting with the fall corridor' : ''}`,
  };

  if (obstacle.shape === 'circle') {
    return (
      <g {...common}>
        <circle cx={center.x} cy={center.y} r={(obstacle.radius ?? 1) * scale} />
        <text x={center.x} y={center.y + 4} textAnchor="middle" className="sim-obstacle-label">
          {label}
        </text>
      </g>
    );
  }

  const w = (obstacle.width ?? 1) * scale;
  const h = (obstacle.height ?? 1) * scale;
  return (
    <g {...common}>
      <rect x={center.x - w} y={center.y - h} width={w * 2} height={h * 2} rx={2} />
      <text x={center.x} y={center.y + 4} textAnchor="middle" className="sim-obstacle-label">
        {label}
      </text>
    </g>
  );
}

// ── Wedge path builder (screen space) ──────────────────────────────────────────

/**
 * SVG path for a wedge: apex at the base, swept ±halfAngle around `axisAzimuth`,
 * out to `lengthM`. North up; azimuth → (sin, −cos). Polygonized with a handful
 * of segments so the far cap is curved-ish (purely cosmetic — collision is the
 * engine's job, done in the engine frame).
 */
function wedgePath(
  axisAzimuthDeg: number,
  halfAngleDeg: number,
  lengthM: number,
  scale: number,
): string {
  const lenPx = lengthM * scale;
  const segments = Math.max(2, Math.ceil(halfAngleDeg / 5));
  const pts: Point[] = [{ x: CENTER, y: CENTER }];
  for (let i = 0; i <= segments; i++) {
    const az = axisAzimuthDeg - halfAngleDeg + (i * (2 * halfAngleDeg)) / segments;
    pts.push(azimuthToScreen(az, lenPx, CENTER, CENTER));
  }
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
}
