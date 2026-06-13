# DB-0 — Phase 0 Decision Brief

**Phase:** 0 (Scaffold) · **Author:** orchestrator · **For approval by:** Daniel
**Status:** ✅ APPROVED by Daniel (2026-06-13) — Phase 1 (engine-dev, TDD) cleared to start.

Phase 0 is complete and verified (see *Scaffold record* at the bottom). This brief
asks you to settle the three open decisions from HANDOFF §5 before the engine work
begins. Each has options, a recommendation, and a checkbox.

---

## Decision 1 — State management: Zustand vs React Context

**Context.** Most state is per-feature form input. Two things are shared and
*high-frequency*: the live `DeviceOrientationEvent` stream on the Measure screen
(updates many times/second) and obstacle dragging on the Simulate top view. There
is also a small shared "current job" (height → plan → sim) and a global unit
preference. The engine stays pure regardless — state only *orchestrates* it.

| Option | Pros | Cons |
|---|---|---|
| **A. React Context + hooks** | Zero new deps; familiar; fine for small trees | Context re-renders every consumer on any change — painful for the 60 Hz tilt stream and drag; needs multiple contexts + `memo` gymnastics to stay fast; poor selector granularity |
| **B. Zustand** (~1 KB) | Selector subscriptions → only components that use a slice re-render (handles tilt/drag cleanly); store is plain TS, lives outside React, trivially unit-testable; tiny; pre-sanctioned in HANDOFF §3 | One dependency; team must keep domain math out of the store |

**Recommendation: B — Zustand.** The high-frequency tilt and drag updates are the
deciding factor: Context would re-render the tree on every event; Zustand's
selectors don't. The store stays a thin orchestrator (holds inputs/outputs, calls
`engine/*` functions) — **no felling math in the store**, preserving engine purity.
It's the one dependency the handoff already pre-approved for this choice.

> ✅ **APPROVED: use Zustand** &nbsp;&nbsp;|&nbsp;&nbsp; ⬜ Prefer Context &nbsp;&nbsp;|&nbsp;&nbsp; ⬜ Discuss
> *(Engine stays framework-agnostic in Phase 1; Zustand is installed in Phase 2 when state is first wired.)*

---

## Decision 2 — Unit-toggle approach

**Fixed constraint (HANDOFF §3):** everything is stored in SI internally; imperial
is **never** stored. The decision is *how* the display toggle works.

| Option | Description |
|---|---|
| **A. Global toggle, convert at the boundary** | One app-wide unit preference. A `useUnits()` hook exposes `format()` / `parseInput()` backed by **pure** conversion helpers. SI is the only stored value; the toggle flips display + input parsing everywhere. Round only at display; keep full precision (and the ± band) internally. |
| **B. Per-field unit selectors** | Each input picks its own unit (m vs ft per field). Maximum flexibility. |
| **C. Format-on-render only, no toggle** | Pick metric, show a secondary imperial readout inline. |

**Recommendation: A — global toggle, SI-internal, convert at the boundary.**
Metric is the default (engine + safety constants are metric; handoff examples are
SI). The unit preference lives in the store (Decision 1) and persists across
sessions. **B** invites unit-confusion bugs — exactly what the safety-auditor
red-teams against — so it's rejected for a safety tool. **C** is cramped on mobile.

*Small structural note:* the pure conversion functions are a **display** concern,
so they live in `src/units.ts` (or the hook), **not** in `src/engine/` — the engine
stays unit-agnostic and SI-only. Flagging because it adds one shared module outside
the §3 layer list.

> ✅ **APPROVED: global toggle, metric default, SI-internal** &nbsp;|&nbsp; ⬜ Per-field units &nbsp;|&nbsp; ⬜ Discuss

---

## Decision 3 — PWA: now vs later

**Fixed constraint (HANDOFF §1):** the shipped app is an **offline-capable PWA**.
The decision is *when* to wire up the service worker + manifest, not *whether*.

