# Phase 4 — engine fix log (safety-audit remediation)

Landing the safety-auditor's Phase 4 findings (see `phase-4-audit.md`). All changes
are in the SAFE direction (refer more / clarify); no fix makes the app less likely to
refer. Engine code + tests landed together under TDD (failing test first). No locked
constant VALUE changed. `npm run lint`, `npm run test` (120 passed), and `npm run build`
all green.

- **F1 (BLOCKER) — hazard sweep no longer shrinks with wind.** `recommendPlan` passed
  the WIND-REDUCED `steeringConeDeg` into `hazardNearFeasibleFallLine`, so under wind the
  swept set of candidate fall lines narrowed (×0.5 at the limit) and a hazard the calm-day
  check would catch could be missed → cut specs shown for a tree near a structure/power
  line/road. Fixed by sweeping the un-reduced **calm `baseCone`** (15° open-face / 10°
  conventional) for hazard detection, regardless of wind. Wind still reduces *target
  feasibility* (Rule 5) as before — only hazard detection is decoupled. Regression tests
  (`plan/F1 …`): a real exploit case (height 14 m, hazard at azimuth 250°, 24 m out)
  refers on a calm day and now STILL refers at 14 kph wind; both confirmed failing before
  the fix, passing after.

- **F2 — `palm-like` now refers.** Palms have no hinge wood, so the notch/hinge model
  cannot honestly plan them; previously they received a full timber cut card (false
  authority). Added a Rule-1 referral gate treating `palm-like` exactly like
  `dead-compromised` (information-only `ReferralPlan`, no cut specs). Test: `GATE:
  palm-like species refers`.

- **F5 — `SEVERE_FORWARD_LEAN_DEG` decoupled.** Was aliased to
  `FORWARD_LEAN_CONVENTIONAL_MAX_DEG`, coupling a referral gate to a notch-window comfort
  knob. Made it an independent literal (still **10°**, value unchanged) with its own
  citation, so editing the notch window can never silently move the referral threshold.

- **F4 — boundary tests.** Added named tests pinning `>` vs `>=` intent: forward lean at
  EXACTLY `SEVERE_FORWARD_LEAN_DEG` (10°) does NOT refer (conventional+bore caution), just
  above (10.01°) refers. Also added exact-boundary pairs for `MAX_LEAN_AWAY_DEG`,
  `MAX_DBH_CM`, and `MAX_WIND_KPH` (at threshold = no refer, just above = refer).

- **F3 — sim `residualLeanDeg` doc clarified (no behavior change).** Documented in
  `buildCorridor` that the UI deliberately feeds the RAW total lean magnitude as an
  accepted conservative over-estimate (wider corridor = safe) and that this parameter must
  never be used to narrow the corridor below the value passed.

Test count rose from 114 to 120 (+6: 1 palm gate, 2 F1 wind regression, 5 F4 boundary —
net of the existing severe-lean gate test already present).

---

## QA — Phase 4 e2e verification (Playwright)

`npm run test:e2e` → **12 passed** (mobile-chrome / Pixel 7, port 5180). `npm run
test` → **120 passed**; `npm run build` → clean (`tsc -b && vite build`). The suite
drives the real measure → plan → simulate flow and cross-checks every fixture's UI
output against the DB-1 / engine hand-calcs. The load-bearing safety invariant holds
end to end: **every refer-professional fixture (2, 5, 6, 7-palm, 8-F1 calm & windy)
renders the full-screen takeover and ZERO cut specs** — no CutCard, no notch/hinge/
back-cut headings or text in the DOM, and "Cut instructions are withheld" is shown.
Navigating to Simulate for each referral shows the information-only empty state with
**no fall corridor** (`.sim-topview-svg` absent, neither clear nor blocked verdict).
The persistent SafetyBanner is asserted present on Measure, Plan, AND Simulate, with
no dismiss/override affordance. Contract #1 verified live: the Plan height is
prefilled as the worst-case H+ΔH (≈14.9 m from a 13.9 m best estimate), and the
danger radius shown (29.8 m) = 2×(H+ΔH), echoed identically on the cut card, escape
compass, and sim danger ring. The F1 regression is covered in the UI: the side hazard
at 250°/24 m refers on a calm day AND still refers at 14 kph wind (wind must not
narrow the hazard sweep). The S1 obstacle interaction is verifiable with Playwright's
trusted pointer — dragging a House preset from its north drop-point south into the
south-pointing corridor flips the verdict to "blocked" and breaches the danger ring.
The stale Phase-0 smoke test (which expected a removed "Timberline" h1) was rewritten
to the real app shell; new files: `e2e/{helpers,fixtures}.ts`, `e2e/flow.spec.ts`,
updated `e2e/smoke.spec.ts`. No source was touched; no UI/hand-calc discrepancies found.

### Fixture cross-check (expected vs observed in the UI)

| # | Fixture | Expected (DB-1 hand-calc) | Observed in UI | ✓ |
|---|---------|---------------------------|----------------|---|
| 1 | small straight pine | ok · open-face 70° · depth 10 cm · hinge 3×24 cm · fall 180° · danger 29.8 m | ok cut card; 70°, 10 cm, 3 cm, 24 cm; compass "Fall direction 180°, escape 315°/45°, danger 29.8 m" | ✓ |
| 2 | big oak near house | refer (DBH 70>50 + structure on line); danger 36.0 m; no specs | takeover; reasons cite diameter + structure; danger 36.0 m; no CutCard | ✓ |
| 3 | back-leaner | caution · hinge 3.5→"4 cm"×28 cm · wedge ≥1 · nearest-feasible fall 295° · danger 24.0 m | caution cut card; 4 cm/28 cm; back-cut "1" wedge; compass "Fall direction 295°"; "nearest" reason; 24.0 m | ✓ |
| 4 | slope measurement | H = 20(tan35 − tan8) = 11.193, ΔH ≈ 1.100 → "11.2 ± 1.1 m" (the "−" branch via negative base) | readout "11.2 ± 1.1 m" with base angle entered as −8 | ✓ |
| 5 | windy day | refer (wind 25 > 15); danger 26.0 m; no specs | takeover; wind reason; 26.0 m; no CutCard | ✓ |
| 6 | dead tree | refer (species gate); danger 30.0 m; no specs | takeover; dead/compromised reason; 30.0 m; no CutCard | ✓ |
| 7 | palm-like (F2) | refer (palm gate); danger 24.0 m; no specs | takeover; palm reason; 24.0 m; no CutCard | ✓ |
| 8 | side hazard, calm (F1 baseline) | refer (structure 24 m @250° within calm cone sweep); danger 28.0 m | takeover; hazard reason; 28.0 m; no CutCard | ✓ |
| 8 | side hazard, 14 kph wind (F1 regression) | STILL refer — wind must not narrow the hazard sweep; danger 28.0 m | takeover; hazard reason; 28.0 m; no CutCard | ✓ |

(— rows for referral fixtures: notch/hinge/fall azimuth are intentionally absent —
a referral carries no cut specs by type and by UI.)
