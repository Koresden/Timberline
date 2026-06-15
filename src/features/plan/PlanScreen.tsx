/**
 * Plan screen (HANDOFF §2.2 / §5, Phase 2). Wires the input form to the engine
 * and renders the result.
 *
 * SAFETY CONTRACTS enforced here:
 *  - #1 (H + ΔH): the height prefill comes from the measured `HeightEstimate`
 *    via `worstCaseHeightM(estimate)` = heightM + errorM — the WORST-CASE height,
 *    never the bare best estimate. That is the single value seeded into the form.
 *  - #2 / #3 (referral takeover): after `recommendPlan`, we NARROW on `verdict`.
 *    When `verdict === 'refer-professional'` the result is a `ReferralPlan` with
 *    NO cut spec fields, and we render the full-screen `ReferralTakeover` and
 *    NOTHING else — no `CutCard`. The discriminated union makes leaking cut specs
 *    impossible at the type level; this narrowing makes the takeover total.
 *
 * `recommendPlan` throws on invalid input; we catch and show a friendly message.
 */
import { useState } from 'react';
import type { FellingPlan, PlanInput } from '../../engine/types';
import { recommendPlan } from '../../engine/plan';
import { useAppStore } from '../../store/appStore';
import { useUnits } from '../../hooks/useUnits';
import { worstCaseHeightM } from '../../store/worstCaseHeight';
import { PlanForm } from './PlanForm';
import { CutCard } from '../../components/CutCard';
import { ReferralTakeover } from '../../components/ReferralTakeover';

export function PlanScreen() {
  const measuredHeight = useAppStore((s) => s.measuredHeight);
  const setSimulationSource = useAppStore((s) => s.setSimulationSource);
  const clearSimulation = useAppStore((s) => s.clearSimulation);
  const units = useUnits();

  const [plan, setPlan] = useState<FellingPlan | null>(null);
  const [lastInput, setLastInput] = useState<PlanInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL CONTRACT #1: pass worst-case H + ΔH, not the bare estimate.
  const prefillHeightM = measuredHeight ? worstCaseHeightM(measuredHeight) : null;

  const handleSubmit = (input: PlanInput) => {
    setError(null);
    try {
      const result = recommendPlan(input);
      setPlan(result);
      setLastInput(input);
      // Phase 3 seam: publish an actionable plan to Simulate; a referral has no
      // fall corridor, so clear any prior simulation source (never a stale one).
      if (result.verdict === 'refer-professional') {
        clearSimulation();
      } else {
        setSimulationSource(result, input);
      }
    } catch (err) {
      setPlan(null);
      clearSimulation();
      setError(
        err instanceof Error
          ? 'Could not compute a plan from those values. Check the inputs and try again.'
          : 'Unexpected error computing the plan.',
      );
    }
  };

  const dangerRadiusLabel = plan
    ? units.format(plan.dangerRadiusM, 'distance')
    : '';

  // CRITICAL CONTRACT #2/#3: a refer-professional verdict takes over the whole
  // result area. We narrow on `verdict`; in that branch `plan` is a ReferralPlan
  // (no notch/hinge/backCut exist) and we render ONLY the takeover.
  const isReferral = plan?.verdict === 'refer-professional';

  return (
    <div className="screen plan-screen">
      <p className="screen-intro">Fell direction, escape routes &amp; danger zone.</p>

      {isReferral ? (
        // Referral: full-screen takeover, no form, no cut details.
        <>
          <ReferralTakeover plan={plan} dangerRadiusLabel={dangerRadiusLabel} />
          <button type="button" className="btn btn-block" onClick={() => setPlan(null)}>
            Back to inputs
          </button>
        </>
      ) : (
        <>
          <PlanForm prefillHeightM={prefillHeightM} onSubmit={handleSubmit} />

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          {/* Narrow on the verdict discriminant: only an ActionablePlan reaches
              the CutCard. A referral was handled by the takeover branch above. */}
          {plan && (plan.verdict === 'ok' || plan.verdict === 'caution') && (
            <CutCard
              plan={plan}
              formatDiameter={(cm) => units.format(cm, 'diameter')}
              dangerRadiusLabel={dangerRadiusLabel}
              targetInfeasible={
                lastInput != null &&
                Math.abs(angleGap(plan.fallAzimuth, lastInput.targetAzimuth)) > 0.5
              }
            />
          )}
        </>
      )}
    </div>
  );
}

/** Smallest absolute difference between two bearings (degrees), for the
 *  "target infeasible" hint only — display logic, not felling math. */
function angleGap(a: number, b: number): number {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return d;
}
