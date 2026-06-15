import { describe, it, expect } from 'vitest';
import { recommendPlan } from '../../src/engine/plan';
import type { ActionablePlan, FellingPlan, PlanInput } from '../../src/engine/types';
import * as C from '../../src/engine/constants';

/**
 * `FellingPlan` is a discriminated union (DB-1 §4): only the actionable variant
 * carries cut specs. Tests that assert on notch/hinge/etc. narrow through this
 * helper, which fails loudly if the engine unexpectedly referred.
 */
function actionable(p: FellingPlan): ActionablePlan {
  expect(p.verdict).not.toBe('refer-professional');
  if (p.verdict === 'refer-professional') {
    throw new Error('expected an actionable plan but got a referral');
  }
  return p;
}

/**
 * Cut-recommendation tests (HANDOFF §2.2).
 *
 * One named test per referral gate (each proving it fires) and per decision
 * rule, plus the six HANDOFF §5 fixtures with hand-computed expected values in
 * comments so the math can be sanity-checked.
 *
 * Convention (documented in plan.ts): `input.heightM` is the WORST-CASE height
 * H+ΔH supplied by the caller (from measure.ts). The danger radius is therefore
 * DANGER_RADIUS_HEIGHT_MULT × input.heightM directly.
 */

/** A benign baseline: small balanced softwood, calm, clear, target = lean. */
function baseInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    heightM: 14,
    dbhCm: 30,
    leanDeg: 2,
    leanAzimuth: 180,
    targetAzimuth: 180,
    windKph: 5,
    windAzimuth: 0,
    speciesClass: 'softwood',
    hazards: [],
    ...overrides,
  };
}

// ── Referral gates (Rule 1) — each must fire on its own ──────────────────────

describe('plan/Rule 1 — referral gates (each fires independently)', () => {
  it('GATE: DBH over MAX_DBH_CM refers', () => {
    const p = recommendPlan(baseInput({ dbhCm: C.MAX_DBH_CM + 1 }));
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /diameter|dbh/i.test(r))).toBe(true);
  });

  it('GATE: lean away from target over MAX_LEAN_AWAY_DEG refers', () => {
    // lean 12° directly away from target (leanAz = target+180).
    // away component = 12·cos0 = 12 > 10 → refer.
    const p = recommendPlan(baseInput({ leanDeg: 12, leanAzimuth: 0, targetAzimuth: 180 }));
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /lean/i.test(r))).toBe(true);
  });

  it('GATE: dead/compromised species refers', () => {
    const p = recommendPlan(baseInput({ speciesClass: 'dead-compromised' }));
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /dead|compromis/i.test(r))).toBe(true);
  });

  it('GATE: wind over MAX_WIND_KPH refers', () => {
    const p = recommendPlan(baseInput({ windKph: C.MAX_WIND_KPH + 1 }));
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /wind/i.test(r))).toBe(true);
  });

  it('GATE: hazard within 1.5× height of a feasible fall line refers', () => {
    // height 14 → 1.5×14 = 21 m trigger radius. House 8 m out, on the fall line.
    const p = recommendPlan(
      baseInput({ hazards: [{ kind: 'structure', distanceM: 8, azimuth: 180 }] }),
    );
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /structure|hazard/i.test(r))).toBe(true);
  });

  it('GATE: severe forward lean (> SEVERE_FORWARD_LEAN_DEG toward target) refers', () => {
    // 14° forward lean toward target → barber-chair risk → refer.
    const p = recommendPlan(baseInput({ leanDeg: 14, leanAzimuth: 180, targetAzimuth: 180 }));
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /lean/i.test(r))).toBe(true);
  });

  it('NON-GATE: a hazard well outside 1.5× height does NOT refer', () => {
    // height 14 → 21 m trigger. House 50 m out, on the fall line → safe.
    const p = recommendPlan(
      baseInput({ hazards: [{ kind: 'structure', distanceM: 50, azimuth: 180 }] }),
    );
    expect(p.verdict).not.toBe('refer-professional');
  });

  it('NON-GATE: a hazard far off to the side does NOT refer', () => {
    // Tree falls SOUTH (lean/target 180). House due EAST (90°) at 30 m: its
    // perpendicular distance to the southward fall line is the full 30 m, which
    // exceeds the 1.5×14 = 21 m trigger → no referral.
    // (NOTE: a structure close BEHIND the base would still refer — clamped to the
    // origin distance — which is the safe behavior, so we keep it well to the side.)
    const p = recommendPlan(
      baseInput({ hazards: [{ kind: 'structure', distanceM: 30, azimuth: 90 }] }),
    );
    expect(p.verdict).not.toBe('refer-professional');
  });
});

