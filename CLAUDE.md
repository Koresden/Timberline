# CLAUDE.md — Timberline

> Project conventions. Overrides the global `~/.claude/CLAUDE.md` where they conflict.
> The single source of truth for product + domain logic is **`docs/HANDOFF.md`** —
> read it before any work. Decision Briefs live in `docs/decisions/`.

Timberline is a mobile-first, offline-capable **tree-felling planning assistant**.
Three modules: **Measure** (clinometer height), **Plan** (cut recommendation),
**Simulate** (fall visualization). Fully client-side; no backend, no accounts.

---

## Safety posture (non-negotiable — HANDOFF §1)

- The app is a **planning aid, not authorization**. A persistent banner says so on
  every screen, always. There is **no "override safety" setting anywhere**.
- Big / leaning / dead / near structures or power lines → the app recommends a
  **professional arborist** and degrades to "information only" (no cut specs shown).
- Every Plan output carries the OSHA-style retreat rule (two escape routes ~45°
  back from the fall line) and the **2× tree-height danger radius**.
- The simulation always uses the **worst-case height (H + ΔH)** for the danger zone.

If a change would weaken any of the above, **stop and raise a Decision Brief** —
do not implement it.

---

## Conventions (HANDOFF §3)

1. **Engine purity.** `src/engine/**` is pure, dependency-free TypeScript. It may
   **not** import React, the DOM, or anything from `features/` / `components/` /
   `hooks/`. Enforced by the ESLint `no-restricted-imports` rule (+ `no-restricted-globals`
   for DOM). UI consumes the engine; the engine never reaches back into UI.
2. **Domain math lives in the engine, nowhere else.** UI screens render engine
   output; they contain no felling math.
3. **SI internally, convert at the edge.** All distances/angles stored in SI (cm,
   m, degrees, kph). Imperial conversion happens only at the display boundary
   (`hooks/useUnits`). Never store imperial.
4. **Safety constants are centralized and cited.** Every safety-relevant number
   (referral thresholds, hinge %, danger multiplier, error model) lives in
   `src/engine/constants.ts` with a citation comment. **No inline magic numbers.**
   These constants are **locked** — change them only via a Decision Brief, with a
   test update in the same commit.
5. **Simulation rendering is SVG, not canvas.** Easier to test, style, and animate;
   performance is a non-issue at this scale.
6. **No new dependencies without a Decision Brief.** Expected total runtime deps:
   `react`, `react-dom`, plus the build/test toolchain. (State library and PWA
   plugin are pending DB-0.) Propose, justify in a brief, then add.

---

## Engineering rules

- **TDD in the engine.** Engine changes always land **with tests in the same
  commit** (HANDOFF §6, rule 3). Every rule in §2.2 and every referral gate gets a
  named test.
- **Design the seam first.** Shared contracts live in `src/engine/types.ts`. Define
  signatures/types before implementing; call out any interface change and update
  callers.
- **One responsibility per file; split past ~200–300 lines.**
- **Handle the unhappy path** — sensor garbage, out-of-range inputs, NaN angles.
- **Types or it didn't happen** — `strict` TypeScript everywhere.

---

## Layout

```
src/engine/      pure domain logic + constants + types   (engine-dev)
src/components/  presentational only                     (ui-dev)
src/features/    measure/ plan/ simulate/ — own state    (ui-dev, sim-dev)
src/hooks/       useDeviceOrientation, useUnits           (ui-dev)
tests/engine/    vitest — one test per rule               (engine-dev, qa)
e2e/             playwright smoke → full flow             (qa)
docs/decisions/  Decision Briefs, one per gate            (orchestrator)
```

## Commands

| | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | type-check (`tsc -b`) + production build |
| `npm run lint` | ESLint (incl. engine-purity rule) |
| `npm run test` | Vitest (engine/unit) |
| `npm run test:e2e` | Playwright (needs `npx playwright install` once) |

---

## Phase discipline (HANDOFF §5–§6)

- **One phase per session.** Start each session by reading this file + the latest
  Decision Brief in `docs/decisions/`.
- Each phase ends with a Decision Brief (`DB-{n}.md`) and **does not proceed until
  Daniel approves it**.
- Multi-agent roster + boundaries are defined in `.claude/agents/`. Respect the
  may-touch / must-not-touch lines.
- If the **safety-auditor** disagrees with another agent, the auditor's position
  ships and the disagreement is recorded in the brief.
