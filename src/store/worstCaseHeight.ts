/**
 * The single, load-bearing safety contract of the Measure → Plan handoff.
 *
 * `recommendPlan({ heightM, ... })` expects the WORST-CASE height H + ΔH, NOT
 * the bare best estimate (HANDOFF §2.1, DB-1 §5, plan.ts header). The danger
 * radius is `2 × heightM`, so passing the bare `heightM` would undersize the
 * danger zone — a safety bug. This pure helper is the ONE place that derives the
 * worst-case height, so it can be unit-tested in isolation and reused by the
 * store and the Plan screen without re-deriving the rule ad hoc.
 */
import type { HeightEstimate } from '../engine/types';

/**
 * Worst-case height fed to the engine: best estimate PLUS the error band.
 * `H + ΔH`, never the bare `H`.
 */
export function worstCaseHeightM(estimate: HeightEstimate): number {
  return estimate.heightM + estimate.errorM;
}
