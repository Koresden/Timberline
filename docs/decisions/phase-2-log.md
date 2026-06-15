# Phase 2 log — Measure & Plan UI (ui-dev)

Built the Measure and Plan feature screens per HANDOFF §2.1/§2.2/§5, consuming the
Phase-1 engine unchanged (no `src/engine/**` edits). A two-tab App shell (Measure /
Plan) keeps the persistent `SafetyBanner` and the global unit toggle above every
screen. **Measure**: a Tangent ⇄ Stick method picker; the tangent form supports
manual entry and device-tilt capture via `useDeviceOrientation` (feature-detects the
iOS 13+ `DeviceOrientationEvent.requestPermission()` gesture flow, attaches directly
on non-iOS, and falls back to manual with an explicit message on unsupported/denied);
the live readout calls `measureByTangent` inside try/catch and renders `H ± ΔH` in the
active unit (verified `15 m / 40° / 5°` → **13.9 ± 1.0 m**, matching DB-1 fixture 1).
The stick method renders `STICK_METHOD_STEPS` as a numbered checklist, no math. A
successful measurement is stored in a thin **Zustand** store (DB-0 D1) as the
Measure→Plan handoff. **Plan**: a `PlanInput` form (height, DBH, lean, target, wind,
species, repeatable hazards) submits to `recommendPlan`; an `ActionablePlan` renders a
stepped cut card — notch (inline SVG diagram) → hinge → back cut → escape compass (SVG
top-down, fall line + two escape routes + dashed danger ring) — with `caution` visually
distinct from `ok` and `reasons[]` in an expandable "why" list. A `refer-professional`
verdict triggers a **full-screen takeover** (heading, reasons, danger radius, NO cut
specs); runtime-verified that the referral state renders neither the form nor a cut
card (DBH 70 cm → takeover only, danger 29.8 m).

**Safety contracts enforced.** The H + ΔH handoff lives in one pure helper
(`store/worstCaseHeight.ts`, `heightM + errorM`) used to seed the Plan height field —
confirmed the field carries the worst-case (14.887 m / 48.8 ft), never the bare 13.9 m.
The referral takeover narrows on the `verdict` discriminant before any cut rendering,
so the `ReferralPlan` variant (which has no cut fields by type) can never leak specs.

**Units stay SI-internal** (DB-0 D2): pure conversion in `src/units.ts`, surfaced via
`hooks/useUnits` (store → hook → display); rounding only at display; metric default,
persisted to localStorage. The engine remains SI-only and untouched.

**Layout.** `src/units.ts`; `src/store/{appStore,unitStorage,worstCaseHeight}.ts`;
`src/hooks/{useUnits,useDeviceOrientation}.ts`; presentational
`src/components/{UnitToggle,NumericField,NotchDiagram,EscapeCompass,WhyList,CutCard,ReferralTakeover}.tsx`;
features `src/features/measure/{MeasureScreen,TangentForm,StickChecklist}.tsx` and
`src/features/plan/{PlanScreen,PlanForm}.tsx`; `src/App.tsx` shell. No new
dependencies (Zustand + React only). Added pure-logic vitest suites
(`tests/units.test.ts`, `tests/worstCaseHeight.test.ts`, `tests/appStore.test.ts`) —
no jsdom/component tests (deferred to qa Phase 4). `npm run lint` clean, `npm run test`
**83 passing**, `npm run build` ✓, `npm run dev` serves on 5180.

**Addendum (DB-2 D2 fix).** Unit-bearing form fields now re-convert their displayed value when the global unit toggle flips (previously the number stayed put while only the label changed). Added a pure `convertDisplayValue()` to `src/units.ts` and a drift-free `useUnitField` hook (holds canonical SI, reformats from it on system change); wired height/DBH/wind + tangent distance through the hook, and hazard distances (dynamic array) via the pure helper in a system-keyed effect. Degree fields untouched. No new deps; tests up to **89 passing**.
