/**
 * Measure screen (HANDOFF §2.1, Phase 2). Method picker (Tangent vs Stick) +
 * the active method's form. On a successful tangent measurement it stores the
 * `HeightEstimate` in the shared store (the Measure → Plan handoff) and shows a
 * confirmation so the user knows the Plan screen is primed.
 *
 * This is feature wiring/state only — the trig lives in `engine/measure.ts`, the
 * presentational pieces in `components/` and the two sub-forms.
 */
import { useState } from 'react';
import type { HeightEstimate, MeasureMethod } from '../../engine/types';
import { useAppStore } from '../../store/appStore';
import { useUnits } from '../../hooks/useUnits';
import { TangentForm } from './TangentForm';
import { StickChecklist } from './StickChecklist';

export function MeasureScreen() {
  const [method, setMethod] = useState<MeasureMethod>('tangent');
  const setMeasuredHeight = useAppStore((s) => s.setMeasuredHeight);
  const measuredHeight = useAppStore((s) => s.measuredHeight);
  const units = useUnits();

  const handleMeasured = (estimate: HeightEstimate) => {
    setMeasuredHeight(estimate);
  };

  return (
    <div className="screen measure-screen">
      <p className="screen-intro">Height, diameter &amp; lean from a single sight.</p>

      <div className="method-picker" role="tablist" aria-label="Measurement method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'tangent'}
          className={method === 'tangent' ? 'is-active' : ''}
          onClick={() => setMethod('tangent')}
        >
          Tangent (clinometer)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'stick'}
          className={method === 'stick' ? 'is-active' : ''}
          onClick={() => setMethod('stick')}
        >
          Stick method
        </button>
      </div>

      {method === 'tangent' ? <TangentForm onMeasured={handleMeasured} /> : <StickChecklist />}

      {measuredHeight && (
        <p className="measure-saved" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="var(--safe)" strokeWidth="1.8" />
            <path d="m8 12 2.5 2.5L16 9" stroke="var(--safe)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Saved for planning: <strong>{units.formatEstimate(measuredHeight)}</strong>. Open the
            Plan step — the worst-case height is prefilled.
          </span>
        </p>
      )}
    </div>
  );
}
