/**
 * Referral takeover (presentational). The full-screen "consult a professional
 * arborist" state shown when `verdict === 'refer-professional'` (HANDOFF §1, §5;
 * CRITICAL CONTRACT #3).
 *
 * It receives a `ReferralPlan` — the discriminated-union variant that, BY TYPE,
 * carries no notch/hinge/back-cut fields. So there are no cut specs to leak here
 * even by accident: this component renders only the heading, the referral
 * reasons, and the danger-zone radius. Defense-in-depth = the type makes leaking
 * impossible AND this UI presents the takeover cleanly with no cut details.
 */
import type { ReferralPlan } from '../engine/types';

interface ReferralTakeoverProps {
  plan: ReferralPlan;
  /** Pre-formatted danger radius (already unit-converted via useUnits). */
  dangerRadiusLabel: string;
}

export function ReferralTakeover({ plan, dangerRadiusLabel }: ReferralTakeoverProps) {
  return (
    <section className="referral" role="alert" aria-live="assertive">
      {/* SPEC §8 danger banner — solid --danger, reserved for an active stop. */}
      <header className="referral-alert">
        <span className="referral-alert-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h2>Consult a professional arborist</h2>
          <p>Cut instructions are withheld for this tree.</p>
        </div>
      </header>

      <div className="referral-body">
        <p className="referral-lead">
          This tree is outside the safe envelope for a do-it-yourself fell. Timberline
          will <strong>not</strong> show cut instructions for it. Do not attempt this
          fell — hire a certified arborist.
        </p>

        <div className="referral-danger">
          <span className="referral-danger-label">Keep everyone clear of the danger zone</span>
          <span className="referral-danger-value">{dangerRadiusLabel}</span>
          <span className="referral-danger-note">radius around the tree base (2× tree height)</span>
        </div>

        <h3>Why this needs a professional</h3>
        <ul className="referral-reasons">
          {plan.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
