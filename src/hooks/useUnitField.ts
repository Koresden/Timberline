/**
 * useUnitField — a single unit-bearing form field that survives the global unit
 * toggle without drifting (DB-2 Decision D2).
 *
 * The bug it fixes: a form field that stores only the display-unit STRING keeps
 * its old number when the unit label flips, so it reads wrong (a 14.9 m height
 * stays "14.9" but is suddenly labelled "ft"). This hook keeps the canonical SI
 * value alongside the display string and, whenever `units.system` changes,
 * reformats the display FROM the canonical SI — never from the rounded string —
 * so repeated metric⇄imperial toggling never accumulates rounding error.
 *
 * Layering: all conversion/formatting math is the pure `units.ts` boundary
 * (DB-0 D2, SI-internal). This hook is the thin React adapter that owns the
 * field's local state and keeps the canonical SI in sync with what's typed.
 *
 *   const height = useUnitField('distance');
 *   <NumericField value={height.value} onChange={height.onChange} … />
 *   height.setFromSI(worstCaseHeightM);   // seed/prefill from an SI value
 *   units.parseInput(height.value, 'distance');  // submit, unchanged
 */
import { useEffect, useRef, useState } from 'react';
import { useUnits } from './useUnits';
import { formatLength, parseLength, type Quantity } from '../units';

export interface UnitField {
  /** The display string, in the active unit system. Drive `NumericField` with it. */
  value: string;
  /** User typed into the field. Updates the display and the canonical SI. */
  onChange: (raw: string) => void;
  /** Seed the field from a known SI value (e.g. the worst-case height prefill). */
  setFromSI: (si: number) => void;
}

export function useUnitField(quantity: Quantity, initial = ''): UnitField {
  const units = useUnits();

  const [value, setValue] = useState(initial);
  // Canonical SI for the current display string. `null` when blank/unparseable —
  // in that state we have nothing to reformat, so a toggle leaves the field as-is.
  const siRef = useRef<number | null>(parseLength(initial, quantity, units.system));
  const prevSystem = useRef(units.system);

  const onChange = (raw: string) => {
    setValue(raw);
    siRef.current = parseLength(raw, quantity, units.system);
  };

  const setFromSI = (si: number) => {
    siRef.current = si;
    setValue(formatLength(si, quantity, units.system, { withUnit: false }));
  };

  // On a unit-system flip, reformat the display FROM canonical SI (drift-free).
  // A blank/unparseable field (siRef === null) is deliberately left untouched.
  useEffect(() => {
    if (prevSystem.current === units.system) return;
    prevSystem.current = units.system;
    if (siRef.current !== null) {
      setValue(formatLength(siRef.current, quantity, units.system, { withUnit: false }));
    }
  }, [units.system, quantity]);

  return { value, onChange, setFromSI };
}
