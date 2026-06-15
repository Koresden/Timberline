# Phase 1 log — domain engine (engine-dev, TDD)

Implemented the pure domain engine per HANDOFF §2 with mandatory TDD. `measure.ts`
provides the tangent (clinometer) method with worst-case (linear-sum) error
propagation of ±1° angle / ±2% distance — chosen over RSS because the sim consumes
`H+ΔH` as a safety margin, so over-estimating ΔH only enlarges the danger zone; the
stick method ships as a guided checklist (data, no math). `plan.ts` encodes §2.2 as
ordered guard clauses (all six referral gates, notch/hinge/back-cut/feasibility/escape
rules), each pushing a human-readable reason; `geometry.ts` holds shared pure
azimuth/point-to-ray helpers. `sim.ts` builds the fall corridor (wedge =
steeringCone + uncertainty bonus, footprint recovered from the plan's worst-case
danger radius, +20% bounce/roll) and tests rect & circle intersection against a
circumscribed (conservatively over-sized) wedge polygon. Six new constants were added
to `constants.ts` (all cited, all flagged for DB-1): wind cone reduction, severe-
forward-lean referral, negligible-lean threshold, and three corridor-uncertainty
terms. Every §2.2 rule and every referral gate has a named test, and all six §5
fixtures are encoded with hand-computed expected values in comments. `npm run lint`,
`npm run test` (57 passing), and `npm run build` all pass. Several ambiguities and one
structural gap (Humboldt has no corresponding `PlanInput` field → never auto-selected
in v1) are itemized in the report for DB-1; no safety constant was altered.

**Addendum (DB-1 §4 hardening).** Per the approved DB-1 §4, `FellingPlan` is now a
**discriminated union on `verdict`**: a `ReferralPlan` (`verdict: 'refer-professional'`)
carries ONLY `dangerRadiusM` + `reasons`, while an `ActionablePlan` (`ok`/`caution`)
carries the full cut specs. `recommendPlan` evaluates every referral gate as before
(collecting all reasons) and, if any fired, **returns the referral variant early** —
no notch/hinge/back-cut/fall-direction/steering-cone/escape data is computed or
returned, so a referral cannot leak actionable cut specs at the type level
(defense-in-depth, replacing reliance on UI suppression). `ok`/`caution` behavior is
unchanged. `sim.ts`'s `buildCorridor`/`checkCorridor` now take an `ActionablePlan`
(a referral has no fall corridor). **Humboldt remains deferred to v2** (DB-1 §3; no v1
input field), now noted at the notch-selection site. Tests narrow through a typed
`actionable()` helper; a new `plan/DB-1 §4` test asserts the referral variant exposes
none of the cut-spec fields, and the three referral fixtures (2, 5, 6) assert the same.
`npm run lint`, `npm run test` (**58 passing**), and `npm run build` all pass.
