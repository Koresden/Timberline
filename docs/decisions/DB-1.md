# DB-1 — Phase 1 Decision Brief (Engine)

**Phase:** 1 (Domain engine, TDD) · **Author:** orchestrator · **Implementer:** engine-dev
**For approval by:** Daniel · **Status:** ⏳ awaiting sign-off — **Phase 2 (UI) does not start until this is approved.**

The pure engine (`measure` · `plan` · `sim`) is implemented and independently
verified. This brief asks you to (1) **sanity-check the fixture math**, (2) confirm
the **interpretations** chosen for genuinely ambiguous rules, (3) decide the
**Humboldt spec gap**, and (4) rule on **one safety-design question** my review
raised. Each needs a checkbox.

---

## Verification (re-run by the orchestrator, not just self-reported)

| Gate | Result |
|---|---|
| `npm run lint` | clean (engine purity holds — no React/DOM in `src/engine/`) |
| `npm run test` | **57 passed** (measure 9 · plan 28 · sim 11 · geometry 5 · constants 4) |
| `npm run build` | ✓ `tsc -b && vite build`, no type errors |

Every §2.2 rule and every referral gate has a named test that proves it fires;
negative ("must NOT refer") tests guard the boundaries. TDD followed throughout.

---

## 1 — Fixture table — **please sanity-check the math** (HANDOFF §5)

All six are encoded as tests with the arithmetic in comments. Key values:

| # | Fixture | Inputs (SI) | Verdict | Notch | Hinge t×l (cm) | fallAz | Danger (m) | Hand-calc |
|---|---|---|---|---|---|---|---|---|
| 1 | small straight pine | H+ΔH 14.8867, DBH 30, lean 2°→180, tgt 180, wind 5, softwood | **ok** | open-face 70°, depth 10 | 3.0 × 24 | 180° | 29.773 | cone 15·(1−0.5·5/15)=12.5; 2·14.8867 |
| 2 | big oak near house | DBH 70, H 18, structure 10 m @90° on line, tgt 90 | **refer** | — | — | — | — | 70>50 **and** 10 < 1.5·18=27 |
| 3 | back-leaner | lean 8°→280, tgt 90, DBH 35, H 12, calm | **caution** | open-face | 3.5 × 28 | 295° | 24 | away=8·cos10°=7.88 ≤10 (no refer); nat 280, tgt opposite → 280+15=295; back-lean → wedge |
| 4 | slope (measure) | dist 20, top 35°, base **−8°** | n/a | — | — | — | — | H=20(tan35−tan8)=**11.193**; ΔH≈1.100 (the "−" branch) |
| 5 | windy day | wind 25 | **refer** | — | — | — | — | 25 > 15 |
| 6 | dead tree | species dead-compromised | **refer** | — | — | — | — | species gate |

Measure fixture 1 (the "+" branch): `H = 15(tan40° + tan5°) = 13.899`, `ΔH ≈ 0.988`,
worst-case `H+ΔH = 14.887` — this is what feeds plan fixture 1.

> ⬜ **The fixture math looks right — approve** &nbsp;|&nbsp; ⬜ I want to correct one or more values (note below)

---

## 2 — Ambiguities: chosen interpretation → your call

Each was implemented with the **safest defensible** reading and is flagged here.
None weakens a referral gate.

**2a. "lean > 10° away from target" decomposition.** `leanDeg` is magnitude;
`leanAzimuth` is direction. Implemented as `away = leanDeg × cos(∠ between leanAzimuth
and target+180)`; refer when `away > 10°`. (A 12° lean straight back refers; a 12°
lean mostly sideways may not.)
> ⬜ Approve projection-onto-away-axis &nbsp;|&nbsp; ⬜ Use raw `leanDeg` whenever it leans off-target (stricter) &nbsp;|&nbsp; ⬜ Discuss

**2b. Heavy FORWARD lean beyond the 5–10° window → REFER** (`SEVERE_FORWARD_LEAN_DEG
= 10°`). §2.2(2) only specs 5–10° forward (conventional + bore); §1 says "leaning
heavily → arborist." Forward lean > 10° is treated as barber-chair risk and referred.
> ⬜ Approve: severe forward lean refers &nbsp;|&nbsp; ⬜ Prefer caution + bore instead of refer &nbsp;|&nbsp; ⬜ Discuss

**2c. Wind reduction of steering cone** (§2.2(5) says "less in wind", unquantified).
Implemented `cone × (1 − 0.5 × wind/15)` — halves the cone at the 15 kph limit (less
steering authority → target more likely judged infeasible → safe direction).
> ⬜ Approve 50%-at-limit linear reduction &nbsp;|&nbsp; ⬜ Specify a different curve/table &nbsp;|&nbsp; ⬜ Discuss