// ── DB-1 §4 — a referral carries NO actionable cut specs ─────────────────────

describe('plan/DB-1 §4 — referral variant has no cut specs', () => {
  it('referral carries no cut specs (discriminated union enforces it)', () => {
    // Dead/compromised → guaranteed referral. The referral variant must expose
    // ONLY verdict + dangerRadiusM + reasons — no notch/hinge/back-cut/fall
    // direction/steering cone/escape routes can ever leak out.
    const p = recommendPlan(baseInput({ speciesClass: 'dead-compromised' }));
    expect(p.verdict).toBe('refer-professional');
    expect('notch' in p).toBe(false);
    expect('hinge' in p).toBe(false);
    expect('backCut' in p).toBe(false);
    expect('fallAzimuth' in p).toBe(false);
    expect('steeringConeDeg' in p).toBe(false);
    expect('escapeAzimuths' in p).toBe(false);
    // But the information-only fields survive for the UI's danger zone + "why".
    expect(p.dangerRadiusM).toBeCloseTo(C.DANGER_RADIUS_HEIGHT_MULT * 14, 6);
    expect(p.reasons.length).toBeGreaterThan(0);
  });
});

// ── Rule 2 — notch selection ─────────────────────────────────────────────────

describe('plan/Rule 2 — notch selection', () => {
  it('default open-face for a balanced / lightly leaning tree', () => {
    const p = actionable(recommendPlan(baseInput()));
    expect(p.notch.type).toBe('open-face');
    expect(p.notch.openingDeg).toBe(C.OPEN_FACE_OPENING_DEG);
    // depth ≈ ⅓ DBH = 10 cm for 30 cm DBH.
    expect(p.notch.depthCm).toBeCloseTo(30 * C.NOTCH_DEPTH_DBH_FRACTION, 6);
  });

  it('conventional + bore cut for 5–10° forward lean toward target', () => {
    // 7° forward lean toward target (within the conventional window).
    const p = actionable(recommendPlan(baseInput({ leanDeg: 7, leanAzimuth: 180, targetAzimuth: 180 })));
    expect(p.notch.type).toBe('conventional');
    expect(p.notch.openingDeg).toBe(C.CONVENTIONAL_OPENING_DEG);
    expect(p.backCut.boreCut).toBe(true);
    expect(p.verdict).toBe('caution'); // bore cut is advanced
  });

  it('Humboldt is never auto-selected in v1 (no ground-slope input exists)', () => {
    // Sweep many inputs; Humboldt must never appear.
    for (let lean = 0; lean <= 9; lean++) {
      const p = actionable(
        recommendPlan(baseInput({ leanDeg: lean, leanAzimuth: 180, targetAzimuth: 180 })),
      );
      expect(p.notch.type).not.toBe('humboldt');
    }
  });
});

// ── Rule 3 — hinge ───────────────────────────────────────────────────────────

describe('plan/Rule 3 — hinge dimensions', () => {
  it('thickness = 10% DBH, length = 80% DBH for a normal trunk', () => {
    // DBH 40 → thickness 4.0 cm (≥ 2.5 min), length 32 cm.
    const p = actionable(recommendPlan(baseInput({ dbhCm: 40 })));
    expect(p.hinge.thicknessCm).toBeCloseTo(4.0, 6);
    expect(p.hinge.lengthCm).toBeCloseTo(32, 6);
  });

  it('thickness is floored at HINGE_MIN_THICKNESS_CM for thin trunks', () => {
    // DBH 20 → 10% = 2.0 cm, below the 2.5 cm floor → clamps to 2.5.
    const p = actionable(recommendPlan(baseInput({ dbhCm: 20 })));
    expect(p.hinge.thicknessCm).toBe(C.HINGE_MIN_THICKNESS_CM);
  });
});

// ── Rule 4 — back cut ────────────────────────────────────────────────────────

