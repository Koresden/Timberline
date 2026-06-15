/**
 * useUnits — the display boundary between SI internals and the user's chosen
 * unit system (HANDOFF §3, DB-0 Decision 2).
 *
 * Reads the global unit preference from the store and returns formatting +
 * parsing helpers bound to it, backed by the pure functions in `src/units.ts`.
 * Nothing here stores imperial: `format()` converts SI → display for rendering,
 * `parseInput()` converts a typed display value → SI for storage. Rounding lives
 * in `units.ts` and happens only at display.
 */
import { useAppStore } from '../store/appStore';
import {
  formatLength,
  formatEstimate,
  parseLength,
  unitLabel,
  type Quantity,
  type UnitSystem,
} from '../units';
import type { HeightEstimate } from '../engine/types';

export interface UseUnits {
  system: UnitSystem;
  setSystem: (system: UnitSystem) => void;
  toggle: () => void;
  /** Format an SI value in the active system, e.g. `format(30, 'diameter')`. */
  format: (si: number, quantity: Quantity, opts?: { withUnit?: boolean }) => string;
  /** Format a height estimate as "H ± ΔH unit" in the active system. */
  formatEstimate: (estimate: HeightEstimate) => string;
  /** Parse a typed display value back to SI; `null` for blank/garbage. */
  parseInput: (raw: string, quantity: Quantity) => number | null;
  /** Abbreviated unit label for the active system, e.g. `'ft'`. */
  label: (quantity: Quantity) => string;
}

export function useUnits(): UseUnits {
  const system = useAppStore((s) => s.unitSystem);
  const setSystem = useAppStore((s) => s.setUnitSystem);
  const toggle = useAppStore((s) => s.toggleUnitSystem);

  return {
    system,
    setSystem,
    toggle,
    format: (si, quantity, opts) => formatLength(si, quantity, system, opts),
    formatEstimate: (estimate) => formatEstimate(estimate.heightM, estimate.errorM, system),
    parseInput: (raw, quantity) => parseLength(raw, quantity, system),
    label: (quantity) => unitLabel(quantity, system),
  };
}
