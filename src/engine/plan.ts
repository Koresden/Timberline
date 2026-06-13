/**
 * Cut recommendation (HANDOFF §2.2).
 *
 * Ordered guard clauses: referral gates first (any one → 'refer-professional'),
 * then notch → hinge → back cut → felling-direction feasibility → escape routes.
 * Each decision pushes a human-readable `reason`. Pure, SI throughout.
 *
 * ## `heightM` is the WORST-CASE height (H + ΔH).
 * The caller passes the worst-case height from measure.ts (H + ΔH). The danger
 * radius is therefore DANGER_RADIUS_HEIGHT_MULT × heightM directly, and the
 * hazard-proximity gate uses this same worst-case reach — both err toward a
 * larger, safer margin. The engine never re-derives ΔH here.
 *
 * ## "When in doubt, refer."
 * Every gate widens the set of trees sent to a professional. The notch/hinge/
 * back-cut specs are still computed even in a referral state so the UI *can*
 * show "what a pro would assess", but the verdict is the load-bearing output:
 * the UI suppresses actionable specs when verdict === 'refer-professional'.
 */
import type { FellingPlan, PlanInput, NotchType } from './types';
import * as C from './constants';
import { angleDiff, normalizeAzimuth, pointToRayDistanceM, DEG_TO_RAD } from './geometry';

// ── Input validation (unhappy path) ──────────────────────────────────────────

function assertValid(input: PlanInput): void {
  const finite = (v: number, label: string) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`plan.recommendPlan: ${label} must be a finite number (got ${v}).`);
    }
  };
  finite(input.heightM, 'heightM');
  finite(input.dbhCm, 'dbhCm');
  finite(input.leanDeg, 'leanDeg');
  finite(input.leanAzimuth, 'leanAzimuth');
  finite(input.targetAzimuth, 'targetAzimuth');
  finite(input.windKph, 'windKph');
  finite(input.windAzimuth, 'windAzimuth');
  if (input.heightM <= 0) throw new Error('plan.recommendPlan: heightM must be positive.');
  if (input.dbhCm <= 0) throw new Error('plan.recommendPlan: dbhCm must be positive.');
  if (input.leanDeg < 0) throw new Error('plan.recommendPlan: leanDeg must be ≥ 0.');
  if (input.windKph < 0) throw new Error('plan.recommendPlan: windKph must be ≥ 0.');
}

// ── Lean decomposition (ambiguity #1) ─────────────────────────────────────────

/**
 * Component of the lean acting AWAY from the target direction (degrees).
 * `leanAzimuth` is where the trunk leans toward; the "away" axis is the
 * direction opposite the target. We project the lean magnitude onto that axis:
 *   away = leanDeg × cos(∠ between leanAzimuth and (targetAzimuth + 180)).
 * Positive = leaning back against the intended fall (a back-leaner).
 */
function leanAwayComponentDeg(input: PlanInput): number {
  const awayAxis = normalizeAzimuth(input.targetAzimuth + 180);
  return input.leanDeg * Math.cos(angleDiff(input.leanAzimuth, awayAxis) * DEG_TO_RAD);
}

/**
 * Component of the lean acting TOWARD the target (degrees).
 *   forward = leanDeg × cos(∠ between leanAzimuth and targetAzimuth).
 * Positive = forward lean (helps the fall, but heavy forward lean is barber-chair risk).
 */
function leanForwardComponentDeg(input: PlanInput): number {
  return input.leanDeg * Math.cos(angleDiff(input.leanAzimuth, input.targetAzimuth) * DEG_TO_RAD);
}

// ── Steering cone & feasibility (Rule 5, ambiguity #3) ───────────────────────

function windReducedCone(baseConeDeg: number, windKph: number): number {
  // Linear reduction, capped at the wind referral threshold (above which we
  // refer anyway). cone × (1 − reduction × wind/maxWind).
  const w = Math.min(Math.max(windKph, 0), C.MAX_WIND_KPH);
  return baseConeDeg * (1 - C.WIND_STEERING_CONE_REDUCTION_FRACTION * (w / C.MAX_WIND_KPH));
}

interface Feasibility {
  fallAzimuth: number;
  feasible: boolean;
  /** Center of the achievable cone (natural fall direction). */
  centerAzimuth: number;
}

/**
 * Achievable fall direction. The natural fall is the lean azimuth; the hinge can
 * steer ± `coneDeg` off it. A near-vertical trunk (leanDeg ≤ NEGLIGIBLE_LEAN_DEG)
 * has no meaningful lean azimuth, so the cone is centered on the target itself
 * (the notch governs the fall) — always feasible. (Ambiguity #5.)
 */
function resolveFeasibility(input: PlanInput, coneDeg: number): Feasibility {
  const center =
    input.leanDeg <= C.NEGLIGIBLE_LEAN_DEG ? input.targetAzimuth : input.leanAzimuth;
  const diff = angleDiff(input.targetAzimuth, center); // signed
  if (Math.abs(diff) <= coneDeg) {
    return { fallAzimuth: normalizeAzimuth(input.targetAzimuth), feasible: true, centerAzimuth: center };
  }
  const sign = diff === 0 ? 1 : Math.sign(diff);
  return {
    fallAzimuth: normalizeAzimuth(center + sign * coneDeg),
    feasible: false,
    centerAzimuth: center,
  };
}

