/**
 * Safety-relevant constants for Timberline's domain engine.
 *
 * EVERY magic number that affects a recommendation or a safety margin lives
 * here — never inline in measure/plan/sim. (HANDOFF §3.)
 *
 * These values are LOCKED. Per the standing rules (HANDOFF §6, rule 2) they are
 * never modified without an explicit Decision Brief. Each carries a citation to
 * its source so a reviewer can check it against the original guidance.
 *
 * Sources:
 *  - OSHA 29 CFR 1910.266 (Logging Operations) — retreat path, danger zone.
 *  - USFS / USDA Forest Service felling guidance ("The Ax and the Saw"; FISTA
 *    / Game of Logging open-face felling technique) — notch, hinge, bore cut.
 *  - Timberline HANDOFF §2.2 — the numeric thresholds adopted for v1.
 *
 * Units are SI throughout (cm, m, degrees, kph). Conversion to imperial
 * happens only at the display boundary (HANDOFF §3, `useUnits`).
 */

// ── Referral gates (hard stops → "consult a professional") ───────────────────
// HANDOFF §1 / §2.2 rule 1. Any one of these forces 'refer-professional'.

/** Max trunk diameter at breast height before a pro is required. 50 cm ≈ 20 in
 *  (HANDOFF §1 "trees > 20 in DBH"). Source: HANDOFF §2.2(1). */
export const MAX_DBH_CM = 50;

/** Max lean (degrees) away from the target fall direction before referral.
 *  Beyond this the hinge cannot reliably steer the tree. Source: HANDOFF §2.2(1). */
export const MAX_LEAN_AWAY_DEG = 10;

/** Max wind speed (kph) for a non-professional fell. Source: HANDOFF §2.2(1). */
export const MAX_WIND_KPH = 15;

/** A hazard (structure | powerline | road) within this multiple of tree height
 *  of any feasible fall line forces referral. Source: HANDOFF §2.2(1). */
export const HAZARD_REFERRAL_HEIGHT_MULT = 1.5;

// ── Notch geometry ───────────────────────────────────────────────────────────
// HANDOFF §2.2 rule 2.

/** Open-face notch total opening angle (degrees). The hinge holds longest with
 *  this face; safest default for non-pros. Source: Game of Logging / USFS. */
export const OPEN_FACE_OPENING_DEG = 70;

/** Conventional notch opening angle (degrees). Used for heavy forward lean with
 *  a bore back cut to prevent barber chair. Source: USFS felling guidance. */
export const CONVENTIONAL_OPENING_DEG = 45;

/** Notch depth as a fraction of DBH (≈ one third). Source: HANDOFF §2.2(2). */
export const NOTCH_DEPTH_DBH_FRACTION = 1 / 3;

/** Forward-lean window (degrees, toward target) that selects a conventional
 *  notch + bore cut instead of open-face. Source: HANDOFF §2.2(2). */
export const FORWARD_LEAN_CONVENTIONAL_MIN_DEG = 5;
export const FORWARD_LEAN_CONVENTIONAL_MAX_DEG = 10;

// ── Hinge ────────────────────────────────────────────────────────────────────
// HANDOFF §2.2 rule 3. The hinge is what steers and controls the fall — never
// cut through it.

/** Hinge thickness as a fraction of DBH. Source: HANDOFF §2.2(3). */
export const HINGE_THICKNESS_DBH_FRACTION = 0.1;

/** Absolute minimum hinge thickness (cm), regardless of DBH. Source: HANDOFF §2.2(3). */
export const HINGE_MIN_THICKNESS_CM = 2.5;

/** Hinge length as a fraction of DBH. Source: HANDOFF §2.2(3). */
export const HINGE_LENGTH_DBH_FRACTION = 0.8;

// ── Back cut ─────────────────────────────────────────────────────────────────
// HANDOFF §2.2 rule 4.

/** Back cut height above the notch apex (cm), inclusive range. Source: HANDOFF §2.2(4). */
export const BACK_CUT_OFFSET_MIN_CM = 2.5;
export const BACK_CUT_OFFSET_MAX_CM = 5;

/** DBH (cm) at or above which a wedge is prompted. Source: HANDOFF §2.2(4). */
export const WEDGE_DBH_THRESHOLD_CM = 25;

// ── Felling-direction steering ───────────────────────────────────────────────
// HANDOFF §2.2 rule 5. How far the hinge can pull the fall off the natural lean.

/**
 * Lean magnitude (degrees) below which the trunk is treated as effectively
 * balanced — the notch direction, not the lean, governs the natural fall, so the
 * achievable steering cone is centered on the TARGET. NEWLY INTRODUCED for v1 —
 * flagged for DB-1. HANDOFF §2.2(5) says "achievable = lean azimuth ± steering
 * limit" but a near-vertical tree has no meaningful lean azimuth. 1° is below the
 * ±1° measurement resolution, so anything at/under it is noise. Source: v1
 * assumption, pending DB-1.
 */
