/**
 * Stepper (presentational) — the Measure → Plan → Sim progress control from
 * design SPEC §4. Three equal pills with active / done / idle states. The badge
 * shows the step number, or a check (✓) once done. Pure presentation: the parent
 * owns navigation and derives each step's state from the store (a measured height
 * marks Measure done; a published plan marks Plan done).
 *
 * Each pill is a real <button> so it stays keyboard-reachable and meets the 48px
 * gloved-use hit target (the visual pill is 32px tall inside a padded tap area).
 * Never color-only: every state pairs its color with a number or a ✓ glyph + label.
 */
export interface Step {
  key: string;
  label: string;
  state: 'active' | 'done' | 'idle';
}

interface StepperProps {
  steps: Step[];
  onSelect: (key: string) => void;
}

export function Stepper({ steps, onSelect }: StepperProps) {
  return (
    <nav className="stepper" aria-label="Progress">
      {steps.map((step, i) => (
        <button
          key={step.key}
          type="button"
          className={`step step--${step.state}`}
          aria-current={step.state === 'active' ? 'step' : undefined}
          onClick={() => onSelect(step.key)}
        >
          <span className="step-badge" aria-hidden="true">
            {step.state === 'done' ? '✓' : i + 1}
          </span>
          <span className="step-label">{step.label}</span>
        </button>
      ))}
    </nav>
  );
}
