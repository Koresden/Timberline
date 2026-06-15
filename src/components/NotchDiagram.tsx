/**
 * Inline notch diagram (presentational SVG). A simple side-on schematic of the
 * trunk showing the notch opening angle and which way the tree falls — a visual
 * companion to the numeric notch spec on the cut card. It RENDERS the engine's
 * numbers; it computes no felling geometry of its own beyond drawing the wedge
 * at the given opening angle. SVG per CLAUDE.md §3 (rendering is SVG, not canvas).
 */
interface NotchDiagramProps {
  /** Total notch opening angle in degrees (engine output). */
  openingDeg: number;
  /** Notch type, for the caption. */
  type: 'open-face' | 'conventional' | 'humboldt';
}

export function NotchDiagram({ openingDeg, type }: NotchDiagramProps) {
  // Trunk drawn as a vertical bar; the notch is a wedge cut into the fall side
  // (right). The wedge half-angle splits the opening about the horizontal apex.
  const W = 160;
  const H = 140;
  const trunkLeft = 54;
  const trunkRight = 106;
  const apexY = H / 2;
  const apexX = trunkLeft; // notch apex sits at the back of the kerf
  const half = (openingDeg / 2) * (Math.PI / 180);
  const depth = trunkRight - trunkLeft;
  // Top and bottom faces of the open wedge, opening toward the fall side (right).
  const topY = apexY - Math.tan(half) * depth;
  const botY = apexY + Math.tan(half) * depth;

  return (
    <figure className="notch-diagram">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`${type} notch, ${openingDeg}° opening, facing the fall direction`}
      >
        {/* Trunk cross-section */}
        <rect
          x={trunkLeft}
          y={16}
          width={trunkRight - trunkLeft}
          height={H - 32}
          rx={6}
          fill="var(--diagram-fill)"
          stroke="var(--diagram-stroke)"
          strokeWidth={2}
        />
        {/* Notch wedge cut out of the fall side */}
        <polygon
          points={`${apexX},${apexY} ${trunkRight},${topY} ${trunkRight},${botY}`}
          fill="var(--bg)"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        {/* Hinge wood (remaining behind the apex) */}
        <line
          x1={apexX}
          y1={apexY - 10}
          x2={apexX}
          y2={apexY + 10}
          stroke="var(--accent)"
          strokeWidth={3}
        />
        {/* Fall direction arrow */}
        <g stroke="var(--muted)" strokeWidth={2} fill="none">
          <line x1={trunkRight + 8} y1={apexY} x2={W - 8} y2={apexY} />
          <polyline points={`${W - 16},${apexY - 5} ${W - 8},${apexY} ${W - 16},${apexY + 5}`} />
        </g>
        <text x={apexX - 6} y={apexY - 14} textAnchor="end" className="diagram-label">
          {openingDeg}°
        </text>
      </svg>
      <figcaption>Notch faces the fall direction →</figcaption>
    </figure>
  );
}
