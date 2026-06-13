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
      <strong>Planning aid — not authorization.</strong> Recommendations assume a
      trained operator with PPE. Big, leaning, dead, or near
      structures/power lines? Stop and consult a professional arborist.
    </aside>
  );
}
