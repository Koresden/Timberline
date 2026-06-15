/**
 * Persistent safety banner (HANDOFF §1, non-negotiable).
 *
 * Timberline is a planning aid, NOT authorization to fell a tree. This banner
 * is always visible, in every phase, on every screen. There is no setting to
 * dismiss or override it. Presentational only — no logic, no I/O.
 */
export function SafetyBanner() {
  return (
    <aside className="safety-banner" role="note" aria-label="Safety notice">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3 2 20h20L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span>
        <strong>Planning aid — not authorization.</strong> Recommendations assume a
        trained operator with PPE. Big, leaning, dead, or near structures/power
        lines? Stop and consult a professional arborist.
      </span>
    </aside>
  );
}
