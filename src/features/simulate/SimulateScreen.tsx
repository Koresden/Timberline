/**
 * Simulate screen (HANDOFF §2.3 / §5, Phase 3). Visualizes the fall BEFORE any
 * saw touches wood: a top-down corridor/danger view with draggable obstacles and
 * a live go/no-go verdict, plus an animated side-view fall arc.
 *
 * SAFETY / EMPTY STATE (HANDOFF §1): the screen consumes the store's
 * `currentPlan`, which is ONLY ever an `ActionablePlan`. A `refer-professional`
 * result has no fall corridor, so the Plan screen clears the simulation source
 * and we show an information-only state here — NEVER a fabricated corridor. The
 * persistent SafetyBanner (in App.tsx) stays above everything regardless.
 *
 * The screen re-renders/re-runs live whenever the plan changes — there is no
 * submit button on the top view; collisions re-check on every drag/add/remove.
 */
import { useAppStore } from '../../store/appStore';
import { useUnits } from '../../hooks/useUnits';
import { DANGER_RADIUS_HEIGHT_MULT } from '../../engine/constants';
import { TopView } from './TopView';
import { SideView } from './SideView';
import './simulate.css';

export function SimulateScreen() {
  const plan = useAppStore((s) => s.currentPlan);
  const input = useAppStore((s) => s.currentInput);
  const units = useUnits();

  // Information-only state: no actionable plan generated yet, or the last verdict
  // was a referral (which cleared the source). Never invent a corridor.
  if (!plan) {
    return (
      <div className="screen sim-screen">
        <h2>Simulate the fall</h2>
        <div className="sim-empty" role="status">
          <p className="sim-empty-title">No simulation to show</p>
          <p className="sim-empty-body">
            Generate an actionable plan on the <strong>Plan</strong> tab first. If a tree was
            referred to a professional, there is no fall path to simulate — that is by design.
          </p>
        </div>
      </div>
    );
  }

  const dangerRadiusLabel = units.format(plan.dangerRadiusM, 'distance');
  // Worst-case height (m), recovered from the danger radius (= mult × height).
  const heightM = plan.dangerRadiusM / DANGER_RADIUS_HEIGHT_MULT;

  return (
    <div className="screen sim-screen">
      <h2>Simulate the fall</h2>
      <TopView plan={plan} input={input} dangerRadiusLabel={dangerRadiusLabel} />
      <SideView heightM={heightM} />

      {/* Honest readout (DB-8): real engine values only. The mockup's "time to
          ground" is a physics figure the sim deliberately does NOT model (it's a
          kinematic visualization, not a physics model — DB-4), so we surface the
          worst-case danger radius there instead — the safety-relevant number. */}
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="stat-label">Fall direction</div>
          <div className="stat-value">{Math.round(plan.fallAzimuth)}°</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Fall length</div>
          <div className="stat-value">
            {units.format(heightM, 'distance', { withUnit: false })}
            <span className="stat-unit"> {units.label('distance')}</span>
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Danger radius</div>
          <div className="stat-value stat-value--warn">
            {units.format(plan.dangerRadiusM, 'distance', { withUnit: false })}
            <span className="stat-unit"> {units.label('distance')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
