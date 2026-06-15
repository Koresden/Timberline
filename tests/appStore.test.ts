/**
 * Store reducer/selector tests (DB-0 Decision 1: Zustand). The store is a thin
 * orchestrator — these tests cover its state transitions (unit toggle/set, the
 * measured-height handoff), NOT any domain math (there is none in the store).
 *
 * Node env: the store imports `unitStorage`, which touches `localStorage`. We
 * provide a tiny in-memory stub before importing the store so the persistence
 * path is exercised without a DOM. Pure logic otherwise.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory localStorage stub installed BEFORE the store module loads.
const memory = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
});

// Import AFTER the stub so `loadUnitSystem()` runs against it.
const { useAppStore, DEFAULT_UNIT_SYSTEM } = await import('../src/store/appStore');
const { loadUnitSystem } = await import('../src/store/unitStorage');

describe('appStore — unit preference', () => {
  beforeEach(() => {
    memory.clear();
    useAppStore.setState({ unitSystem: 'metric', measuredHeight: null });
  });

  it('defaults to metric (DB-0 Decision 2)', () => {
    expect(DEFAULT_UNIT_SYSTEM).toBe('metric');
    expect(useAppStore.getState().unitSystem).toBe('metric');
  });

  it('setUnitSystem updates state and persists', () => {
    useAppStore.getState().setUnitSystem('imperial');
    expect(useAppStore.getState().unitSystem).toBe('imperial');
    expect(loadUnitSystem()).toBe('imperial'); // persisted to storage
  });

  it('toggleUnitSystem flips metric ⇄ imperial and persists each flip', () => {
    useAppStore.getState().toggleUnitSystem();
    expect(useAppStore.getState().unitSystem).toBe('imperial');
    expect(loadUnitSystem()).toBe('imperial');

    useAppStore.getState().toggleUnitSystem();
    expect(useAppStore.getState().unitSystem).toBe('metric');
    expect(loadUnitSystem()).toBe('metric');
  });
});

describe('appStore — measured-height handoff (Measure → Plan)', () => {
  beforeEach(() => {
    useAppStore.setState({ unitSystem: 'metric', measuredHeight: null });
  });

  it('starts empty', () => {
    expect(useAppStore.getState().measuredHeight).toBeNull();
  });

  it('stores a measurement for the Plan screen to consume', () => {
    const estimate = { heightM: 13.899, errorM: 0.988, method: 'tangent' as const };
    useAppStore.getState().setMeasuredHeight(estimate);
    expect(useAppStore.getState().measuredHeight).toEqual(estimate);
  });

  it('clears the handoff', () => {
    useAppStore.getState().setMeasuredHeight({ heightM: 10, errorM: 1, method: 'tangent' });
    useAppStore.getState().clearMeasuredHeight();
    expect(useAppStore.getState().measuredHeight).toBeNull();
  });
});

describe('appStore — simulation handoff (Plan → Simulate, Phase 3)', () => {
  const plan = {
    verdict: 'ok' as const,
    notch: { type: 'open-face' as const, openingDeg: 70, depthCm: 10 },
    hinge: { thicknessCm: 3, lengthCm: 24 },
    backCut: { offsetCm: 3, boreCut: false, wedges: 1 },
    fallAzimuth: 180,
    steeringConeDeg: 12.5,
    escapeAzimuths: [315, 45] as [number, number],
    dangerRadiusM: 29.773,
    reasons: [],
  };
  const input = {
    heightM: 14.887,
    dbhCm: 30,
    leanDeg: 2,
    leanAzimuth: 180,
    targetAzimuth: 180,
    windKph: 5,
    windAzimuth: 0,
    speciesClass: 'softwood' as const,
    hazards: [],
  };

  beforeEach(() => {
    useAppStore.setState({ currentPlan: null, currentInput: null });
  });

  it('starts empty (information-only state on Simulate)', () => {
    expect(useAppStore.getState().currentPlan).toBeNull();
    expect(useAppStore.getState().currentInput).toBeNull();
  });

  it('publishes an actionable plan + its input for Simulate to consume', () => {
    useAppStore.getState().setSimulationSource(plan, input);
    expect(useAppStore.getState().currentPlan).toEqual(plan);
    expect(useAppStore.getState().currentInput).toEqual(input);
  });

  it('clears the source (referral / fresh input has no corridor)', () => {
    useAppStore.getState().setSimulationSource(plan, input);
    useAppStore.getState().clearSimulation();
    expect(useAppStore.getState().currentPlan).toBeNull();
    expect(useAppStore.getState().currentInput).toBeNull();
  });
});
