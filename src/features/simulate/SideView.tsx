/**
 * Side view (SVG elevation) — the tree as a rigid rod rotating about the hinge.
 *
 * On "Simulate" we animate θ(t) from upright (0°) to flat (90°) using the PURE
 * `fallAngleAtTime` smoothstep (tested in tests/simulate.test.ts) driven by
 * requestAnimationFrame. The annotation reads "hinge holds" until ~60°, then
 * "free fall" past it (HANDOFF §2.3). Re-runnable; the angle resets to upright
 * whenever the plan/height changes.
 *
 * Honest framing: this is a KINEMATIC visualization, not a physics engine —
 * stated in the caption so nobody mistakes it for a load model.
 *
 * All colours come from CSS variables (re-theme-ready). SVG, not canvas
 * (CLAUDE.md §3).
 */
import { useEffect, useRef, useState } from 'react';
import {
  FALL_TOTAL_DEG,
  HINGE_HOLD_DEG,
  fallAngleAtTime,
  fallDurationMs,
  hingeHolds,
} from './geometry';

interface SideViewProps {
  /** Worst-case tree height (m) — scales rod length and fall duration. */
  heightM: number;
}

const VIEW_W = 320;
const VIEW_H = 220;
const GROUND_Y = 188; // baseline (px) the hinge sits on
const HINGE_X = 70; // hinge pivot x (px), left side so the rod falls rightward
const ROD_PX = 150; // rendered rod length (px) — height is shown numerically

export function SideView({ heightM }: SideViewProps) {
  const [thetaDeg, setThetaDeg] = useState(0);
  const [running, setRunning] = useState(false);
  const rafRef = useRef<number | null>(null);

  const durationMs = fallDurationMs(heightM);

  // Reset to upright whenever the source height changes (re-render on input change).
  useEffect(() => {
    cancelRaf(rafRef);
    setRunning(false);
    setThetaDeg(0);
  }, [heightM]);

  // Clean up any in-flight animation on unmount.
  useEffect(() => () => cancelRaf(rafRef), []);

  const runFall = () => {
    cancelRaf(rafRef);
    setRunning(true);
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const theta = fallAngleAtTime(elapsed, durationMs);
      setThetaDeg(theta);
      if (elapsed < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setThetaDeg(FALL_TOTAL_DEG);
        setRunning(false);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Rod tip: θ measured from upright, falling clockwise toward +x (rightward).
  // Screen y grows down, so a tip at angle θ from vertical is
  //   (HINGE_X + sin θ · L, GROUND_Y − cos θ · L).
  const r = (thetaDeg * Math.PI) / 180;
  const tipX = HINGE_X + Math.sin(r) * ROD_PX;
  const tipY = GROUND_Y - Math.cos(r) * ROD_PX;

  // Static predicted-path guide: the tip's quarter-circle from upright to flat.
  // Cosmetic only — does not drive the θ(t) animation. Impact = tip when flat.
  const impactX = HINGE_X + ROD_PX;
  const arcPath = `M${HINGE_X},${GROUND_Y - ROD_PX} A${ROD_PX},${ROD_PX} 0 0 1 ${impactX},${GROUND_Y}`;

  const holding = hingeHolds(thetaDeg);
  const phaseLabel = thetaDeg <= 0 ? 'Upright' : holding ? 'Hinge holds' : 'Free fall';
  const phaseClass = thetaDeg <= 0 ? 'sim-phase--idle' : holding ? 'sim-phase--hold' : 'sim-phase--free';

  return (
    <section className="sim-sideview">
      <div className="sim-sideview-head">
        <h3>Side view — fall arc</h3>
        <span className={`sim-phase ${phaseClass}`}>{phaseLabel}</span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        role="img"
        aria-label={`Side elevation of the tree falling. Current fall angle ${Math.round(thetaDeg)} degrees; ${holding ? 'hinge holding' : 'free fall'}.`}
      >
        {/* Ground line */}
        <line
          x1={0}
          y1={GROUND_Y}
          x2={VIEW_W}
          y2={GROUND_Y}
          stroke="var(--diagram-stroke)"
          strokeWidth={1.5}
        />

        {/* Impact zone — where the tip lands when flat (dashed zone marker). */}
        <line
          x1={impactX - 14}
          y1={GROUND_Y}
          x2={impactX + 14}
          y2={GROUND_Y}
          stroke="var(--diagram-stroke)"
          strokeWidth={2}
          strokeDasharray="5 6"
        />
        <text x={impactX} y={GROUND_Y + 18} textAnchor="middle" className="diagram-label sim-map-label">
          impact
        </text>

        {/* Predicted fall arc — accent, dashed trace from upright to flat. */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="2 5"
          strokeLinecap="round"
          opacity={0.7}
        />

        {/* Upright ghost (where the tree started) for reference. */}
        <line
          x1={HINGE_X}
          y1={GROUND_Y}
          x2={HINGE_X}
          y2={GROUND_Y - ROD_PX}
          stroke="var(--diagram-stroke)"
          strokeWidth={2}
          strokeDasharray="5 6"
          opacity={0.6}
        />

        {/* The falling rod (trunk) — accent throughout the arc (SPEC §9). */}
        <line
          x1={HINGE_X}
          y1={GROUND_Y}
          x2={tipX}
          y2={tipY}
          stroke="var(--accent)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Hinge pivot */}
        <circle cx={HINGE_X} cy={GROUND_Y} r={6} fill="var(--diagram-stroke)" />
        <text x={HINGE_X} y={GROUND_Y + 18} textAnchor="middle" className="diagram-label sim-map-label">
          hinge
        </text>

        {/* Phase annotation near the tip — semantic colour kept on the label. */}
        <text
          x={Math.min(VIEW_W - 6, Math.max(6, tipX))}
          y={Math.max(14, tipY - 10)}
          textAnchor="middle"
          className="diagram-label sim-map-label"
          fill={holding ? 'var(--accent)' : 'var(--danger)'}
        >
          {thetaDeg > 0 ? (holding ? 'hinge holds' : 'free fall') : ''}
        </text>
      </svg>

      <div className="sim-sideview-controls">
        <button type="button" className="btn btn-primary" onClick={runFall} disabled={running}>
          {running ? 'Falling…' : 'Simulate fall'}
        </button>
        <span className="sim-angle">θ = {Math.round(thetaDeg)}°</span>
      </div>
      <p className="sim-caption">
        Kinematic visualization only — a rigid rod over ~{(durationMs / 1000).toFixed(1)} s, not a
        physics model. Hinge is annotated as holding until ~{HINGE_HOLD_DEG}°.
      </p>
    </section>
  );
}

function cancelRaf(ref: React.MutableRefObject<number | null>) {
  if (ref.current != null) {
    cancelAnimationFrame(ref.current);
    ref.current = null;
  }
}
