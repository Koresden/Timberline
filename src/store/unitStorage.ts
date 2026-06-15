/**
 * localStorage persistence for the unit preference (DB-0 Decision 2: the toggle
 * "persists across sessions"). Side-effecting I/O kept thin and at the edge, in
 * its own file, so the store itself stays a pure-ish orchestrator and this is the
 * only place that touches `localStorage`. Reads default to METRIC (DB-0) and
 * never throw — a missing/blocked storage just yields the default.
 */
import type { UnitSystem } from '../units';

const STORAGE_KEY = 'timberline.unitSystem';
export const DEFAULT_UNIT_SYSTEM: UnitSystem = 'metric';

export function loadUnitSystem(): UnitSystem {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'imperial' || raw === 'metric' ? raw : DEFAULT_UNIT_SYSTEM;
  } catch {
    // Private mode / storage disabled — fall back to the safe metric default.
    return DEFAULT_UNIT_SYSTEM;
  }
}

export function saveUnitSystem(system: UnitSystem): void {
  try {
    localStorage.setItem(STORAGE_KEY, system);
  } catch {
    // Persisting is best-effort; the in-memory preference still works this session.
  }
}
