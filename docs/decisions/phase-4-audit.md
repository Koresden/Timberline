# Phase 4 — Safety Audit (red-team) findings

**Auditor:** safety-auditor · **Date:** 2026-06-15 · **Status:** findings filed as
patch proposals (auditor does not edit source; orchestrator routes fixes).
**Scope:** `src/engine/{plan,measure,sim,geometry,constants,types}.ts`,
`src/features/{plan,measure,simulate}/*`, `src/components/{ReferralTakeover,CutCard,
SafetyBanner,EscapeCompass}.tsx`, `src/store/*`, `tests/engine/*`.

The auditor's position ships on any safety disagreement (HANDOFF §6 rule 4). Where a
finding touches a locked safety constant or gate behaviour, it is raised as a Decision
Brief request, not quietly accepted.

---

## Verdict summary

The architecture is genuinely strong: the discriminated-union `FellingPlan` makes a
referral *structurally* incapable of carrying cut specs (verified end to end), the
worst-case `H + ΔH` flows through plan → danger radius → sim without ever re-deriving
the bare height, the banner is persistent and non-dismissable, and there is no
override-safety path anywhere. Most gates fire correctly at and across their
boundaries.

**One HIGH finding (F1) is a ship blocker:** wind *shrinks* the cone that the hazard
referral gate sweeps, so a structure/powerline/road that a calm-day check would catch
can be missed in wind — producing actionable cut specs for a tree near a hazard. This
is the exact failure mode the safety posture exists to prevent and must be fixed before
ship. The remaining items are lower severity.

---

## Findings (prioritized)

