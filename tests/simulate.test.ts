/**
 * Pure-helper tests for the Simulate views (Phase 3, sim-dev). Node env, no new
 * deps. Covers ONLY the pure presentational helpers — the azimuth→SVG mapping,
 * the m↔px scaling, and the θ(t) fall curve. DOM-render tests (drag, pulse) are
 * qa's Phase 4 job (would need jsdom = a new dep, which DB-0 gates).
 */
import { describe, it, expect } from 'vitest';
import {
  FALL_TOTAL_DEG,
  HINGE_HOLD_DEG,
  azimuthToScreen,
  fallAngleAtTime,
  fallDurationMs,
  fitScalePxPerM,
  hingeHolds,
  metresToScreen,
  smoothstep,
} from '../src/features/simulate/geometry';

const C = 100;

describe('azimuthToScreen — north-up, y flipped for SVG', () => {
  it('north (0°) points straight UP (−y)', () => {
    const p = azimuthToScreen(0, 50, C, C);
    expect(p.x).toBeCloseTo(C, 6);
    expect(p.y).toBeCloseTo(C - 50, 6); // up = smaller y
  });

  it('east (90°) points RIGHT (+x)', () => {
    const p = azimuthToScreen(90, 50, C, C);
    expect(p.x).toBeCloseTo(C + 50, 6);
    expect(p.y).toBeCloseTo(C, 6);
  });

  it('south (180°) points DOWN (+y)', () => {
    const p = azimuthToScreen(180, 50, C, C);
    expect(p.x).toBeCloseTo(C, 6);
    expect(p.y).toBeCloseTo(C + 50, 6);
  });

  it('west (270°) points LEFT (−x)', () => {
    const p = azimuthToScreen(270, 50, C, C);
    expect(p.x).toBeCloseTo(C - 50, 6);
    expect(p.y).toBeCloseTo(C, 6);
  });
});

describe('metresToScreen — engine frame (x=east, y=north) → SVG (y down)', () => {
  it('north metres go UP on screen (−y)', () => {
    const p = metresToScreen(0, 10, 2, C, C); // 10 m north, 2 px/m
    expect(p.x).toBeCloseTo(C, 6);
    expect(p.y).toBeCloseTo(C - 20, 6);
  });

  it('east metres go RIGHT (+x); south metres go DOWN (+y)', () => {
    const p = metresToScreen(5, -3, 2, C, C);
    expect(p.x).toBeCloseTo(C + 10, 6);
    expect(p.y).toBeCloseTo(C + 6, 6);
  });

  it('round-trips with azimuthToScreen for a cardinal point', () => {
    // A point 10 m due east at 2 px/m equals an east ray of 20 px.
    const viaMetres = metresToScreen(10, 0, 2, C, C);
    const viaAzimuth = azimuthToScreen(90, 20, C, C);
    expect(viaMetres.x).toBeCloseTo(viaAzimuth.x, 6);
    expect(viaMetres.y).toBeCloseTo(viaAzimuth.y, 6);
  });
});

describe('fitScalePxPerM — fits the danger circle with a margin', () => {
  it('places the danger ring just inside the viewport edge', () => {
    const view = 320;
    const margin = 20;
    const radiusM = 30;
    const scale = fitScalePxPerM(radiusM, view, margin);
    // The ring radius in px must equal the usable half (no clipping, no waste).
    expect(radiusM * scale).toBeCloseTo(view / 2 - margin, 6);
  });

  it('is positive and finite for a degenerate (zero) radius', () => {
    const scale = fitScalePxPerM(0, 320, 20);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });

  it('a bigger danger radius yields a smaller scale (zooms out)', () => {
    const small = fitScalePxPerM(10, 320, 20);
    const big = fitScalePxPerM(40, 320, 20);
    expect(big).toBeLessThan(small);
  });
});

describe('smoothstep', () => {
  it('pins endpoints and the midpoint', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 6);
  });
  it('clamps out-of-range input', () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(2)).toBe(1);
  });
});

describe('fallAngleAtTime — θ(t): monotonic 0 → ~90°, holds region', () => {
  const dur = 2500;

  it('starts upright and ends flat', () => {
    expect(fallAngleAtTime(0, dur)).toBeCloseTo(0, 6);
    expect(fallAngleAtTime(dur, dur)).toBeCloseTo(FALL_TOTAL_DEG, 6);
    expect(fallAngleAtTime(dur * 2, dur)).toBeCloseTo(FALL_TOTAL_DEG, 6); // clamps past end
  });

  it('is monotonic non-decreasing across the sweep', () => {
    let prev = -1;
    for (let i = 0; i <= 50; i++) {
      const theta = fallAngleAtTime((i / 50) * dur, dur);
      expect(theta).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = theta;
    }
  });

  it('stays within [0, 90]', () => {
    for (let i = 0; i <= 20; i++) {
      const theta = fallAngleAtTime((i / 20) * dur, dur);
      expect(theta).toBeGreaterThanOrEqual(0);
      expect(theta).toBeLessThanOrEqual(FALL_TOTAL_DEG);
    }
  });

  it('hinge holds early and releases past the hold angle', () => {
    expect(hingeHolds(fallAngleAtTime(0, dur))).toBe(true);
    expect(hingeHolds(10)).toBe(true);
    expect(hingeHolds(HINGE_HOLD_DEG)).toBe(false); // boundary: not holding at the threshold
    expect(hingeHolds(80)).toBe(false);
  });

  it('handles a non-positive duration without NaN (returns flat)', () => {
    expect(fallAngleAtTime(0, 0)).toBe(FALL_TOTAL_DEG);
  });
});

describe('fallDurationMs — height-scaled, clamped', () => {
  it('lands a nominal ~15 m tree near the ~2.5 s target', () => {
    const ms = fallDurationMs(15);
    expect(ms).toBeGreaterThan(2200);
    expect(ms).toBeLessThan(2900);
  });

  it('is monotonic in height and clamped to a sane band', () => {
    expect(fallDurationMs(5)).toBeLessThanOrEqual(fallDurationMs(40));
    expect(fallDurationMs(0)).toBeGreaterThanOrEqual(1500);
    expect(fallDurationMs(1000)).toBeLessThanOrEqual(3200);
  });

  it('treats garbage height as zero (no NaN)', () => {
    expect(Number.isFinite(fallDurationMs(NaN))).toBe(true);
    expect(Number.isFinite(fallDurationMs(-5))).toBe(true);
  });
});