describe('plan/Rule 4 — back cut', () => {
  it('offset sits in the BACK_CUT_OFFSET range above the apex', () => {
    const p = actionable(recommendPlan(baseInput()));
    expect(p.backCut.offsetCm).toBeGreaterThanOrEqual(C.BACK_CUT_OFFSET_MIN_CM);
    expect(p.backCut.offsetCm).toBeLessThanOrEqual(C.BACK_CUT_OFFSET_MAX_CM);
  });

  it('wedge prompted when DBH ≥ WEDGE_DBH_THRESHOLD_CM', () => {
    const p = actionable(recommendPlan(baseInput({ dbhCm: C.WEDGE_DBH_THRESHOLD_CM })));
    expect(p.backCut.wedges).toBeGreaterThanOrEqual(1);
  });

  it('wedge prompted when a back-lean component exists (even on a thin trunk)', () => {
    // thin DBH 18 (below wedge threshold) but 6° lean away from target → wedge.
    const p = actionable(
      recommendPlan(baseInput({ dbhCm: 18, leanDeg: 6, leanAzimuth: 0, targetAzimuth: 180 })),
    );
    expect(p.backCut.wedges).toBeGreaterThanOrEqual(1);
  });
});

// ── Rule 5 — felling-direction feasibility ───────────────────────────────────

describe('plan/Rule 5 — felling-direction feasibility', () => {
  it('target within the steering cone → fallAzimuth equals target', () => {
    // lean 3° az 100, target 110: natural=100, |110−100|=10 ≤ 15 cone → feasible.
    const p = actionable(recommendPlan(baseInput({ leanDeg: 3, leanAzimuth: 100, targetAzimuth: 110 })));
    expect(p.fallAzimuth).toBeCloseTo(110, 6);
  });

  it('target outside the cone → nearest feasible azimuth, surfaced as a reason', () => {
    // Wind 0 → full open-face cone 15°. lean 4° az 100, target 130: natural=100,
    // diff 30 > 15 → fall = 100 + 15 = 115.
    const p = actionable(
      recommendPlan(baseInput({ leanDeg: 4, leanAzimuth: 100, targetAzimuth: 130, windKph: 0 })),
    );
    expect(p.fallAzimuth).toBeCloseTo(115, 6);
    expect(p.reasons.some((r) => /feasib|cannot reach|nearest/i.test(r))).toBe(true);
  });
});

// ── Rule 6 — escape routes ───────────────────────────────────────────────────

describe('plan/Rule 6 — escape routes', () => {
  it('two routes at 135°/225° off the fall line', () => {
    // fall 180 → escapes 315 and 45.
    const p = actionable(recommendPlan(baseInput()));
    expect(p.fallAzimuth).toBeCloseTo(180, 6);
    expect(p.escapeAzimuths[0]).toBeCloseTo(315, 6);
    expect(p.escapeAzimuths[1]).toBeCloseTo(45, 6);
  });
});

// ── Danger radius ────────────────────────────────────────────────────────────