| # | Sev | Location | Problem | Why it's a safety risk | Proposed fix |
|---|-----|----------|---------|------------------------|--------------|
| **F1** | **blocker / high** | `plan.ts:219–226` (gate uses `steeringConeDeg = windReducedCone(...)`); enabled by `windReducedCone` `plan.ts:72–77` + `WIND_STEERING_CONE_REDUCTION_FRACTION` `constants.ts:114` | The hazard referral gate `hazardNearFeasibleFallLine` is called with the **wind-reduced** cone. Wind shrinks the cone up to ×0.5 (at 15 kph), so the swept set of candidate fall lines is *narrower* in wind → the gate samples fewer azimuths → a hazard reachable by a fall line just outside the reduced cone is no longer checked. | A hazard that **would refer on a calm day is silently NOT referred in wind**, and the tree returns an `ActionablePlan` with full cut specs. Worked example: negligible lean (center = target), open-face. Calm cone = 15°; a structure within 1.5×H along a fall line at +14° off-center → gate fires. Wind 14 kph → cone = 15·(1−0.5·14/15) ≈ 8°; +14° is now outside the swept ±8° → **no referral, cut specs shown**. Wind narrowing is the *unsafe* direction for hazard detection (the opposite of its effect on target feasibility). | Decouple the hazard sweep from the wind-reduced steering cone. The hazard gate must sweep a cone **no narrower than the unreduced (calm) steering authority** — ideally `baseCone` (15°/10°) regardless of wind, and arguably wider still (wind can *push* a tree off the intended line, so if anything the hazard sweep should *widen* with wind, mirroring `CORRIDOR_UNCERTAINTY_*`). Concretely: pass `baseCone` (not `steeringConeDeg`) into `hazardNearFeasibleFallLine`, or add a wind-widened term. Lands with a named regression test: "hazard at calm-cone edge still refers under wind." This changes gate behaviour → **raise as a Decision Brief** (engine-dev implements with test in same commit). |
| **F2** | medium | `plan.ts:202` / `types.ts:14` / engine has no `palm-like` handling | `speciesClass: 'palm-like'` passes every referral gate and receives a normal open-face notch + 10%/80% hinge, exactly like dimensional timber. Palms have no real hinge wood; the notch/hinge model does not physically apply. | A user felling a palm gets confident, specific cut specs the technique cannot deliver — false authority for a tree type the engine cannot actually plan. | HANDOFF §1 lists `palm-like` as a v1 class with no spec for it, so the *safe* default is to **refer** `palm-like` (treat like `dead-compromised`: information-only, no cut specs) rather than emit timber specs. Raise as a Decision Brief (it's a gate/behaviour change); minimum bar before ship is that palm does not emit a confident timber cut card. |
| **F3** | medium | `TopView.tsx:58` + `sim.ts:80` vs `plan.ts:179` | The sim corridor's lean-uncertainty bonus is fed `residualLeanDeg = input.leanDeg` (the **raw total lean magnitude**), but `buildCorridor`'s parameter is documented as the *residual* lean (component the hinge did **not** correct). Using the full magnitude here happens to be *wider* (safe), but it is not the documented quantity and is inconsistent with how `plan.ts` decomposes lean into forward/away components. | Not unsafe today (wider = conservative), but the mislabeled input is a latent trap: a future "optimization" that switches to the true residual could silently *narrow* the corridor. Naming honestly here protects the margin. | Either (a) pass the true residual lean component the hinge can't steer, or (b) rename the param to `leanMagnitudeDeg` and document that the sim deliberately uses the full magnitude as a conservative over-estimate. Low effort; sim-dev/engine-dev. No constant change. |
| **F4** | low | `plan.ts:196` (`forwardLean > C.SEVERE_FORWARD_LEAN_DEG`) and `plan.ts:154–155` | The conventional-notch window is `forwardLean ∈ [5,10]` (inclusive of 10), and severe-lean referral is `forwardLean > 10`. So **exactly 10°** forward lean is a conventional+bore caution, not a referral — consistent with DB-1 §2b ("strictly greater than refers"). Verified correct, but the boundary is subtle and only lightly tested (tests use 7° and 14°, not 10.0 / 10.01). | A future edit could flip `>` to `>=` (or vice-versa) and silently move the 10° boundary, changing whether a heavy forward-leaner refers. | Add named boundary tests at exactly `SEVERE_FORWARD_LEAN_DEG` (caution, conventional+bore) and just above (refer). qa/engine-dev. No behaviour change. |
| **F5** | low | `constants.ts:128` `SEVERE_FORWARD_LEAN_DEG = FORWARD_LEAN_CONVENTIONAL_MAX_DEG` | The severe-lean threshold is *aliased* to the conventional window max. Both are "10°" today, so any future change to the conventional window max silently drags the referral threshold with it. | A change intended only to widen the conventional technique window would unintentionally move a **referral** gate — coupling a comfort knob to a safety knob. | Make `SEVERE_FORWARD_LEAN_DEG` an independent literal (`= 10`) with its own citation, decoupled from the notch-window constant, so the referral threshold can never be moved as a side effect. Constant-structure change → Decision Brief note (value unchanged, so low risk). |
| **F6** | low / nit | `plan.ts:43` (`leanDeg < 0` throws, but `leanDeg` huge is accepted) | `leanDeg` is validated finite and ≥ 0, but an absurd magnitude (e.g. 80°) is accepted and decomposed by `cos`. A near-horizontal "tree" is nonsense input; the away/forward components still compute but the scenario is unphysical. | Low: an 80° lean away → away-component > 10 → refers anyway, and 80° forward → refers via severe-lean. So extreme leans *do* refer. The risk is only a confusingly-worded plan for mid-range absurd leans, not unsafe advice. | Optionally clamp/refer on `leanDeg` beyond a sane cap (e.g. > 45° always refers as "leaning heavily", HANDOFF §1). Nice-to-have; not a blocker. |
| **F7** | nit | `CutCard.tsx:29–33` / `NOTCH_LABEL` includes `humboldt` | Humboldt is dead/unreachable in v1 (DB-1 §3) yet the label map and `NotchDiagram` still carry a humboldt branch. | None today (unreachable). Pure dead-code hygiene; a stray future code path could render it without review. | Leave a `// unreachable in v1 (DB-1 §3)` comment or drop the branch. Cosmetic. |

---

## Invariants verified (pass)

- **Discriminated union / no cut-spec leak.** `recommendPlan` returns `ReferralPlan`
  (verdict + `dangerRadiusM` + `reasons` only) the moment any gate fires (`plan.ts:234`);
  `ReferralPlan` has no notch/hinge/backCut/fallAzimuth fields *at the type level*
  (`types.ts:59`). `PlanScreen` narrows on `verdict` and renders ONLY `ReferralTakeover`
  in that branch (`PlanScreen.tsx:77`); `CutCard` accepts only `ActionablePlan`
  (`CutCard.tsx:14`). `ReferralTakeover` takes `ReferralPlan` and renders no specs.
  Verified by `plan.test.ts` (`'notch' in p` false on every referral fixture).
  **No path found that surfaces cut specs for a referral.**
- **Worst-case height everywhere.** `recommendPlan` treats `heightM` as `H + ΔH`
  (`plan.ts` header); `dangerRadiusM = 2 × heightM` (`plan.ts:229`); hazard trigger =
  `1.5 × heightM` (same worst-case reach); the Measure→Plan seed is
  `worstCaseHeightM(estimate) = heightM + errorM` (`worstCaseHeight.ts`,
  `PlanScreen.tsx:38`); the sim recovers footprint as `dangerRadiusM / 2`
  (`sim.ts:77`, `SimulateScreen.tsx:46`) — the bare estimate never re-enters. The
  measure error model is deliberately worst-case (linear sum, not RSS) and over-sizing
  the band only enlarges the margin.
- **2× danger zone + two escape routes always present** on every actionable plan
  (`plan.ts:280–283`, offsets `[135,225]`), and the danger radius is also shown in the
  referral takeover so the information-only mode keeps the clear-zone.
- **Persistent banner, no override.** `SafetyBanner` renders above the router in
  `App.tsx:62` on every tab, has no dismiss control, and a repo-wide read found no
  "override"/"ignore-safety"/"force" affordance anywhere.
- **Sim shows no corridor for a referral.** Plan clears the simulation source on
  referral (`PlanScreen.tsx:48` → `clearSimulation`); `SimulateScreen` shows the
  information-only empty state when `currentPlan` is null and never fabricates a
  corridor.
- **Red reserved for danger.** Danger ring is neutral dashed when clear and only goes
  red on a real obstacle breach (`TopView.tsx:186`, `EscapeCompass.tsx:75`).
- **Garbage inputs handled.** Engine throws on NaN/Infinity/≤0 height·DBH/negative
  lean·wind (`plan.ts:28–45`); UI parses at the edge and shows friendly errors
  (`PlanForm`, `TangentForm`); measure rejects |angle| ≥ 89° and non-positive height.

---

## Safety-constant review (the 6 DB-1 v1 assumptions)

- `NEGLIGIBLE_LEAN_DEG = 1` — sound (below ±1° measurement resolution; centers the cone
  on target only for a truly vertical trunk).
- `WIND_STEERING_CONE_REDUCTION_FRACTION = 0.5` — the *value* is fine and is safe for
  **feasibility** (shrinking the cone makes a target more likely infeasible). But its
  application to the **hazard gate** is the F1 bug: there, a smaller cone is the *unsafe*
  direction. The constant isn't wrong; its reuse in the hazard sweep is.
- `SEVERE_FORWARD_LEAN_DEG` — value (10°) defensible; **aliasing** to the conventional
  window max is a structural smell (F5).
- `CORRIDOR_UNCERTAINTY_BASE_DEG = 5`, `*_LEAN_MULT = 0.5`, `*_WIND_MULT = 0.5` — all
  widen the hazard-checking corridor (safe direction). Note the asymmetry the audit
  surfaced: the **sim corridor widens** with wind while the **referral gate cone
  shrinks** with wind. The corridor side is correct; F1 fixes the gate side to match.

No locked constant is set in an unsafe direction. The one safety hole is a *wiring*
choice (which cone the hazard gate sweeps), not a constant value.

---

## Copy review

- Banner, referral takeover, and cut-card warnings are clear, specific, imperative, and
  non-dismissable. The takeover says plainly "Cut instructions are withheld" / "Do not
  attempt this fell — hire a certified arborist." No wording reads as authorization.
- Cut card retains "never cut through the hinge", "never stand directly behind the
  tree", and the danger-zone clear instruction on every actionable plan.
- One nit: the app-bar subtitle "Tree-felling planning aid" plus the persistent banner
  adequately frame the tool as non-authoritative; no change required.

---

## Opinion: the proposed manual "area-clear" danger gate (DB-3.5)

**Endorsed in principle, with hard guardrails.** A *manual* "confirm the 2× danger
radius is clear" affordance is a sound safety addition **provided it never implies real
detection and never becomes a dismissable rubber-stamp.** Requirements:

1. **No fake detection.** Copy must be a human attestation ("I have personally walked
   and cleared the 2× danger zone — no people, pets, or traffic"), never "no person
   detected." The mockup's person-in-zone breach screen must NOT be presented as sensor
   output.
2. **It must not gate a "begin cut" action that doesn't exist.** Timberline has no
   "start cutting" step today and shouldn't grow one — that would edge the tool from
   *planning aid* toward *authorization*, which the safety posture forbids. So the
   area-clear gate should be a **terminal pre-fell checklist / reminder on the Simulate
   (or plan-complete) screen**, surfacing the danger radius and the two escape routes —
   not a switch that "unlocks" instructions.
3. **It must not weaken anything.** It is *additional* friction only. It must never
   suppress the referral takeover, never re-enable cut specs for a referred tree, and
   never be remembered/auto-checked across sessions (no "don't show again").
4. **Re-affirm, don't dismiss.** If used, it should re-state the danger radius (worst-
   case `H + ΔH` based) and require an explicit, non-persisted confirmation each time.

If built that way it is a net safety win (reinforces the clear-zone discipline OSHA
requires). If it cannot be built without implying detection or becoming a one-time
dismiss, **do not ship it** — defer to v2 with a proper spec. This is a *new* safety
flow; per the charter the auditor must vet the final copy and interaction before it
ships.

---

## Ship verdict

**Conditional GO.** The build is safe to ship as a planning aid **once F1 is fixed**
(blocker: the wind-shrunken hazard sweep). F1 changes gate behaviour and so must land
via a Decision Brief with a named regression test in the same commit (engine-dev).
F2 (palm-like) should be resolved before ship or explicitly accepted as a documented
residual risk by Daniel. F3–F7 are non-blocking and can ship with tracking. The
area-clear gate is endorsed only under the four guardrails above and is not required
for ship.