// ── Hazard proximity gate (Rule 1, ambiguity #6) ─────────────────────────────

const REFERRAL_HAZARD_KINDS = new Set(['structure', 'powerline', 'road']);

/**
 * Does any referral-class hazard sit within HAZARD_REFERRAL_HEIGHT_MULT × height
 * of a FEASIBLE fall line? The feasible fall lines sweep a cone of half-angle
 * `coneDeg` around the natural fall direction. We sample the cone densely
 * (centerline plus the two edges plus 1° steps) and, for each candidate fall
 * azimuth, measure the point-to-ray distance from the hazard to that fall line
 * (a ray of length = tree height from the base). If the nearest such distance is
 * within the trigger radius, the gate fires. Denser sampling can only catch MORE
 * hazards, so this is conservative in the safe direction.
 */
function hazardNearFeasibleFallLine(input: PlanInput, coneDeg: number): boolean {
  const triggerM = C.HAZARD_REFERRAL_HEIGHT_MULT * input.heightM;
  const center =
    input.leanDeg <= C.NEGLIGIBLE_LEAN_DEG ? input.targetAzimuth : input.leanAzimuth;

  const candidates: number[] = [];
  for (let off = -coneDeg; off <= coneDeg; off += 1) candidates.push(center + off);
  candidates.push(center + coneDeg, center - coneDeg); // ensure exact edges

  for (const hz of input.hazards) {
    if (!REFERRAL_HAZARD_KINDS.has(hz.kind)) continue;
    for (const fall of candidates) {
      const d = pointToRayDistanceM(hz.distanceM, hz.azimuth, normalizeAzimuth(fall), input.heightM);
      if (d <= triggerM) return true;
    }
  }
  return false;
}

// ── Notch selection (Rule 2) ──────────────────────────────────────────────────

interface NotchChoice {
  type: NotchType;
  openingDeg: number;
  boreCut: boolean;
  caution: boolean;
}

