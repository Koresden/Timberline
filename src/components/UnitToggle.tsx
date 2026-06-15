/**
 * Global metric/imperial unit toggle (presentational). Reflects and flips the
 * shared preference via the props it's given — it holds no state of its own and
 * does no conversion (that's `useUnits` / `units.ts`). DB-0 Decision 2: one
 * app-wide toggle, metric default.
 */
import type { UnitSystem } from '../units';

interface UnitToggleProps {
  system: UnitSystem;
  onChange: (system: UnitSystem) => void;
}

export function UnitToggle({ system, onChange }: UnitToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Units">
      <button
        type="button"
        className={system === 'metric' ? 'is-active' : ''}
        aria-pressed={system === 'metric'}
        onClick={() => onChange('metric')}
      >
        Metric
      </button>
      <button
        type="button"
        className={system === 'imperial' ? 'is-active' : ''}
        aria-pressed={system === 'imperial'}
        onClick={() => onChange('imperial')}
      >
        Imperial
      </button>
    </div>
  );
}
