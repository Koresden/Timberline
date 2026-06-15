/**
 * Plan input form (HANDOFF §2.2 / §5). Collects a `PlanInput` and submits it to
 * the parent, which calls the engine. No felling math here.
 *
 * SAFETY CONTRACT (CRITICAL #1): the height field is prefilled from the Measure
 * result as the WORST-CASE H + ΔH (`worstCaseHeightM`), NOT the bare estimate.
 * The field is editable, but it is seeded and labelled as worst-case so the
 * danger zone is never undersized. The actual SI value handed to `recommendPlan`
 * is whatever is in this field (already worst-case when it came from Measure).
 *
 * Units: height + DBH are entered through `useUnits` (SI stored); angles/azimuths
 * are unit-agnostic degrees; wind uses the speed unit.
 */
import { useEffect, useRef, useState } from 'react';
import type { Hazard, HazardKind, PlanInput, SpeciesClass } from '../../engine/types';
import { useUnits } from '../../hooks/useUnits';
import { useUnitField } from '../../hooks/useUnitField';
import { convertDisplayValue } from '../../units';
import { NumericField } from '../../components/NumericField';

interface PlanFormProps {
  /** Worst-case height (H + ΔH) in SI metres, if a measurement was handed off. */
  prefillHeightM: number | null;
  onSubmit: (input: PlanInput) => void;
}

const SPECIES: { value: SpeciesClass; label: string }[] = [
  { value: 'softwood', label: 'Softwood (e.g. pine, fir)' },
  { value: 'hardwood', label: 'Hardwood (e.g. oak, maple)' },
  { value: 'dead-compromised', label: 'Dead / compromised' },
  { value: 'palm-like', label: 'Palm-like' },
];

const HAZARD_KINDS: { value: HazardKind; label: string }[] = [
  { value: 'structure', label: 'Structure' },
  { value: 'powerline', label: 'Power line' },
  { value: 'road', label: 'Road' },
  { value: 'tree', label: 'Tree' },
  { value: 'other', label: 'Other' },
];

interface HazardDraft {
  kind: HazardKind;
  distance: string;
  azimuth: string;
}