export const NEGLIGIBLE_LEAN_DEG = 1;

/** Max steering deflection (degrees) for an open-face notch. Source: HANDOFF §2.2(5). */
export const STEERING_CONE_OPEN_FACE_DEG = 15;

/** Max steering deflection (degrees) for a conventional notch. Source: HANDOFF §2.2(5). */
export const STEERING_CONE_CONVENTIONAL_DEG = 10;

/**
 * Wind reduction of the steering cone (HANDOFF §2.2(5): steering is "less in
 * wind", quantity unspecified). NEWLY INTRODUCED for v1 — flagged for DB-1.
 *
 * We scale the cone down LINEARLY with wind from 0 at calm to this fraction at
 * the MAX_WIND_KPH referral threshold:
 *   cone *= 1 − WIND_STEERING_CONE_REDUCTION_FRACTION × (windKph / MAX_WIND_KPH)
 * Above MAX_WIND_KPH the fell is referred anyway, so the factor never exceeds
 * this cap. 0.5 (halve the cone at the wind limit) is a conservative choice:
 * less steering authority → the achievable cone shrinks → a target is more
 * likely judged infeasible, which is the safe direction. Source: v1 assumption,
 * pending DB-1.
 */
export const WIND_STEERING_CONE_REDUCTION_FRACTION = 0.5;

/**
 * Severe-forward-lean referral threshold (degrees, toward target). HANDOFF
 * §2.2(2) only specifies open-face (default) and conventional+bore for 5–10°
 * forward lean; §1 says a tree "leaning heavily" → arborist. NEWLY INTRODUCED
 * for v1 — flagged for DB-1.
 *
 * Forward lean beyond the conventional window carries barber-chair risk that a
 * non-professional should not attempt, so we refer. Set equal to the top of the
 * conventional window (FORWARD_LEAN_CONVENTIONAL_MAX_DEG = 10°): forward lean
 * strictly greater than this refers. Source: HANDOFF §1 ("leaning heavily"),
 * pending DB-1.
 */
export const SEVERE_FORWARD_LEAN_DEG = FORWARD_LEAN_CONVENTIONAL_MAX_DEG;

// ── Escape routes ────────────────────────────────────────────────────────────
// HANDOFF §2.2 rule 6 / §1. OSHA-style retreat: two routes ~45° back from the
// fall line — i.e. 135° and 225° relative to it. Never directly behind the tree.

/** Escape route azimuths relative to the fall line (degrees). Source: OSHA 1910.266. */
export const ESCAPE_ROUTE_OFFSETS_DEG = [135, 225] as const;

/** Minimum escape route length (m). Source: HANDOFF §2.2(6). */
export const ESCAPE_ROUTE_MIN_M = 4.5;

// ── Danger zone & simulation margins ─────────────────────────────────────────
// HANDOFF §1 / §2.3.

/** Danger radius = this multiple of (height + ΔH). The 2× tree-height danger
 *  zone is the OSHA-style minimum clear area. Source: OSHA 1910.266 / HANDOFF §1. */
export const DANGER_RADIUS_HEIGHT_MULT = 2;

/** Bounce/roll allowance: extend the fall corridor this fraction past the tip
 *  for hazard checking only (rendered hatched). Source: HANDOFF §2.3. */
export const BOUNCE_ROLL_EXTENSION_FRACTION = 0.2;

/**
 * Corridor uncertainty bonus (degrees) added to the half-angle of the fall
 * corridor BEYOND the steering cone (HANDOFF §2.3: "steeringCone + lean/wind
 * uncertainty bonus", amount unspecified). NEWLY INTRODUCED for v1 — flagged
 * for DB-1.
 *
 * The corridor is a hazard-checking wedge, so a wider wedge is the safe error
 * (more obstacles caught). We widen the half-angle by a fixed base plus a
 * per-degree-of-residual-lean and per-kph-of-wind term:
 *   bonus = BASE + LEAN_MULT × residualLeanDeg + WIND_MULT × windKph
 * where residualLeanDeg is the lean component not corrected by the hinge.
 * Values are conservative v1 picks pending DB-1.
 */
export const CORRIDOR_UNCERTAINTY_BASE_DEG = 5;
export const CORRIDOR_UNCERTAINTY_LEAN_MULT = 0.5;
export const CORRIDOR_UNCERTAINTY_WIND_MULT = 0.5;

// ── Measurement error model ──────────────────────────────────────────────────
// HANDOFF §2.1. Simulation always uses the WORST case (H + ΔH) for the danger
// radius, so these propagate into a safety margin, not just a display band.

/** Assumed angle measurement error (± degrees). Source: HANDOFF §2.1. */
export const ANGLE_ERROR_DEG = 1;

/** Assumed distance measurement error (± fraction). Source: HANDOFF §2.1. */
export const DISTANCE_ERROR_FRACTION = 0.02;
