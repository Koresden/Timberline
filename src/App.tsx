import { useState } from 'react';
import { SafetyBanner } from './components/SafetyBanner';
import { UnitToggle } from './components/UnitToggle';
import { Stepper, type Step } from './components/Stepper';
import { MeasureScreen } from './features/measure/MeasureScreen';
import { PlanScreen } from './features/plan/PlanScreen';
import { SimulateScreen } from './features/simulate/SimulateScreen';
import { useUnits } from './hooks/useUnits';
import { useAppStore } from './store/appStore';
import './App.css';

/**
 * App shell: a three-step Measure → Plan → Simulate flow (HANDOFF §5, design
 * SPEC §3–4). The persistent SafetyBanner stays above everything on every screen
 * (HANDOFF §1 — non-negotiable). The tab bar is rendered as the design's stepper:
 * each step shows active / done / idle, with "done" derived from real store state
 * (a measured height marks Measure done; a published actionable plan marks Plan
 * done). The unit toggle lives in the app bar.
 *
 * Mobile-first: the app bar + stepper sit at the top, the active screen scrolls,
 * and the banner is always in view.
 */
type Tab = 'measure' | 'plan' | 'simulate';

const TITLES: Record<Tab, string> = {
  measure: 'Measure',
  plan: 'Plan the fall',
  simulate: 'Simulate',
};

export default function App() {
  const [tab, setTab] = useState<Tab>('measure');
  const units = useUnits();

  // Done-states derive from genuinely shared store state, not local flags:
  //  - a stored HeightEstimate means Measure produced a result;
  //  - a published ActionablePlan (currentPlan) means Plan produced a fall
  //    corridor. A referral clears currentPlan, so it never marks Plan "done".
  const measuredHeight = useAppStore((s) => s.measuredHeight);
  const currentPlan = useAppStore((s) => s.currentPlan);

  const steps: Step[] = [
    {
      key: 'measure',
      label: 'Measure',
      state: tab === 'measure' ? 'active' : measuredHeight ? 'done' : 'idle',
    },
    {
      key: 'plan',
      label: 'Plan',
      state: tab === 'plan' ? 'active' : currentPlan ? 'done' : 'idle',
    },
    {
      key: 'simulate',
      label: 'Sim',
      state: tab === 'simulate' ? 'active' : 'idle',
    },
  ];

  return (
    <div className="app">
      <SafetyBanner />

      <header className="app-bar">
        <div className="app-bar-title">
          <h1>{TITLES[tab]}</h1>
          <p className="app-bar-sub">Tree-felling planning aid</p>
        </div>
        <UnitToggle system={units.system} onChange={units.setSystem} />
      </header>

      <Stepper steps={steps} onSelect={(key) => setTab(key as Tab)} />

      <main className="app-main">
        {tab === 'measure' && <MeasureScreen />}
        {tab === 'plan' && <PlanScreen />}
        {tab === 'simulate' && <SimulateScreen />}
      </main>
    </div>
  );
}
