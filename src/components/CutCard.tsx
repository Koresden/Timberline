/**
 * Cut card (presentational). Renders an `ActionablePlan` (verdict 'ok' | 'caution')
 * as a stepped felling guide: notch (with inline diagram) → hinge → back cut →
 * escape compass, plus the expandable "why" list (HANDOFF §5).
 *
 * Discriminated union: this component accepts ONLY `ActionablePlan`, so the cut
 * spec fields are always present and a referral plan can never reach here. The
 * Plan feature narrows on `verdict` before choosing this vs. the takeover.
 *
 * 'caution' is made visually distinct from 'ok' via a modifier class + banner.
 * It renders engine output only — cut dimensions are formatted by the passed
 * `formatCutDimension` (the useUnits boundary, 1-decimal cut precision); no math here.
 */
import type { ActionablePlan } from '../engine/types';
import { NotchDiagram } from './NotchDiagram';
import { EscapeCompass } from './EscapeCompass';
import { WhyList } from './WhyList';

interface CutCardProps {
  plan: ActionablePlan;
  /** Format an SI centimetre cut spec into the active unit at 1 decimal (cm → in). */
  formatCutDimension: (cm: number) => string;
  /** Pre-formatted danger radius (already unit-converted). */
  dangerRadiusLabel: string;
  /** True when the requested target was outside the steering cone. */
  targetInfeasible: boolean;
}

const NOTCH_LABEL: Record<ActionablePlan['notch']['type'], string> = {
  'open-face': 'Open-face notch',
  conventional: 'Conventional notch',
  humboldt: 'Humboldt notch',
};

export function CutCard({
  plan,
  formatCutDimension,
  dangerRadiusLabel,
  targetInfeasible,
}: CutCardProps) {
  const caution = plan.verdict === 'caution';
  return (
    <section className={`cut-card${caution ? ' cut-card--caution' : ' cut-card--ok'}`}>
      <header className="cut-card-verdict">
        <span className="verdict-disc" aria-hidden="true">
          {caution ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4 3 20h18L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m5 12 5 5 9-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <div>
          <span className="verdict-badge">{caution ? 'Proceed with caution' : 'Plan ready'}</span>
          {caution ? (
            <p className="verdict-note">
              This fell involves an advanced technique or a constraint the hinge can't
              fully meet. Read every step before cutting.
            </p>
          ) : null}
        </div>
      </header>

      <ol className="cut-steps">
        {/* Step 1 — Notch */}
        <li className="cut-step">
          <div className="cut-step-head">
            <span className="cut-step-n">1</span>
            <h3>{NOTCH_LABEL[plan.notch.type]}</h3>
          </div>
          <div className="cut-step-body cut-step-body--notch">
            <dl className="spec">
              <div>
                <dt>Opening</dt>
                <dd>{plan.notch.openingDeg}°</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>{formatCutDimension(plan.notch.depthCm)}</dd>
              </div>
            </dl>
            <NotchDiagram openingDeg={plan.notch.openingDeg} type={plan.notch.type} />
          </div>
        </li>

        {/* Step 2 — Hinge */}
        <li className="cut-step">
          <div className="cut-step-head">
            <span className="cut-step-n">2</span>
            <h3>Hinge</h3>
          </div>
          <div className="cut-step-body">
            <dl className="spec">
              <div>
                <dt>Thickness</dt>
                <dd>{formatCutDimension(plan.hinge.thicknessCm)}</dd>
              </div>
              <div>
                <dt>Length</dt>
                <dd>{formatCutDimension(plan.hinge.lengthCm)}</dd>
              </div>
            </dl>
            <p className="cut-step-warn">Never cut through the hinge — it steers and controls the fall.</p>
          </div>
        </li>

        {/* Step 3 — Back cut */}
        <li className="cut-step">
          <div className="cut-step-head">
            <span className="cut-step-n">3</span>
            <h3>Back cut</h3>
          </div>
          <div className="cut-step-body">
            <dl className="spec">
              <div>
                <dt>Offset above apex</dt>
                <dd>{formatCutDimension(plan.backCut.offsetCm)}</dd>
              </div>
              <div>
                <dt>Bore (plunge) cut</dt>
                <dd>{plan.backCut.boreCut ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Wedges</dt>
                <dd>{plan.backCut.wedges}</dd>
              </div>
            </dl>
            {plan.backCut.boreCut ? (
              <p className="cut-step-warn">
                Bore through behind the hinge, then release the holding wood last — this guards
                against barber chair.
              </p>
            ) : null}
          </div>
        </li>

        {/* Step 4 — Escape */}
        <li className="cut-step">
          <div className="cut-step-head">
            <span className="cut-step-n">4</span>
            <h3>Escape &amp; danger zone</h3>
          </div>
          <div className="cut-step-body">
            {targetInfeasible ? (
              <p className="cut-step-warn">
                Your target direction was outside what the hinge can steer. The fall direction
                below is the nearest the hinge can actually hold.
              </p>
            ) : null}
            <EscapeCompass
              fallAzimuth={plan.fallAzimuth}
              escapeAzimuths={plan.escapeAzimuths}
              dangerRadiusLabel={dangerRadiusLabel}
            />
            <p className="cut-step-note">
              Clear the {dangerRadiusLabel} danger zone. Retreat along an escape route as the tree
              starts to move — never stand directly behind the tree.
            </p>
          </div>
        </li>
      </ol>

      <WhyList reasons={plan.reasons} />
    </section>
  );
}