export function PlanForm({ prefillHeightM, onSubmit }: PlanFormProps) {
  const units = useUnits();

  // Unit-bearing fields go through useUnitField so they re-convert on a unit
  // toggle from their canonical SI value (DB-2 D2, drift-free). Lean/azimuth
  // fields are unit-agnostic degrees and stay plain string state.
  const height = useUnitField('distance');
  const dbh = useUnitField('diameter');
  const windKph = useUnitField('speed', '0');
  const [leanDeg, setLeanDeg] = useState('0');
  const [leanAzimuth, setLeanAzimuth] = useState('0');
  const [targetAzimuth, setTargetAzimuth] = useState('0');
  const [windAzimuth, setWindAzimuth] = useState('0');
  const [species, setSpecies] = useState<SpeciesClass>('softwood');
  const [hazards, setHazards] = useState<HazardDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Seed the height field from the handoff. The incoming value is ALREADY the
  // worst-case H + ΔH (the store/parent derived it via worstCaseHeightM); we seed
  // the canonical SI so the field both displays correctly now AND re-converts
  // losslessly on a later unit toggle. Re-runs if a new measurement arrives.
  useEffect(() => {
    if (prefillHeightM !== null) {
      height.setFromSI(prefillHeightM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillHeightM]);

  // Hazard distances live in a dynamic array, so they can't each own a
  // useUnitField hook. Instead, on a unit-system flip, re-convert every hazard
  // distance string from the previous system via the pure convertDisplayValue
  // (blanks/garbage pass through untouched). A useRef tracks the previous system.
  const prevSystem = useRef(units.system);
  useEffect(() => {
    if (prevSystem.current === units.system) return;
    const from = prevSystem.current;
    prevSystem.current = units.system;
    setHazards((hs) =>
      hs.map((hz) => ({
        ...hz,
        distance: convertDisplayValue(hz.distance, 'distance', from, units.system),
      })),
    );
  }, [units.system]);

  const addHazard = () =>
    setHazards((h) => [...h, { kind: 'structure', distance: '', azimuth: '0' }]);
  const removeHazard = (i: number) => setHazards((h) => h.filter((_, idx) => idx !== i));
  const updateHazard = (i: number, patch: Partial<HazardDraft>) =>
    setHazards((h) => h.map((hz, idx) => (idx === i ? { ...hz, ...patch } : hz)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const heightM = units.parseInput(height.value, 'distance');
    const dbhCm = units.parseInput(dbh.value, 'diameter');
    const windKphSI = units.parseInput(windKph.value, 'speed');

    const nums = {
      heightM,
      dbhCm,
      leanDeg: numOrNull(leanDeg),
      leanAzimuth: numOrNull(leanAzimuth),
      targetAzimuth: numOrNull(targetAzimuth),
      windKph: windKphSI,
      windAzimuth: numOrNull(windAzimuth),
    };

    if (Object.values(nums).some((v) => v === null)) {
      setError('Please fill in height, diameter, lean, target, and wind with valid numbers.');
      return;
    }
    if ((nums.heightM as number) <= 0 || (nums.dbhCm as number) <= 0) {
      setError('Height and trunk diameter must be greater than zero.');
      return;
    }

    const parsedHazards: Hazard[] = [];
    for (const hz of hazards) {
      const distanceM = units.parseInput(hz.distance, 'distance');
      const azimuth = numOrNull(hz.azimuth);
      if (distanceM === null || azimuth === null || distanceM < 0) {
        setError('Each hazard needs a valid distance and bearing.');
        return;
      }
      parsedHazards.push({ kind: hz.kind, distanceM, azimuth });
    }

    onSubmit({
      heightM: nums.heightM as number,
      dbhCm: nums.dbhCm as number,
      leanDeg: nums.leanDeg as number,
      leanAzimuth: nums.leanAzimuth as number,
      targetAzimuth: nums.targetAzimuth as number,
      windKph: nums.windKph as number,
      windAzimuth: nums.windAzimuth as number,
      speciesClass: species,
      hazards: parsedHazards,
    });
  };

  return (
    <form className="plan-form" onSubmit={handleSubmit} noValidate>
      <NumericField
        id="plan-height"
        label="Tree height (worst-case H + ΔH)"
        unit={units.label('distance')}
        value={height.value}
        onChange={height.onChange}
        min="0"
        placeholder="Measure first, or enter manually"
        hint={
          prefillHeightM !== null
            ? 'Prefilled from your measurement as the worst-case height — keep this for a safe danger zone.'
            : 'Use the worst-case height (best estimate + error band) for a safe danger zone.'
        }
      />
      <NumericField
        id="plan-dbh"
        label="Trunk diameter (DBH)"
        unit={units.label('diameter')}
        value={dbh.value}
        onChange={dbh.onChange}
        min="0"
        placeholder="at breast height"
      />

      <fieldset className="field-group">
        <legend>Lean</legend>
        <NumericField id="plan-lean-deg" label="Lean angle" unit="°" value={leanDeg} onChange={setLeanDeg} min="0" />
        <NumericField
          id="plan-lean-az"
          label="Lean direction"
          unit="° from N"
          value={leanAzimuth}
          onChange={setLeanAzimuth}
          hint="Compass bearing the tree leans toward (0 = north, 90 = east)."
        />
      </fieldset>

      <NumericField
        id="plan-target-az"
        label="Target fall direction"
        unit="° from N"
        value={targetAzimuth}
        onChange={setTargetAzimuth}
        hint="Where you want it to fall (compass bearing)."
      />

      <fieldset className="field-group">
        <legend>Wind</legend>
        <NumericField id="plan-wind" label="Wind speed" unit={units.label('speed')} value={windKph.value} onChange={windKph.onChange} min="0" />
        <NumericField
          id="plan-wind-az"
          label="Wind direction"
          unit="° from N"
          value={windAzimuth}
          onChange={setWindAzimuth}
          hint="Bearing the wind blows toward."
        />
      </fieldset>

      <div className="field">
        <label htmlFor="plan-species">Species class</label>
        <select id="plan-species" value={species} onChange={(e) => setSpecies(e.target.value as SpeciesClass)}>
          {SPECIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Hazards ─────────────────────────────────────────────────────── */}
      <fieldset className="field-group hazards">
        <legend>Nearby hazards</legend>
        {hazards.length === 0 && <p className="method-note">None added. Add structures, power lines, roads, or trees near the fall.</p>}
        {hazards.map((hz, i) => (
          <div className="hazard-row" key={i}>
            <select
              aria-label={`Hazard ${i + 1} type`}
              value={hz.kind}
              onChange={(e) => updateHazard(i, { kind: e.target.value as HazardKind })}
            >
              {HAZARD_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <NumericField
              id={`hazard-${i}-dist`}
              label="Distance"
              unit={units.label('distance')}
              value={hz.distance}
              onChange={(v) => updateHazard(i, { distance: v })}
              min="0"
            />
            <NumericField
              id={`hazard-${i}-az`}
              label="Bearing"
              unit="° from N"
              value={hz.azimuth}
              onChange={(v) => updateHazard(i, { azimuth: v })}
            />
            <button type="button" className="btn btn-ghost" onClick={() => removeHazard(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={addHazard}>
          Add hazard
        </button>
      </fieldset>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block">
        Get felling plan
      </button>
    </form>
  );
}

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
