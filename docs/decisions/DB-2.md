# DB-2 — Phase 2 Decision Brief (Measure & Plan UI)

**Phase:** 2 (Measure & Plan UI) · **Author:** orchestrator · **Implementer:** ui-dev
**For approval by:** Daniel · **Status:** ✅ APPROVED (2026-06-14) — D2 fixed; D1/D3/D4/D5 approved as scoped; Phase 3 cleared.

The Measure and Plan screens are built on the approved DB-0/DB-1 decisions and
verified by me in a real browser. This brief asks you to (1) eyeball the screens
and (2) rule on a short list of **UX deviations** — one of which I think is a real
(small) bug worth fixing before ship.

---

## Verification (re-run + live-driven by the orchestrator)

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm run test` | **83 passed** (29 engine + 54 ui/units/store/handoff; node env, no new deps) |
| `npm run build` | ✓ `tsc -b && vite build`, no type errors |
| Live (port 5180, mobile 375px) | drove Measure → readout → Plan → referral **and** actionable cut card |

**Engine purity still holds** — `src/engine/**` unchanged by this phase; no React/DOM
leaked in. The UI only ever consumes the engine.

### What I saw on screen (captured live this session)
1. **Measure** — persistent safety banner, unit toggle, tab bar, method picker
   (Tangent / Stick), device-tilt panel with "Start tilt sensor", manual fields
   with plain-language hints.
2. **Live readout** — distance 15 m, top 40°, base 5° → **"13.9 ± 1.0 m"** (matches
   the engine hand-calc H=13.899, ΔH=0.988) + "Use this height for planning".
3. **Referral takeover** (DBH 70) — full-screen red card "Consult a professional
   arborist", explicit "Timberline will **not** show cut instructions", the reason
   ("70 cm exceeds the 50 cm limit"), danger zone **29.8 m**, and **no cut specs**.
   The form is replaced entirely.
4. **Actionable cut card** (DBH 30, ok) — stepped card: ① Open-face notch 70° /
   depth 10 cm with an **SVG notch diagram**; ② Hinge 3 cm × 24 cm ("never cut
   through the hinge"); ③ Back cut 3 cm, bore No, 1 wedge; ④ **SVG escape compass**
   (fall line + two escape routes + 29.8 m danger ring); "Why these recommendations?"
   expandable. Every value matches the engine.

### Safety contracts — verified at runtime, not just in code
- **`H + ΔH` worst-case height:** the danger radius read **29.8 m = 2 × 14.887**
  (the worst-case height), not 2 × the bare 13.9. Enforced via `worstCaseHeightM()`
  at the Measure→Plan handoff; pinned by a test.
- **Referral takeover is total:** `refer-professional` renders only the takeover —
  the discriminated union means the object has no cut-spec fields to leak, and the
  `PlanScreen` narrowing renders no form and no cut card.

---

## What was built (files)
- **Shared:** `src/units.ts` (pure SI⇄imperial, display-only — outside `engine/`),
  `src/store/appStore.ts` (Zustand: unit preference + measured-height handoff),
  `src/store/unitStorage.ts` (localStorage I/O, metric default),
  `src/store/worstCaseHeight.ts` (the `H+ΔH` helper).
- **Hooks:** `useUnits` (format/parse at the display boundary), `useDeviceOrientation`
  (sensor + iOS 13+ permission flow with manual fallback).
- **Components:** `UnitToggle`, `NumericField`, `NotchDiagram` (SVG), `EscapeCompass`
  (SVG), `WhyList`, `CutCard`, `ReferralTakeover`.
- **Features:** `measure/{MeasureScreen,TangentForm,StickChecklist}`,
  `plan/{PlanScreen,PlanForm}`. **Shell:** two-tab `App.tsx` with the persistent banner.
- **PWA-lean (DB-0):** installable manifest + icon + mobile meta added at Phase 2
  kickoff (service worker still deferred to Phase 4).

---

## UX deviations — please rule (DB-2)

**D1 — Height field stays editable after a measurement prefills it.** §5 implies the
Measure result prefills Plan; I made the field still editable so someone can plan
without first measuring (manual entry). It's seeded + labelled "worst-case H + ΔH".
> ⬜ Approve editable prefill &nbsp;|&nbsp; ⬜ Lock it to the measured value &nbsp;|&nbsp; ⬜ Discuss

**D2 — Unit switch after a value is typed does not re-convert the field. ✅ FIXED (2026-06-14).**
Was: flip Metric→Imperial and the number stayed while the label changed. Now every
unit-bearing field (height, DBH, wind speed, hazard distances, measure distance)
re-converts on toggle. Fix: a pure, tested `convertDisplayValue()` in `units.ts` + a
drift-free `useUnitField` hook that keeps the canonical SI and reformats from it (so
repeated toggles never accumulate rounding error). Degree fields untouched.
Verified live: `14.887 m → 48.8 ft → 14.9 m`; +6 tests (now **89 passing**); lint/build green.
> ✅ **Fixed now** (per your call)

**D3 — Tilt sensor uses the `beta` axis only (portrait sighting).** `gamma`/landscape
sighting is exposed but has no UI. Reasonable v1 scope.
> ⬜ Approve (portrait-only sighting in v1) &nbsp;|&nbsp; ⬜ Want landscape too &nbsp;|&nbsp; ⬜ Discuss

**D4 — Only length / diameter / wind-speed are unit-toggled; azimuths & angles are
raw degrees** (matching the engine's unit-agnostic degree fields). Sensible, but
flagging.
> ⬜ Approve &nbsp;|&nbsp; ⬜ Discuss

**D5 — No component-render tests this phase** (would need jsdom/testing-library = new
deps, which DB-0's no-new-deps rule gates). Pure logic (units/store/handoff) is
unit-tested; DOM/flow coverage is qa's Phase 4 Playwright job, which I drove manually
here as a stopgap.
> ⬜ Approve (DOM coverage lands in Phase 4) &nbsp;|&nbsp; ⬜ Want a jsdom brief now &nbsp;|&nbsp; ⬜ Discuss

---

## Carry-forward to Phase 3 (sim-dev) — not a decision
The Simulate screen consumes the **`ActionablePlan`** (`fallAzimuth`, `steeringConeDeg`,
`dangerRadiusM`) and the `sim.ts` geometry already built in Phase 1 (`buildCorridor`,
`checkCorridor`). A `refer-professional` result has no fall corridor — Simulate should
mirror the takeover (information-only) in that state.

---

### Sign-off — APPROVED 2026-06-14
- [x] Screens reviewed (Measure / readout / referral takeover / cut card)
- [x] D1 editable prefill — approved · D2 — **fixed now** · D3 portrait-tilt — approved ·
  D4 raw-degree azimuths — approved · D5 DOM coverage in Phase 4 — approved
- [x] **Phase 3 (sim-dev) cleared to start**