| Option | Pros | Cons |
|---|---|---|
| **A. PWA now (Phase 0)** | Offline tested from day 1; install prompt early; SW caching pitfalls surface early | New dep (`vite-plugin-pwa`) + SW now; service-worker caching causes **stale-asset headaches during the heavy Phase 2/3 UI iteration**; almost nothing to cache yet |
| **B. PWA later (Phase 4)** | No SW cache friction during rapid UI dev; cache a *stable, known* asset set; safety-auditor verifies offline behavior at hardening | Offline only proven late; risk of SW surprises near ship |
| **C. PWA-lean: manifest now, SW later** *(middle)* | Installable + correct mobile chrome (theme color, icons, viewport) from the start; **no** service worker yet, so no cache staleness; full offline SW added in Phase 4 | Two small steps instead of one |

**Recommendation: C — manifest now, service worker in Phase 4.** Add only the web
app manifest + theme/viewport meta in Phase 1 (installable, correct mobile
appearance, zero caching risk). Defer `vite-plugin-pwa` + the offline service
worker to Phase 4, when the asset surface is stable and the safety-auditor can
verify offline mode end-to-end. The `vite-plugin-pwa` addition gets its own
one-line brief then (per the no-new-deps rule). This keeps the offline requirement
on track without sabotaging Phase 2/3 iteration.

*Note:* nothing PWA-related was added in Phase 0 — this decision is yours to make
before any of it lands.

> ✅ **APPROVED: manifest now, SW in Phase 4** &nbsp;|&nbsp; ⬜ PWA fully now &nbsp;|&nbsp; ⬜ PWA fully later &nbsp;|&nbsp; ⬜ Discuss
> *(Manifest is a non-engine scaffold item — added at the Phase 2 kickoff, not mixed into the Phase 1 engine session.)*

---

## Scaffold record (what Phase 0 actually built)

All four gates pass on the hello-world: **`npm run dev`**, **`npm run test`**,
**`npm run lint`**, **`npm run build`**. The engine-purity ESLint rule was probed
with a deliberate `react` + `features/` import and correctly errored.

**Stack:** Vite 6 · React 19 · TypeScript 5 (strict) · Vitest 3 · Playwright ·
ESLint 9 (flat config). Runtime deps are only `react` / `react-dom`.

**Judgment calls made during scaffolding (flagging for your awareness):**
1. **Handoff path.** The handoff arrived as `timberline-handoff.md` at the repo
   root, not `docs/HANDOFF.md`. Per §3/§5 I copied it to `docs/HANDOFF.md` (both
   now exist, identical).
2. **Seeded `engine/constants.ts` and `engine/types.ts`.** I transcribed the §2
   safety constants (with citation comments) and the §2.2 `FellingPlan` / input
   contracts now — values and types only, **no felling logic** (that's Phase 1).
   This locks the seam early and makes the purity rule meaningfully testable. The
   constants are pinned by a Phase-0 test. `measure/plan/sim.ts` are stubs that
   throw "not implemented until Phase 1".
3. **Two toolchain additions beyond the handoff's expected list:** `@types/node`
   (type-only, required by `playwright.config.ts`) and **Vitest 3 instead of 2**
   (Vitest 2 pulled a second, conflicting copy of Vite; v3 dedupes to one Vite 6).
   Both are toolchain, not runtime/feature deps. Zustand and any PWA plugin are
   **not** installed — they're Decisions 1 and 3 above.
4. **Dedicated dev port 5180 (`strictPort`).** Port 5173 is currently occupied by
   a *different* Vite project on this machine; Timberline pins 5180 so dev,
   preview, and the Playwright `webServer` always agree and never drift onto a
   neighbour's server.

**Known issue (not blocking, no action taken):** `npm audit` reports 6
advisories, all the single esbuild **dev-server** issue (GHSA-67mh-4wv8-2f99)
pulled in transitively by Vite/Vitest. It affects the local dev server only, never
the shipped client bundle. The only remediation is forcing Vite 8 (a breaking
major) — that warrants its own brief, so I did **not** apply it.

---

### Sign-off

- [x] Decision 1 approved — Zustand
- [x] Decision 2 approved — global toggle, metric default, SI-internal
- [x] Decision 3 approved — manifest now, SW in Phase 4
- [x] Scaffold record reviewed — **Phase 1 (engine-dev, TDD) cleared to start** ✅ 2026-06-13