**2d. Corridor uncertainty bonus** (§2.3 "steeringCone + lean/wind uncertainty
bonus", unquantified). Sim wedge half-angle = `steeringCone + 5° + 0.5·residualLean +
0.5·wind`. A wider wedge catches more obstacles (safe error). Plan-only checks apply
just the 5° base (a `FellingPlan` carries no lean/wind).
> ⬜ Approve the bonus formula &nbsp;|&nbsp; ⬜ Adjust coefficients &nbsp;|&nbsp; ⬜ Discuss

**2e. Hazard-to-fall-line distance** (§2.2(1) "within 1.5× height of a feasible fall
line"). Point-to-ray distance from each hazard to candidate fall lines, swept over the
**whole feasible cone** (1° steps + edges), ray length = tree height. Hazards behind
the base clamp to the origin distance (still flagged if close → safe).
> ⬜ Approve sweeping the full feasible cone &nbsp;|&nbsp; ⬜ Only check the chosen `fallAzimuth` (looser) &nbsp;|&nbsp; ⬜ Discuss

**New constants added** (all cited in `constants.ts`, all v1 assumptions pending this
brief; no existing locked value was touched): `SEVERE_FORWARD_LEAN_DEG`,
`WIND_STEERING_CONE_REDUCTION_FRACTION` (0.5), `NEGLIGIBLE_LEAN_DEG` (1°),
`CORRIDOR_UNCERTAINTY_BASE_DEG` (5°), `CORRIDOR_UNCERTAINTY_LEAN_MULT` (0.5),
`CORRIDOR_UNCERTAINTY_WIND_MULT` (0.5). Approving 2a–2e approves these.

---

## 3 — Structural gap: Humboldt notch has no input (decide)

HANDOFF §2.2(2) lists **Humboldt** for "steep ground / want low stump", but
**`PlanInput` has no ground-slope or stump-height field** — nothing can ever select
it. Per the engine-dev charter, no input was invented. **Result: Humboldt is
unreachable in v1** (a test asserts it's never auto-selected). Pick one:

> ⬜ **Defer Humboldt to v2** (leave it unreachable; simplest) &nbsp;|&nbsp; ⬜ **Add `groundSlopeDeg` + low-stump inputs now** (a §2.2 `PlanInput` change → small follow-up task before Phase 2) &nbsp;|&nbsp; ⬜ Discuss

---

## 4 — Safety-design question my review raised (recommend a change)

The engine currently **computes and returns** `notch`/`hinge`/`backCut` specs **even
when `verdict === 'refer-professional'`**, relying on the Phase-2 UI to hide them (and
the Phase-4 auditor to verify that). `FellingPlan`'s spec fields are non-optional, so
something is always returned. **Risk:** any consumer that forgets to check `verdict`
could surface actionable cut specs for a tree that should go to a pro — exactly the
failure the safety posture exists to prevent. Defense-in-depth says the *engine*, not
just the UI, should make that impossible.

**Recommendation:** change the contract so a referral cannot carry cut specs — make
`FellingPlan` a discriminated union (`{ verdict: 'refer-professional', reasons,
dangerRadiusM }` vs. the full plan for `ok`/`caution`), **or** null/omit the spec
fields on referral. This is a `types.ts` (§2.2) interface change, so it's your call.

> ⬜ **Approve: harden the engine so referrals carry no cut specs** (recommended — small refactor, lands before Phase 2 wiring) &nbsp;|&nbsp; ⬜ Keep specs + rely on UI suppression only &nbsp;|&nbsp; ⬜ Discuss

---

## 5 — Carry-forward note for Phase 2 (ui-dev) — not a decision

`recommendPlan`'s `heightM` input is the **worst-case `H + ΔH`**, and
`dangerRadiusM = 2 × heightM`. The Measure→Plan wiring **must** pass `heightM +
errorM` from `measureByTangent`, **not** the bare best estimate, or the danger zone
will be undersized. This contract is documented in `plan.ts` and will be enforced in
the Phase-2 store + an e2e assertion (qa, Phase 4).

---

## Residual risks (for the eventual DB-4 ship gate)
- Interpretations in §2 are conservative *assumptions*, not sourced from OSHA/USFS
  verbatim — the safety-auditor red-teams them in Phase 4.
- `plan.ts` is at the 300-line soft cap (mostly reason strings); flagged for a
  possible reason-string extraction if it grows.
- Humboldt path is dead code until §3 is decided.

---

### Sign-off
- [ ] 1 — Fixture math sane
- [ ] 2 — Ambiguity interpretations (2a–2e) + new constants approved
- [ ] 3 — Humboldt decision made
- [ ] 4 — Referral-suppression hardening decision made
- [ ] **Phase 2 (ui-dev) cleared to start**
