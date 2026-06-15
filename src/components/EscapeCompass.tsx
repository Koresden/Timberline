/**
 * Escape compass (presentational SVG, top-down, north-up).
 *
 * Draws the engine's fall azimuth, the two OSHA-style escape routes (~45° back
 * from the fall line), and the 2× tree-height danger ring. Azimuths are degrees
 * clockwise from north (engine convention), so a bearing maps to screen coords as
 * x = sin(az), y = −cos(az). This component only PLOTS engine outputs — it does
 * no felling math. SVG per CLAUDE.md §3.
 *
 * The danger radius is shown both as the ring label and (in the active unit) by
 * the caller; here we render it as a scaled circle with a numeric label passed in
 * already-formatted, so unit conversion stays at the `useUnits` boundary.
 */
interface EscapeCompassProps {
  fallAzimuth: number;
  escapeAzimuths: [number, number];
  /** Pre-formatted danger radius string (e.g. "29.8 m") — already unit-converted. */
  dangerRadiusLabel: string;
}

const C = 110; // centre
const SIZE = 220;
const R_DANGER = 92; // danger ring radius (px)
const R_FALL = 82; // fall/escape arrow length (px)

function vec(azimuthDeg: number, length: number): { x: number; y: number } {
  const r = (azimuthDeg * Math.PI) / 180;
  return { x: C + Math.sin(r) * length, y: C - Math.cos(r) * length };
}

export function EscapeCompass({
  fallAzimuth,
  escapeAzimuths,
  dangerRadiusLabel,
}: EscapeCompassProps) {
  const fall = vec(fallAzimuth, R_FALL);
  const esc0 = vec(escapeAzimuths[0], R_FALL);
  const esc1 = vec(escapeAzimuths[1], R_FALL);

  return (
    <figure className="escape-compass">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        role="img"
        aria-label={
          `Top-down escape plan. Fall direction ${Math.round(fallAzimuth)}°, ` +
          `escape routes ${Math.round(escapeAzimuths[0])}° and ${Math.round(escapeAzimuths[1])}°, ` +
          `danger radius ${dangerRadiusLabel}.`
        }
      >
        <defs>
          <marker
            id="arrow-fall"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
          </marker>
          <marker
            id="arrow-escape"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="var(--safe)" />
          </marker>
        </defs>

        {/* Danger ring — calm state (SPEC §9): dashed --diagram-stroke. It turns
            red only on an active breach, which is the danger-zone safety screen. */}
        <circle
          cx={C}
          cy={C}
          r={R_DANGER}
          fill="none"
          stroke="var(--diagram-stroke)"
          strokeDasharray="5 6"
          strokeWidth={1.4}
        />

        {/* North marker */}
        <text x={C} y={14} textAnchor="middle" className="diagram-label">
          N
        </text>

        {/* Planned fell line (SPEC §9): --accent 3px solid + arrowhead. */}
        <line
          x1={C}
          y1={C}
          x2={fall.x}
          y2={fall.y}
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd="url(#arrow-fall)"
        />

        {/* Escape routes (SPEC §9): --safe 2.5px dashed. */}
        <line
          x1={C}
          y1={C}
          x2={esc0.x}
          y2={esc0.y}
          stroke="var(--safe)"
          strokeWidth={2.5}
          strokeDasharray="6 5"
          strokeLinecap="round"
          markerEnd="url(#arrow-escape)"
        />
        <line
          x1={C}
          y1={C}
          x2={esc1.x}
          y2={esc1.y}
          stroke="var(--safe)"
          strokeWidth={2.5}
          strokeDasharray="6 5"
          strokeLinecap="round"
          markerEnd="url(#arrow-escape)"
        />

        {/* Tree base */}
        <circle cx={C} cy={C} r={5} fill="var(--accent)" />
      </svg>
      <figcaption>
        <span className="legend legend--danger">Fall line</span>
        <span className="legend legend--safe">Escape routes</span>
        <span className="legend legend--ring">Danger radius {dangerRadiusLabel}</span>
      </figcaption>
    </figure>
  );
}