function selectNotch(forwardLeanDeg: number, reasons: string[]): NotchChoice {
  // Humboldt requires a ground-slope / low-stump input that v1's PlanInput does
  // not carry — so it is never auto-selected here (flagged for DB-1).
  if (
    forwardLeanDeg >= C.FORWARD_LEAN_CONVENTIONAL_MIN_DEG &&
    forwardLeanDeg <= C.FORWARD_LEAN_CONVENTIONAL_MAX_DEG
  ) {
    reasons.push(
      `Forward lean of ${forwardLeanDeg.toFixed(1)}° toward the target is in the ` +
        `${C.FORWARD_LEAN_CONVENTIONAL_MIN_DEG}–${C.FORWARD_LEAN_CONVENTIONAL_MAX_DEG}° window: ` +
        'use a conventional notch with a bore (plunge) back cut to guard against barber chair.',
    );
    return { type: 'conventional', openingDeg: C.CONVENTIONAL_OPENING_DEG, boreCut: true, caution: true };
  }
  reasons.push(
    `Open-face notch (${C.OPEN_FACE_OPENING_DEG}° opening): the hinge holds longest — the ` +
      'safest default for a non-professional.',
  );
  return { type: 'open-face', openingDeg: C.OPEN_FACE_OPENING_DEG, boreCut: false, caution: false };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function recommendPlan(input: PlanInput): FellingPlan {
  assertValid(input);

  const reasons: string[] = [];
  const referReasons: string[] = [];

  const awayLean = leanAwayComponentDeg(input);
  const forwardLean = leanForwardComponentDeg(input);

  // ── Rule 1 — referral gates. Evaluate ALL (so the UI can list every reason). ──
  if (input.dbhCm > C.MAX_DBH_CM) {
    referReasons.push(
      `Trunk diameter ${input.dbhCm} cm exceeds the ${C.MAX_DBH_CM} cm limit for a ` +
        'non-professional fell — consult a certified arborist.',
    );
  }
  if (awayLean > C.MAX_LEAN_AWAY_DEG) {
    referReasons.push(
      `The tree leans ${awayLean.toFixed(1)}° back against the intended fall (limit ` +
        `${C.MAX_LEAN_AWAY_DEG}°): the hinge cannot reliably steer it — consult a professional.`,
    );
  }
  // Ambiguity #2: heavy FORWARD lean beyond the conventional window → barber-chair risk → refer.
  if (forwardLean > C.SEVERE_FORWARD_LEAN_DEG) {
    referReasons.push(
      `Severe forward lean of ${forwardLean.toFixed(1)}° (beyond ${C.SEVERE_FORWARD_LEAN_DEG}°) ` +
        'carries a high barber-chair risk — consult a professional.',
    );
  }
  if (input.speciesClass === 'dead-compromised') {
    referReasons.push(
      'Dead or compromised tree: structural integrity is unpredictable — consult a professional.',
    );
  }
  if (input.windKph > C.MAX_WIND_KPH) {
    referReasons.push(
      `Wind ${input.windKph} kph exceeds the ${C.MAX_WIND_KPH} kph limit — wait for calmer ` +
        'conditions or consult a professional.',
    );
  }

  // Steering cone depends on the notch, which we pick next; the hazard gate and
  // feasibility both need a cone. Compute the notch first (cheap, no I/O).
  const notch = selectNotch(forwardLean, reasons);
  const baseCone =
    notch.type === 'open-face' ? C.STEERING_CONE_OPEN_FACE_DEG : C.STEERING_CONE_CONVENTIONAL_DEG;
  const steeringConeDeg = windReducedCone(baseCone, input.windKph);

  if (hazardNearFeasibleFallLine(input, steeringConeDeg)) {
    referReasons.push(
      `A structure, power line, or road sits within ${C.HAZARD_REFERRAL_HEIGHT_MULT}× the tree ` +
        'height of a possible fall line — consult a professional.',
    );
  }

  // ── Rule 3 — hinge ──────────────────────────────────────────────────────────
  const hingeThicknessCm = Math.max(
    input.dbhCm * C.HINGE_THICKNESS_DBH_FRACTION,
    C.HINGE_MIN_THICKNESS_CM,
  );
  const hingeLengthCm = input.dbhCm * C.HINGE_LENGTH_DBH_FRACTION;
  reasons.push(
    `Hinge: ${hingeThicknessCm.toFixed(1)} cm thick × ${hingeLengthCm.toFixed(1)} cm long ` +
      '(never cut through the hinge — it steers and controls the fall).',
  );

  // ── Rule 4 — back cut ─────────────────────────────────────────────────────────
  const backCutOffsetCm = C.BACK_CUT_OFFSET_MIN_CM;
  const hasBackLean = awayLean > 0;
  const wedges = input.dbhCm >= C.WEDGE_DBH_THRESHOLD_CM || hasBackLean ? 1 : 0;
  reasons.push(
    `Back cut ${backCutOffsetCm}–${C.BACK_CUT_OFFSET_MAX_CM} cm above the notch apex, level, ` +
      'leaving the hinge intact.' +
      (notch.boreCut ? ' Bore (plunge) the back cut, then release the holding wood.' : '') +
      (wedges > 0
        ? hasBackLean
          ? ' Insert a felling wedge to lift the back lean.'
          : ' Insert a felling wedge (large-diameter trunk).'
        : ''),
  );

  // ── Rule 5 — feasibility ───────────────────────────────────────────────────────
  const feas = resolveFeasibility(input, steeringConeDeg);
  if (!feas.feasible) {
    reasons.push(
      `Target ${normalizeAzimuth(input.targetAzimuth).toFixed(0)}° is outside what the hinge can ` +
        `steer (±${steeringConeDeg.toFixed(1)}° off the natural lean). Nearest feasible fall ` +
        `direction: ${feas.fallAzimuth.toFixed(0)}°.`,
    );
  }

  // ── Rule 6 — escape routes ─────────────────────────────────────────────────────
  const escapeAzimuths: [number, number] = [
    normalizeAzimuth(feas.fallAzimuth + C.ESCAPE_ROUTE_OFFSETS_DEG[0]),
    normalizeAzimuth(feas.fallAzimuth + C.ESCAPE_ROUTE_OFFSETS_DEG[1]),
  ];
  reasons.push(
    `Escape: two routes ≥ ${C.ESCAPE_ROUTE_MIN_M} m back-left and back-right of the fall line ` +
      `(${escapeAzimuths[0].toFixed(0)}° / ${escapeAzimuths[1].toFixed(0)}°). Never stand directly ` +
      'behind the tree.',
  );

  // ── Danger radius (worst-case height; see header) ──────────────────────────────
  const dangerRadiusM = C.DANGER_RADIUS_HEIGHT_MULT * input.heightM;

  // ── Verdict ────────────────────────────────────────────────────────────────────
  // 'caution' is reserved for genuinely ADVANCED / edge selections: a bore cut, a
  // wedge needed to lift a back lean, or a target the hinge cannot reach. A plain
  // large-diameter wedge prompt (DBH ≥ threshold, no back lean) is routine and
  // does NOT downgrade an otherwise-clean fell. (Humboldt is unreachable in v1.)
  let verdict: FellingPlan['verdict'];
  if (referReasons.length > 0) {
    verdict = 'refer-professional';
  } else if (notch.caution || hasBackLean || !feas.feasible) {
    verdict = 'caution';
  } else {
    verdict = 'ok';
  }

  // Referral reasons lead the list so they surface first in the UI.
  const allReasons = [...referReasons, ...reasons];

  return {
    verdict,
    notch: { type: notch.type, openingDeg: notch.openingDeg, depthCm: input.dbhCm * C.NOTCH_DEPTH_DBH_FRACTION },
    hinge: { thicknessCm: hingeThicknessCm, lengthCm: hingeLengthCm },
    backCut: { offsetCm: backCutOffsetCm, boreCut: notch.boreCut, wedges },
    fallAzimuth: feas.fallAzimuth,
    steeringConeDeg,
    escapeAzimuths,
    dangerRadiusM,
    reasons: allReasons,
  };
}
