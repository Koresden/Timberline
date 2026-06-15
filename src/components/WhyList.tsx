/**
 * Expandable "why" list (presentational). Renders the engine's `reasons[]` —
 * every rule that fired — as a collapsible explanation. Used in the actionable
 * case (HANDOFF §5: "reasons[] shown as expandable 'why' list") and inside the
 * referral takeover, where the reasons are the referral gates. Native <details>
 * so it works without JS and stays accessible.
 */
interface WhyListProps {
  reasons: string[];
  /** Summary label; defaults to a generic "why". */
  summary?: string;
  /** Start expanded (used by the referral takeover, where the why IS the point). */
  open?: boolean;
}

export function WhyList({ reasons, summary = 'Why these recommendations?', open = false }: WhyListProps) {
  if (reasons.length === 0) return null;
  return (
    <details className="why-list" open={open}>
      <summary>{summary}</summary>
      <ul>
        {reasons.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>
    </details>
  );
}
