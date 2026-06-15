/**
 * Stick-method checklist (HANDOFF §2.1 B). Renders `STICK_METHOD_STEPS` from the
 * engine as a numbered guide — NO math input, NO numeric solve (the distance
 * walked ≈ the height). The user paces the final distance themselves; the engine
 * exposes the steps as ordered data, this just lists them.
 */
import { STICK_METHOD_STEPS } from '../../engine/measure';

export function StickChecklist() {
  return (
    <div className="stick-checklist">
      <p className="method-intro">
        No sensors needed. Follow these steps; the distance you pace at the end is your
        tree's height.
      </p>
      <ol>
        {STICK_METHOD_STEPS.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <p className="method-note">
        The stick method gives a rough height only — for planning a fell, prefer the
        clinometer (tangent) method where you can.
      </p>
    </div>
  );
}
