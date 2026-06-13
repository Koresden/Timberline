import { describe, it, expect } from 'vitest';
import * as C from '../../src/engine/constants';

/**
 * Phase 0 hello-world test: proves the vitest pipeline runs and that the engine
 * imports cleanly with no React/DOM dependency. It also pins the safety
 * constants so an accidental edit (which the standing rules forbid without a
 * Decision Brief) trips a red test. Phase 1 adds the real per-rule suites.
 */
describe('engine/constants (safety values are locked)', () => {
  it('referral gates match HANDOFF §2.2', () => {
    expect(C.MAX_DBH_CM).toBe(50);
    expect(C.MAX_LEAN_AWAY_DEG).toBe(10);
    expect(C.MAX_WIND_KPH).toBe(15);
    expect(C.HAZARD_REFERRAL_HEIGHT_MULT).toBe(1.5);
  });

  it('danger radius is 2× tree height (OSHA-style clear zone)', () => {
    expect(C.DANGER_RADIUS_HEIGHT_MULT).toBe(2);
  });

  it('hinge spec matches HANDOFF §2.2(3)', () => {
    expect(C.HINGE_THICKNESS_DBH_FRACTION).toBe(0.1);
    expect(C.HINGE_MIN_THICKNESS_CM).toBe(2.5);
    expect(C.HINGE_LENGTH_DBH_FRACTION).toBe(0.8);
  });

  it('escape routes are 135° / 225° off the fall line', () => {
    expect(C.ESCAPE_ROUTE_OFFSETS_DEG).toEqual([135, 225]);
    expect(C.ESCAPE_ROUTE_MIN_M).toBe(4.5);
  });
});
