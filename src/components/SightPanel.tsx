/**
 * Sighting "viewfinder" panel (design SPEC §9, DB-8 visual reconciliation).
 *
 * A STYLED sighting illustration — **not real AR** and not a live camera. It
 * mirrors the design mockup's framing (reticle corners, tree silhouette, height
 * dimension line, "LIVE SIGHT" chip) and reflects the *real* measured height in
 * the callout when one exists. It deliberately does NOT render DBH or lean: those
 * aren't measured on this screen (they're Plan inputs), and inventing numbers in a
 * safety tool is exactly what we avoid. Presentational only — no logic, no I/O.
 */
interface SightPanelProps {
  /** Formatted height to show in the dimension callout (e.g. "21.4 m"), or null before a reading. */
  heightLabel: string | null;
}

export function SightPanel({ heightLabel }: SightPanelProps) {
  const live = heightLabel !== null;
  return (
    <figure className="sight-panel" aria-label="Sighting viewfinder (illustration, not a live camera)">
      <svg viewBox="0 0 300 296" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="sp-sky" x1="0" y1="0" x2="0" y2="296" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--diagram-fill)" />
            <stop offset="1" stopColor="var(--bg)" />
          </linearGradient>
        </defs>
        <rect width="300" height="296" fill="url(#sp-sky)" />
        {/* ground line */}
        <rect x="0" y="246" width="300" height="50" fill="var(--bg)" />
        <line x1="0" y1="246" x2="300" y2="246" stroke="var(--diagram-stroke)" strokeWidth="1" opacity=".55" />
        {/* tree silhouette */}
        <polygon points="168,246 180,246 188,150 178,150" fill="#2A2114" />
        <ellipse cx="180" cy="118" rx="56" ry="66" fill="#1E2F27" />
        <ellipse cx="160" cy="98" rx="34" ry="46" fill="#26392F" />
        <ellipse cx="192" cy="92" rx="26" ry="36" fill="#22342B" />
        {/* height dimension — solid when we have a real reading, dashed/idle otherwise */}
        <line x1="48" y1="52" x2="178" y2="52" stroke="var(--diagram-stroke)" strokeWidth="1" strokeDasharray="3 4" opacity=".7" />
        <line
          x1="52" y1="52" x2="52" y2="246"
          stroke={live ? 'var(--accent)' : 'var(--diagram-stroke)'}
          strokeWidth="2"
          strokeDasharray={live ? undefined : '4 5'}
        />
        <line x1="44" y1="52" x2="60" y2="52" stroke={live ? 'var(--accent)' : 'var(--diagram-stroke)'} strokeWidth="2" />
        <line x1="44" y1="246" x2="60" y2="246" stroke={live ? 'var(--accent)' : 'var(--diagram-stroke)'} strokeWidth="2" />
        {live && (
          <>
            <rect x="14" y="136" width="76" height="26" rx="7" fill="var(--accent)" />
            <text
              x="52" y="153" textAnchor="middle"
              fontFamily="var(--font-mono)" fontWeight="600" fontSize="13" fill="var(--accent-fg)"
            >
              {heightLabel}
            </text>
          </>
        )}
        {/* reticle corners */}
        <g stroke="var(--fg)" strokeOpacity=".3" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M14 30 v-12 h12" />
          <path d="M286 30 v-12 h-12" />
          <path d="M14 266 v12 h12" />
          <path d="M286 266 v12 h-12" />
        </g>
      </svg>
      <figcaption className="sight-chip">
        <span className="sight-chip-dot" aria-hidden="true" />
        {live ? 'HEIGHT CAPTURED' : 'LINE UP THE SIGHT'}
      </figcaption>
    </figure>
  );
}
