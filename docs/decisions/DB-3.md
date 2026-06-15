# DB-3 — Phase 3 Decision Brief (Simulation)

**Phase:** 3 (Simulation) · **Author:** orchestrator · **Implementer:** sim-dev
**For approval by:** Daniel · **Status:** ⏳ awaiting sign-off — **Phase 4 (Safety audit & ship gate) does not start until this is approved.**

The Simulate views are built and verified live by me. This brief is the demo +
perf note, plus two small items for you to confirm before the final phase.

---

## Verification (re-run + driven live by the orchestrator)

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm run test` | **112 passed** (+23 this phase: simulate geometry + store) |
| `npm run build` | ✓ (236 KB JS / 74 KB gzip) |
| Engine | **unchanged & pure** — `src/engine/**` not touched; no React/DOM/canvas in it |
| Rendering | **SVG only**, no canvas (HANDOFF §3) |

---

## Demo — what I drove on screen (port 5180, mobile)
Generated an actionable plan (height 14.887 m worst-case, DBH 30, target north), then
opened **Simulate**:

1. **Top view — clear:** compass (N up), the fall-corridor wedge pointing north, a
   **hatched bounce/roll** extension past the tip, and the dashed **29.8 m danger ring**
   (= 2 × worst-case height). Verdict pill: *"Clear — no obstacles in the fall path."*
   Add buttons: House / Fence / Vehicle / Tree.
2. **Top view — blocked:** added a House into the corridor → it renders as a **red box
   in the fall path**, and the verdict flips to *"Fall path blocked — 1 obstacle in the
   corridor."* The collision uses the engine's `checkCorridor`; conflicts pulse red.
   Re-runs instantly (no submit button).
3. **Side view — fall arc:** pressed **Simulate fall** → the rigid rod swept **0° → 90°**
   about the hinge over ~2.6 s, crossing the **"hinge holds → free fall"** annotation at
   ~60°; original upright shown dashed. Honest caption: *"Kinematic visualization only —
   not a physics model."*
4. **Referral / empty state:** a `refer-professional` plan clears the sim source, so
   Simulate shows an information-only "no simulation" card — **no fabricated corridor**.
   The persistent safety banner stays on every state.

*(Screenshots of all four states are in this session's transcript.)*

---

## What was built
- `src/features/simulate/` — `SimulateScreen`, `TopView`, `SideView`, plus **pure,
  unit-tested** helpers in `geometry.ts` (azimuth→SVG mapping with the SVG y-flip
  isolated, m↔px fit-scale, and the `fallAngleAtTime` θ(t) smoothstep) and
  `obstaclePresets.ts`.
- **Authorized seam (minimal):** a `simulation` slice in `store/appStore.ts`
  (`currentPlan: ActionablePlan | null`, `currentInput`, `setSimulationSource`,
  `clearSimulation`); `PlanScreen` publishes on an actionable verdict / clears on
  referral; `App.tsx` gained the third **Simulate** tab. Nothing else in plan/measure.
- All colours are CSS variables — **re-theme-ready** for the incoming design files.

## Perf note (DB-3)
Collision re-check is a handful of polygon ops per obstacle, synchronous in render and
sub-frame; dragging is one `setState` per `pointermove`; the fall is a single
`requestAnimationFrame` loop over ~6 SVG primitives. All negligible on a phone.

---

## Two items to confirm

**S1 — Obstacle drag needs a human touchscreen spot-check.** The collision→verdict→
red-pulse loop is proven (I placed a House in the corridor and the verdict flipped),
and the real React pointer handlers were exercised — but the headless preview can't
do a *trusted* touch-drag. Recommend a 30-second check on a real phone for the DB-4
demo. Not a blocker.
> ⬜ Approve (I'll note it for the Phase-4 qa Playwright + a manual touch check) &nbsp;|&nbsp; ⬜ Discuss

**S2 — Corridor uncertainty bonus uses the raw `leanDeg`/`windKph`** from the input
(per DB-1 §2d, approved), giving a *wider, more conservative* wedge than the plan-only
base bonus. Confirm that's what you want (wider = safer).
> ⬜ Approve wider/conservative wedge &nbsp;|&nbsp; ⬜ Use plan-only base bonus (one-line change) &nbsp;|&nbsp; ⬜ Discuss

---

## Carry-forward to Phase 4 (safety-auditor + qa) — the ship gate
- Auditor red-teams extreme inputs, unit confusion, sensor garbage, and *every* referral
  gate; confirms `refer-professional` never shows cut specs (now type-guaranteed) **and**
  never shows a fall corridor.
- qa: Playwright `measure → plan → simulate` on the six §5 fixtures + the manual touch
  check (S1).
- **PWA service worker** (DB-0 deferred) lands here — the offline capability + a
  `vite-plugin-pwa` one-line dependency brief.
- Design files, if they've arrived, get a theming pass before the audit.
- DB-4 is the ship gate: audit findings + residual-risk statement + v2 backlog.

---

### Sign-off
- [ ] Demo reviewed (clear / blocked / fall arc / referral-empty)
- [ ] S1 (manual drag check) + S2 (corridor bonus) confirmed
- [ ] **Phase 4 (safety audit & ship gate) cleared to start**
