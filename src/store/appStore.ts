/**
 * Shared app state (DB-0 Decision 1: Zustand). Two thin, orchestration-only
 * slices — NO domain math lives here (engine purity, CLAUDE.md §1):
 *
 *  1. unitSystem — the global metric/imperial display preference, persisted to
 *     localStorage (DB-0 Decision 2). Default metric.
 *  2. measuredHeight — the Measure → Plan handoff: the `HeightEstimate` produced
 *     on the Measure screen, consumed (as worst-case H + ΔH) by the Plan screen.
 *
 * Per-screen form state stays LOCAL to each feature; only genuinely shared state
 * lives here. Selector subscriptions mean only components that read a slice
 * re-render (the reason Zustand was chosen over Context in DB-0).
 */
import { create } from 'zustand';
import type { UnitSystem } from '../units';
import type { ActionablePlan, HeightEstimate, PlanInput } from '../engine/types';
import { loadUnitSystem, saveUnitSystem, DEFAULT_UNIT_SYSTEM } from './unitStorage';

interface AppState {
  /** Global display unit preference (SI is always what's stored internally). */
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;

  /** The most recent height measurement, handed off from Measure to Plan. */
  measuredHeight: HeightEstimate | null;
  setMeasuredHeight: (estimate: HeightEstimate) => void;
  clearMeasuredHeight: () => void;

  /**
   * Plan → Simulate handoff (Phase 3 seam). Only an ACTIONABLE plan is
   * publishable: a `refer-professional` result has no fall corridor, so the
   * Plan screen CLEARS this on a referral and the Simulate screen shows an
   * information-only state. `currentInput` is kept so the sim can pass the raw
   * residual lean / wind to `buildCorridor` for a wider (more conservative)
   * uncertainty bonus. No felling math here — pure orchestration.
   */
  currentPlan: ActionablePlan | null;
  currentInput: PlanInput | null;
  setSimulationSource: (plan: ActionablePlan, input: PlanInput) => void;
  clearSimulation: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  unitSystem: loadUnitSystem(),
  setUnitSystem: (system) => {
    saveUnitSystem(system);
    set({ unitSystem: system });
  },
  toggleUnitSystem: () => {
    const next: UnitSystem = get().unitSystem === 'metric' ? 'imperial' : 'metric';
    saveUnitSystem(next);
    set({ unitSystem: next });
  },

  measuredHeight: null,
  setMeasuredHeight: (estimate) => set({ measuredHeight: estimate }),
  clearMeasuredHeight: () => set({ measuredHeight: null }),

  currentPlan: null,
  currentInput: null,
  setSimulationSource: (plan, input) => set({ currentPlan: plan, currentInput: input }),
  clearSimulation: () => set({ currentPlan: null, currentInput: null }),
}));

export { DEFAULT_UNIT_SYSTEM };
