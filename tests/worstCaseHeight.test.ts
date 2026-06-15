/**
 * The Measure → Plan handoff contract (CRITICAL CONTRACT #1, DB-1 §5).
 *
 * `recommendPlan({ heightM, ... })` expects the WORST-CASE height H + ΔH — NOT
 * the bare best estimate. `worstCaseHeightM` is the single helper that derives it
 * and is what the Plan screen seeds its height field with. This test documents
 * and pins that contract: undersizing the height here would undersize the 2×
 * danger radius downstream — a safety bug. Pure logic, node env.
 */
import { describe, it, expect } from 'vitest';
import { worstCaseHeightM } from '../src/store/worstCaseHeight';
import type { HeightEstimate } from '../src/engine/types';

describe('worstCaseHeightM — the H + ΔH safety contract', () => {
  it('returns heightM + errorM, never the bare best estimate', () => {
    // From DB-1 fixture 1: H = 13.899, ΔH ≈ 0.988 → worst-case 14.887.
    const estimate: HeightEstimate = { heightM: 13.899, errorM: 0.988, method: 'tangent' };
    expect(worstCaseHeightM(estimate)).toBeCloseTo(14.887, 3);
    // Explicitly NOT the bare estimate — that would undersize the danger zone.
    expect(worstCaseHeightM(estimate)).not.toBeCloseTo(estimate.heightM, 3);
  });

  it('always exceeds the best estimate when there is any error band', () => {
    const estimate: HeightEstimate = { heightM: 18, errorM: 1.5, method: 'tangent' };
    expect(worstCaseHeightM(estimate)).toBeGreaterThan(estimate.heightM);
    expect(worstCaseHeightM(estimate)).toBe(19.5);
  });

  it('equals the estimate only when the error band is zero', () => {
    const estimate: HeightEstimate = { heightM: 10, errorM: 0, method: 'stick' };
    expect(worstCaseHeightM(estimate)).toBe(10);
  });
});
