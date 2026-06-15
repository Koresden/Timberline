# Phase 3 — Simulation views (sim-dev) — work log

**Phase:** 3 (Simulation) · **Implementer:** sim-dev · **Status:** complete, pending DB-3.

## Summary

Built the two Simulate views per HANDOFF §2.3, all in SVG (no canvas), all colours
via CSS variables (re-theme-ready), and consuming the Phase-1 engine geometry
(`buildCorridor` / `checkCorridor`) WITHOUT modifying any engine file. The **top
view** renders the fall-corridor wedge on `fallAzimuth`, the 2× tree-height danger
circle, and the bounce/roll extension as a hatched zone, with draggable
rect/circle obstacles (house/fence/vehicle/tree) moved by pointer events (mouse +
touch). On every drag / add / remove / plan change it re-runs `checkCorridor`
instantly — conflicting obstacles pulse red (CSS animation on `--danger`) and the
verdict flips between "Clear — no obstacles in the fall path" and "Fall path
blocked — N obstacle(s) in the corridor", no submit button. The **side view**
animates a rigid rod rotating about the hinge on a "Simulate fall" press: a pure,
unit-tested smoothstep θ(t) over a height-scaled ~2.5 s, annotated "hinge holds"
until 60° then "free fall", re-runnable and resetting on input change. A
`refer-professional` result (or no plan yet) shows an information-only empty state
("No simulation to show") — never a fabricated corridor; the persistent
SafetyBanner stays. Verified live in a mobile (375px) browser: generated an
actionable plan, dragged a house into the corridor (verdict flipped to no-go, the
house pulsed red), ran the side-view fall to θ=90° (free-fall annotation), and
confirmed a DBH-70 referral clears the sim source so Simulate stays empty. lint /
test (112 passing, up from 89) / build all green; no console errors.

## Perf note (for DB-3)

- **Collision loop is trivially cheap.** `checkCorridor` polygonizes the wedge
  (~halfAngle/5 segments, here ~6–8 verts) and tests each obstacle (≤ a few rects'
  4 corners) against it — a handful of point-in-polygon / segment-intersection ops
  per obstacle. With the realistic obstacle counts a phone user places (single
  digits), a full re-check is well under a frame and runs synchronously inside
  React render via `useMemo`; dragging stays smooth.
- **Drag uses pointer events + pointer capture**, one `setState` per `pointermove`;
  React 19 batches and the SVG subtree is small (one danger circle, two wedge
  paths, N obstacle groups), so re-renders are cheap. No rAF needed for dragging.
- **Side-view animation is a single rAF loop** writing one `theta` state per frame
  for ~2.5 s; the SVG is ~6 primitives. Negligible cost; the loop is cancelled on
  unmount and on input change. Honest framing: it is a kinematic smoothstep, not a
  physics integration.
- **Bundle:** production build is 236 KB JS (74 KB gzip), 10.6 KB CSS — Phase 3
  added only feature code (no new deps; React 19 + Zustand only).

## Files

Created (all under `src/features/simulate/`):
- `geometry.ts` — PURE helpers: `azimuthToScreen`, `metresToScreen`,
  `fitScalePxPerM` (m↔px), `smoothstep`, `fallAngleAtTime`, `fallDurationMs`,
  `hingeHolds` (+ `HINGE_HOLD_DEG`, `FALL_TOTAL_DEG`). Unit-tested.
- `obstaclePresets.ts` — obstacle factory (engine-frame, x=east/y=north) + move.
- `SimulateScreen.tsx` — orchestrator + information-only empty/referral state.
- `TopView.tsx` — corridor/danger/hatched wedge, draggable obstacles, live verdict.
- `SideView.tsx` — animated rigid-rod fall arc with hinge/free-fall annotation.
- `simulate.css` — view styles incl. the red-pulse keyframes (reduced-motion safe).

Tests:
- `tests/simulate.test.ts` — 20 tests for the pure helpers (azimuth→SVG mapping,
  m↔px scaling, θ(t) curve: monotonic 0→90°, holds region, clamps).
- `tests/appStore.test.ts` — +3 tests for the new simulation slice.

Authorized cross-feature seam (minimal):
- `src/store/appStore.ts` — added a `simulation` slice: `currentPlan:
  ActionablePlan | null`, `currentInput: PlanInput | null`,
  `setSimulationSource(plan, input)`, `clearSimulation()`.
- `src/features/plan/PlanScreen.tsx` — on submit, publish an actionable plan
  (`setSimulationSource`) or `clearSimulation()` on a `refer-professional` verdict
  (and on a compute error). No other plan logic touched.
- `src/App.tsx` — added the third "Simulate" tab.

Engine: untouched (read-only).
