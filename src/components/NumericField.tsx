/**
 * Labelled numeric input (presentational). A thin, thumb-friendly wrapper around
 * `<input type="number">` with an optional unit suffix and inline error slot. It
 * holds no state and does no conversion — the parent owns the raw string value
 * and decides how to parse it (via `useUnits`). One responsibility: render a
 * number field and surface its label/unit/error.
 */
import type { ReactNode } from 'react';

interface NumericFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
  /** Unit suffix shown after the input, e.g. 'm', 'cm', '°'. */
  unit?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  inputMode?: 'decimal' | 'numeric';
  error?: string | null;
  hint?: ReactNode;
}

export function NumericField({
  id,
  label,
  value,
  onChange,
  unit,
  placeholder,
  step = 'any',
  min,
  max,
  inputMode = 'decimal',
  error,
  hint,
}: NumericFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-input">
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit ? <span className="field-unit">{unit}</span> : null}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
