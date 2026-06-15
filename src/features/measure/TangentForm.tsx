/**
 * Tangent (clinometer) measurement form (HANDOFF §2.1 A).
 *
 * Two input modes:
 *  - Manual: distance + angle-to-top + angle-to-base typed in.
 *  - Device tilt: the `useDeviceOrientation` hook captures `beta` as the sighting
 *    angle; the user taps "Capture" while sighting the top, then the base.
 *
 * The live readout calls the engine's `measureByTangent` wrapped in a try/catch —
 * it throws on garbage input (non-positive distance, top below base, |angle| ≥ 89°),
 * and we surface a friendly message instead of crashing. No felling math here: the
 * engine owns the trig; this form only collects inputs and renders H ± ΔH, then
 * hands the resulting `HeightEstimate` up via `onMeasured`.
 *
 * Units: distance is entered/displayed through `useUnits` (SI stored internally);
 * angles are unit-agnostic degrees.
 */
import { useMemo, useState } from 'react';
import { measureByTangent, type TangentInput } from '../../engine/measure';
import type { HeightEstimate } from '../../engine/types';
import { useUnits } from '../../hooks/useUnits';
import { useUnitField } from '../../hooks/useUnitField';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { NumericField } from '../../components/NumericField';

interface TangentFormProps {
  onMeasured: (estimate: HeightEstimate) => void;
}

type AngleSlot = 'top' | 'base';

export function TangentForm({ onMeasured }: TangentFormProps) {
  const units = useUnits();
  const orientation = useDeviceOrientation();

  // Raw string form state stays LOCAL to this feature (DB-0 / store note).
  // Distance is unit-bearing, so it goes through useUnitField (re-converts on a
  // unit toggle, DB-2 D2); the angle fields are unit-agnostic degrees.
  const distance = useUnitField('distance');
  const [angleTop, setAngleTop] = useState('');
  const [angleBase, setAngleBase] = useState('');

  const distanceM = units.parseInput(distance.value, 'distance');
  const angleTopDeg = angleTop.trim() === '' ? null : Number(angleTop);
  const angleBaseDeg = angleBase.trim() === '' ? null : Number(angleBase);

  // Live readout: only attempt a solve when all three are present + finite.
  const result = useMemo<
    { ok: true; estimate: HeightEstimate } | { ok: false; message: string } | null
  >(() => {
    if (
      distanceM === null ||
      angleTopDeg === null ||
      angleBaseDeg === null ||
      !Number.isFinite(angleTopDeg) ||
      !Number.isFinite(angleBaseDeg)
    ) {
      return null;
    }
    const input: TangentInput = { distanceM, angleTopDeg, angleBaseDeg };
    try {
      return { ok: true, estimate: measureByTangent(input) };
    } catch (err) {
      // measureByTangent throws on bad geometry; show a friendly message.
      const message =
        err instanceof Error
          ? friendlyMeasureError(err.message)
          : 'Could not compute a height from those values.';
      return { ok: false, message };
    }
  }, [distanceM, angleTopDeg, angleBaseDeg]);

  const capture = (slot: AngleSlot) => {
    if (orientation.beta === null) return;
    const rounded = orientation.beta.toFixed(1);
    if (slot === 'top') setAngleTop(rounded);
    else setAngleBase(rounded);
  };

  const sensorUnavailable =
    orientation.status === 'unsupported' || orientation.status === 'denied';

  return (
    <div className="tangent-form">
      {/* ── Device tilt capture ─────────────────────────────────────────── */}
      <div className="sensor-panel">
        <h3>Device tilt</h3>
        {orientation.status === 'prompt' && (
          <>
            <p className="method-note">
              Use your phone as a clinometer. We need permission to read the tilt sensor.
            </p>
            <button type="button" className="btn" onClick={orientation.requestAccess}>
              Enable tilt sensor
            </button>
          </>
        )}
        {orientation.status === 'idle' && (
          <button type="button" className="btn" onClick={orientation.requestAccess}>
            Start tilt sensor
          </button>
        )}
        {orientation.status === 'active' && (
          <div className="sensor-live">
            <p className="tilt-readout">
              <span className="stat-label">Live tilt</span>
              <span className="tilt-value">
                {orientation.beta === null ? '—' : `${orientation.beta.toFixed(1)}°`}
              </span>
            </p>
            <p className="method-note">
              Sight the <strong>top</strong> of the tree and capture, then the{' '}
              <strong>base</strong>.
            </p>
            <div className="capture-row">
              <button
                type="button"
                className="btn"
                disabled={orientation.beta === null}
                onClick={() => capture('top')}
              >
                Capture top angle
              </button>
              <button
                type="button"
                className="btn"
                disabled={orientation.beta === null}
                onClick={() => capture('base')}
              >
                Capture base angle
              </button>
            </div>
          </div>
        )}
        {sensorUnavailable && (
          <p className="sensor-fallback" role="status">
            {orientation.status === 'denied'
              ? 'Tilt permission was denied.'
              : "This device or browser doesn't expose a tilt sensor."}{' '}
            Enter the angles manually below.
          </p>
        )}
      </div>

      {/* ── Manual entry / captured values ──────────────────────────────── */}
      <NumericField
        id="tan-distance"
        label="Distance to tree"
        unit={units.label('distance')}
        value={distance.value}
        onChange={distance.onChange}
        min="0"
        placeholder="e.g. 15"
        hint="Horizontal distance from where you stand to the tree base."
      />
      <NumericField
        id="tan-angle-top"
        label="Angle to top"
        unit="°"
        value={angleTop}
        onChange={setAngleTop}
        placeholder="e.g. 40"
        hint="Above horizontal."
      />
      <NumericField
        id="tan-angle-base"
        label="Angle to base"
        unit="°"
        value={angleBase}
        onChange={setAngleBase}
        placeholder="e.g. 5"
        hint="Positive = base below you; negative = base above you (uphill)."
      />

      {/* ── Live readout ────────────────────────────────────────────────── */}
      <div className="readout" aria-live="polite">
        {result === null && <p className="readout-empty">Enter distance and both angles for a height.</p>}
        {result?.ok === false && <p className="readout-error">{result.message}</p>}
        {result?.ok === true && (
          <>
            <p className="readout-value">
              <span className="readout-label">Estimated height</span>
              <span className="readout-h">{units.formatEstimate(result.estimate)}</span>
            </p>
            <button type="button" className="btn btn-primary" onClick={() => onMeasured(result.estimate)}>
              Use this height for planning
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Map the engine's precise error strings to short, friendly guidance. */
function friendlyMeasureError(raw: string): string {
  if (raw.includes('non-positive height')) {
    return 'The top angle must be above the base angle. Check your readings.';
  }
  if (raw.includes('distanceM must be positive')) {
    return 'Distance must be greater than zero.';
  }
  if (raw.includes('sighting angles must be within')) {
    return 'Angles must be within ±89°. Step back from the tree and try again.';
  }
  return 'Those values don’t make a valid measurement. Check distance and angles.';
}
