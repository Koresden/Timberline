/**
 * Shared engine contracts (the "seam" between domain logic and UI).
 *
 * These types are transcribed from HANDOFF §2.2 — design the seam first, so the
 * boundary is reviewed cheaply before Phase 1 fills in the math. The engine
 * produces these; the UI only ever consumes them.
 *
 * All distances/angles here are SI (cm, m, degrees, kph). Azimuths are degrees
 * clockwise from north (0–360).
 */

// ── Plan inputs (HANDOFF §2.2) ───────────────────────────────────────────────

export type SpeciesClass = 'softwood' | 'hardwood' | 'dead-compromised' | 'palm-like';

export type HazardKind = 'structure' | 'powerline' | 'road' | 'tree' | 'other';

export interface Hazard {
  kind: HazardKind;
  /** Distance from the tree base (m). */
  distanceM: number;
  /** Direction from the tree base (degrees clockwise from north). */
  azimuth: number;
}

export interface PlanInput {
  heightM: number;
  dbhCm: number;
  /** Lean magnitude (degrees from vertical). */
  leanDeg: number;
  /** Direction the tree leans (degrees clockwise from north). */
  leanAzimuth: number;
  /** Desired fall direction (degrees clockwise from north). */
  targetAzimuth: number;
  windKph: number;
  /** Direction the wind blows toward (degrees clockwise from north). */
  windAzimuth: number;
  speciesClass: SpeciesClass;
  hazards: Hazard[];
}

// ── Plan output (HANDOFF §2.2) ───────────────────────────────────────────────

export type Verdict = 'ok' | 'caution' | 'refer-professional';

export type NotchType = 'open-face' | 'conventional' | 'humboldt';

/**
 * Referral result (DB-1 §4). When any referral gate fires, the engine returns
 * ONLY this variant — it carries NO actionable cut specs (no notch/hinge/back
 * cut/fall direction/steering cone/escape routes). This makes it impossible at
 * the type level for a consumer to surface cut guidance for a tree that must go
 * to a professional; defense-in-depth, not UI suppression.
 *
 * `dangerRadiusM` is retained so the UI's information-only mode can still draw
 * the 2× tree-height danger zone, and `reasons` so it can explain every gate
 * that triggered the referral.
 */
export interface ReferralPlan {
  verdict: 'refer-professional';
  /** 2 × (height + ΔH). */
  dangerRadiusM: number;
  /** Every referral gate that fired, human-readable, for the UI's "why" list. */
  reasons: string[];
}

/**
 * Actionable result (DB-1 §4). Returned only when NO referral gate fired, so a
 * full set of cut specs is safe to surface.
 */
export interface ActionablePlan {
  verdict: 'ok' | 'caution';
  notch: { type: NotchType; openingDeg: number; depthCm: number };
  hinge: { thicknessCm: number; lengthCm: number };
  backCut: { offsetCm: number; boreCut: boolean; wedges: number };
  /** Achievable fall azimuth — may differ from the requested target. */
  fallAzimuth: number;
  steeringConeDeg: number;
  escapeAzimuths: [number, number];
  /** 2 × (height + ΔH). */
  dangerRadiusM: number;
  /** Every rule that fired, human-readable, for the UI's "why" list. */
  reasons: string[];
}

/**
 * The plan contract is a discriminated union on `verdict` (DB-1 §4). Narrow on
 * `verdict` (or `'notch' in plan`) before touching cut specs — a referral plan
 * simply does not have them.
 */
export type FellingPlan = ReferralPlan | ActionablePlan;

// ── Measurement (HANDOFF §2.1) ───────────────────────────────────────────────

export type MeasureMethod = 'tangent' | 'stick';

/** A measured height with its propagated worst-case error band. */
export interface HeightEstimate {
  /** Best-estimate height (m). */
  heightM: number;
  /** ±ΔH (m), from ±1° angle and ±2% distance error. */
  errorM: number;
  method: MeasureMethod;
}
