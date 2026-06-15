# DB-4 — Phase 4 Decision Brief (Safety Audit & Ship Gate)

**Phase:** 4 (Safety audit & hardening) · **Author:** orchestrator · **Implementers:** safety-auditor, engine-dev, qa
**For approval by:** Daniel · **Status:** ✅ SHIPPED — v1 approved (2026-06-15). Decisions 1–3 deferred as follow-ups (see below).

The safety-auditor red-teamed the build, engine-dev fixed the findings under TDD, and
qa proved the flow + safety invariants end-to-end. **Recommendation: GO** to ship as a
planning aid, with the two optional additions below left to your call.

---

## Ship verdict: **GO**

The one ship blocker (F1) is fixed and regression-tested. All gates green:
`npm run lint` clean · `npm run test` **120 unit** · `npm run test:e2e` **12 e2e** ·
`npm run build` ✓. Full detail in `docs/decisions/phase-4-audit.md` (findings) and
`phase-4-log.md` (resolutions + fixture cross-check).

---

## Audit findings & resolutions

| # | Sev | Finding | Resolution |
|---|-----|---------|-----------|
| **F1** | **blocker** | Hazard referral gate swept the **wind-reduced** cone → a structure/powerline/road that refers on a calm day could **silently not refer in wind**, showing cut specs. | **Fixed.** Hazard sweep now uses the **calm base cone** (never wind-narrowed). Regression test: a side hazard that refers calm **still refers at 14 kph**. (engine-dev found the auditor's exact numbers didn't reproduce and brute-forced a genuine failing case to guard the real geometry.) |
| **F2** | med | `palm-like` passed every gate and got a timber notch/hinge — palms have no hinge wood (false authority). | **Fixed.** `palm-like` now refers (info-only, like dead/compromised). e2e-confirmed: no specs. |
| **F3** | med | Sim corridor fed raw lean via a param named "residual" — safe today (wider) but mislabeled. | **Fixed** (doc): param documented as an accepted conservative over-estimate; corridor must never narrow below it. No behavior change. |
| **F4** | low | Severe-forward-lean boundary lightly tested. | **Fixed.** Boundary tests at exactly 10° (caution) and just above (refer), plus DBH/wind/away-lean boundaries. |
| **F5** | low | `SEVERE_FORWARD_LEAN_DEG` aliased to a notch-window constant (coupled a referral gate to a comfort knob). | **Fixed.** Now an independent literal (still 10°) with its own citation. No locked value changed. |
| **F6/F7** | nit | Absurd leans accepted (refer anyway); dead Humboldt branch in `CutCard`. | Deferred — cosmetic, no safety impact. |
| **D** | low | **Hinge 3.5 cm renders "4 cm"** — diameter formatter rounds to 0 decimals, overstating small cut dimensions. | **Open** — recommend a quick fix (1-decimal for small cut specs). See decisions. |

## qa — end-to-end (12 specs, mobile-chrome)

All six §5 fixtures + palm-like (F2) + the F1 wind regression cross-check against the
DB-1 hand-calcs with **no discrepancy**. Confirmed end-to-end:
- **Every** `refer-professional` fixture renders **zero** cut specs (no CutCard, no
  notch/hinge/back-cut text) and shows the takeover.
- **Simulate shows no corridor** for any referral (info-only state).
- Persistent **SafetyBanner** on Measure, Plan, AND Simulate; no dismiss/override control.
- Danger radius = **2 × worst-case (H+ΔH)**, identical on cut card, compass, and sim ring.
- Obstacle drag → collision → blocked verdict → breached ring: automated & green (S1).

## Residual-risk statement (for ship)
- The six v1-assumption constants (DB-1) are **conservative engineering choices**, not
  sourced verbatim from OSHA/USFS — they err toward referral, and the auditor found no
  unsafe value. A domain expert should still review them before any real-world reliance.
- The simulation is a **kinematic visualization, not a physics model** (stated in-app).
- One physical-device touch spot-check of the drag is still a nice-to-have (S1).
- The "4 cm" hinge display rounding (finding D) overstates small dimensions by ≤0.5 cm.

## v2 backlog
AR/photo measurement · species database beyond 4 classes · saved jobs/tree IDs · Korean
localization · weight estimate · Kickback/Barber-chair/Hang-up risk scoring · cut-sequence
checklist · (any move toward a "begin cut" action needs a fresh safety review — it drifts
toward authorization, which the posture forbids).

---

## Decisions for you (optional v1 additions; neither blocks ship)

**1 — PWA service worker (offline).** Offline is a stated v1 requirement (HANDOFF §1);
DB-0 deferred the service worker to here. It needs **one new dependency** (`vite-plugin-pwa`)
— the "one-line brief" DB-0 promised. Ship offline now, or as a fast follow-up?
> ⬜ Add it now (offline in v1) &nbsp;|&nbsp; ⬜ Follow-up PR &nbsp;|&nbsp; ⬜ Discuss

**2 — Manual "area-clear" gate (auditor-endorsed, with guardrails).** A *human attestation*
"I've walked and cleared the 2× danger radius" reminder surfacing the danger radius + two
escape routes. **Hard guardrails (auditor):** never implies detection; never gates/"unlocks"
anything; additive friction only; not persisted/dismissable; re-affirms the worst-case
radius. The auditor vets the final copy before it ships.
> ⬜ Build it now (per guardrails) &nbsp;|&nbsp; ⬜ Defer to v2 &nbsp;|&nbsp; ⬜ Discuss

**3 — Hinge display rounding (finding D).** Quick fix to show small cut dimensions to 1
decimal.
> ⬜ Fix now &nbsp;|&nbsp; ⬜ Defer &nbsp;|&nbsp; ⬜ Discuss

---

### Sign-off (ship gate) — APPROVED 2026-06-15
- [x] Audit findings + resolutions reviewed (F1 blocker fixed)
- [x] qa e2e + residual-risk statement accepted
- [x] **Decisions 1–3: ship now; all three deferred as post-v1 follow-ups** —
  (1) PWA service worker / offline, (2) manual area-clear gate, (3) hinge display
  rounding. None blocks v1; each is a tracked follow-up.
- [x] **v1 cleared to ship** — merged to `main`, tagged `v1.0.0`.

> Immediate follow-up order: **(1) PWA service worker** (closes the offline-PWA v1
> requirement), then (3) hinge rounding, then (2) area-clear gate (auditor-vetted copy).