describe('plan/danger radius uses worst-case height', () => {
  it('dangerRadiusM = 2 × input.heightM (caller passes H+ΔH)', () => {
    const p = recommendPlan(baseInput({ heightM: 14.8867 }));
    expect(p.dangerRadiusM).toBeCloseTo(2 * 14.8867, 6);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SIX HAND-COMPUTED FIXTURES (HANDOFF §5)
// ════════════════════════════════════════════════════════════════════════════

describe('FIXTURES (HANDOFF §5)', () => {
  it('FIXTURE 1 — small straight pine → ok, open-face', () => {
    // H+ΔH ≈ 13.8988 + 0.9879 = 14.8867 m (from measure fixture).
    // DBH 30, lean 2° toward target (180), wind 5, softwood, no hazards.
    // Notch: open-face 70°, depth ⅓·30 = 10 cm.
    // Hinge: 0.1·30 = 3.0 cm thick, 0.8·30 = 24 cm long.
    // Steering cone: 15·(1 − 0.5·5/15) = 12.5°; target == natural → fall 180.
    // Back cut: wedge (DBH 30 ≥ 25) → wedges ≥ 1, boreCut false.
    // Escapes: 315 / 45. Danger: 2·14.8867 = 29.7734 m.
    const p = actionable(
      recommendPlan({
        heightM: 14.8867,
        dbhCm: 30,
        leanDeg: 2,
        leanAzimuth: 180,
        targetAzimuth: 180,
        windKph: 5,
        windAzimuth: 0,
        speciesClass: 'softwood',
        hazards: [],
      }),
    );
    expect(p.verdict).toBe('ok');
    expect(p.notch.type).toBe('open-face');
    expect(p.notch.depthCm).toBeCloseTo(10, 6);
    expect(p.hinge.thicknessCm).toBeCloseTo(3.0, 6);
    expect(p.hinge.lengthCm).toBeCloseTo(24, 6);
    expect(p.fallAzimuth).toBeCloseTo(180, 6);
    expect(p.steeringConeDeg).toBeCloseTo(12.5, 6);
    expect(p.dangerRadiusM).toBeCloseTo(29.7734, 4);
    expect(p.backCut.boreCut).toBe(false);
    expect(p.escapeAzimuths).toEqual([315, 45]);
  });

  it('FIXTURE 2 — big oak near house → refer-professional', () => {
    // DBH 70 > 50 (gate) AND structure 10 m out on the fall line, 1.5·18 = 27 m
    // trigger → both gates fire.
    const p = recommendPlan({
      heightM: 18,
      dbhCm: 70,
      leanDeg: 3,
      leanAzimuth: 90,
      targetAzimuth: 90,
      windKph: 4,
      windAzimuth: 0,
      speciesClass: 'hardwood',
      hazards: [{ kind: 'structure', distanceM: 10, azimuth: 90 }],
    });
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /diameter|dbh/i.test(r))).toBe(true);
    expect(p.reasons.some((r) => /structure|hazard/i.test(r))).toBe(true);
    // DB-1 §4: a referral carries NO actionable cut specs.
    expect('notch' in p).toBe(false);
    expect('hinge' in p).toBe(false);
  });

  it('FIXTURE 3 — back-leaner → caution, wedge, nearest-feasible azimuth', () => {
    // lean 8° az 280, target 90. Away component = 8·cos(10°) ≈ 7.878 ≤ 10 → NO
    // lean referral. Natural fall = 280; target 90 is opposite → infeasible;
    // nearest feasible = 280 + 15 = 295. Back-lean → wedge ≥ 1.
    // DBH 35 → hinge 3.5 cm / 28 cm. Danger 2·12 = 24 m.
    const p = actionable(
      recommendPlan({
        heightM: 12,
        dbhCm: 35,
        leanDeg: 8,
        leanAzimuth: 280,
        targetAzimuth: 90,
        windKph: 0,
        windAzimuth: 0,
        speciesClass: 'hardwood',
        hazards: [],
      }),
    );
    expect(p.verdict).toBe('caution');
    expect(p.backCut.wedges).toBeGreaterThanOrEqual(1);
    expect(p.fallAzimuth).toBeCloseTo(295, 6);
    expect(p.hinge.thicknessCm).toBeCloseTo(3.5, 6);
    expect(p.hinge.lengthCm).toBeCloseTo(28, 6);
    expect(p.dangerRadiusM).toBeCloseTo(24, 6);
    expect(p.reasons.some((r) => /feasib|nearest/i.test(r))).toBe(true);
  });

  it('FIXTURE 5 — windy day → refer-professional', () => {
    // wind 25 kph > 15 → refer regardless of everything else.
    const p = recommendPlan({
      heightM: 13,
      dbhCm: 28,
      leanDeg: 2,
      leanAzimuth: 200,
      targetAzimuth: 200,
      windKph: 25,
      windAzimuth: 200,
      speciesClass: 'softwood',
      hazards: [],
    });
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /wind/i.test(r))).toBe(true);
    // DB-1 §4: a referral carries NO actionable cut specs.
    expect('notch' in p).toBe(false);
    expect('hinge' in p).toBe(false);
  });

  it('FIXTURE 6 — dead tree → refer-professional', () => {
    const p = recommendPlan({
      heightM: 15,
      dbhCm: 30,
      leanDeg: 1,
      leanAzimuth: 180,
      targetAzimuth: 180,
      windKph: 3,
      windAzimuth: 0,
      speciesClass: 'dead-compromised',
      hazards: [],
    });
    expect(p.verdict).toBe('refer-professional');
    expect(p.reasons.some((r) => /dead|compromis/i.test(r))).toBe(true);
    // DB-1 §4: a referral carries NO actionable cut specs.
    expect('notch' in p).toBe(false);
    expect('hinge' in p).toBe(false);
  });
});

// ── Unhappy path ─────────────────────────────────────────────────────────────

describe('plan/unhappy path (garbage inputs)', () => {
  it('rejects NaN / non-finite numeric inputs', () => {
    expect(() => recommendPlan(baseInput({ heightM: NaN }))).toThrow();
    expect(() => recommendPlan(baseInput({ dbhCm: Infinity }))).toThrow();
  });
  it('rejects non-positive height or DBH', () => {
    expect(() => recommendPlan(baseInput({ heightM: 0 }))).toThrow();
    expect(() => recommendPlan(baseInput({ dbhCm: -5 }))).toThrow();
  });
  it('rejects negative wind', () => {
    expect(() => recommendPlan(baseInput({ windKph: -1 }))).toThrow();
  });
});
