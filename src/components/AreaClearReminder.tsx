import { useState } from 'react';

/**
 * Area-clear reminder (DB-6) — a human ATTESTATION, never a gate.
 *
 * Additive friction at the danger-zone step: it re-states the worst-case 2×(H+ΔH)
 * danger radius and the two escape routes, and asks the operator to attest they
 * personally walked and cleared the area. The copy is the safety-auditor's
 * approved wording (DB-6 Decision 3) — change it only via the auditor.
 *
 * HARD GUARDRAILS (DB-6 / safety-auditor — do not regress):
 *  - It gates/unlocks NOTHING. Cut specs are shown by CutCard regardless; this
 *    component returns no signal and is wired to no other element's state.
 *  - `checked` is LOCAL useState ONLY — never lifted to the plan store or any
 *    storage. Lifting it would silently break the "re-affirm every time" rule.
 *  - No completion/success styling and no telemetry on the check: ticking is an
 *    acknowledgement, not "passing" or "unlocking".
 *  - It re-affirms the radius/escape values passed from the engine; it never
 *    recomputes them.
 */
interface AreaClearReminderProps {
  /** Pre-formatted worst-case danger radius (already unit-converted) — same value the card shows. */
  dangerRadiusLabel: string;
  /** The two OSHA-style escape routes (~45° back from the fall line). */
  escapeAzimuths: [number, number];
}

export function AreaClearReminder({ dangerRadiusLabel, escapeAzimuths }: AreaClearReminderProps) {
  // Local-only, intentionally not persisted (DB-6 guardrail 4): every plan and
  // every session starts unchecked, because the area must be re-walked each time.
  const [checked, setChecked] = useState(false);
  const e1 = Math.round(escapeAzimuths[0]);
  const e2 = Math.round(escapeAzimuths[1]);

  return (
    <section className="area-clear" aria-label="Area-clear reminder">
      <p className="area-clear-head">You are responsible for clearing the danger zone.</p>
      <p className="area-clear-body">
        This app can't see your site. Walk the full <strong>{dangerRadiusLabel}</strong> radius
        (2× the tree's worst-case height) and move people, pets, and equipment out of it. Confirm
        both escape routes — <strong>{e1}° / {e2}°</strong>, ~45° back from the fall line — are
        clear and walkable.
      </p>

      <label className="area-clear-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          I have personally walked the full {dangerRadiusLabel} radius and moved people, pets, and
          equipment out of it — and I will re-walk it before every cut.
        </span>
      </label>

      {checked ? (
        <p className="area-clear-reaffirm">
          Re-walk and re-check before <strong>every</strong> cut. This reminder never counts as the
          area being clear — only your eyes on the ground do.
        </p>
      ) : null}
    </section>
  );
}
