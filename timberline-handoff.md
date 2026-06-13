# TIMBERLINE — Tree Felling Assistant
## Project Handoff & Agentic Workflow Plan (Claude Code / Terminal)

**Owner:** Daniel · **Target environment:** Claude Code in terminal · **Stack:** React + TypeScript + Vite (PWA-ready)
**Status:** Greenfield — this document is the single source of truth for Phase 0 kickoff.

---

## 1. Product Definition

A browser-based (mobile-first) assistant for planning a tree felling operation. Three core modules:

| Module | What it does | Core inputs | Core outputs |
|---|---|---|---|
| **Measure** | Estimates tree height via clinometer trigonometry | Distance to tree, angle to top, angle to base (or eye height) | Height (m/ft) with error band |
| **Plan** | Recommends the cut sequence | Height, DBH, lean direction/severity, species class, wind, target felling direction | Notch type + angles, hinge dimensions, back cut spec, escape routes |
| **Simulate** | Visualizes the fall before any saw touches wood | Plan output + user-placed obstacles | Top-down fall zone + side-view fall arc, danger radius, go/no-go assessment |

### Non-goals (v1)
- No AR camera overlay (deviceorientation tilt sensing only; photo-based measurement is v2)
- No species database beyond 4 broad classes (softwood, hardwood, dead/compromised, palm-like)
- No account system, no backend — fully client-side, offline-capable PWA

### Safety posture (non-negotiable, build into every phase)
- App is a **planning aid, not authorization**. Persistent banner: recommendations assume a trained operator with PPE; trees > 20 in DBH, near structures/power lines, or dead/leaning heavily → app explicitly recommends a professional arborist and degrades to "information only" mode.
- Every Plan output includes the OSHA-style retreat rule (two escape routes at ~45° opposite the fall line) and the 2× tree-height danger radius.
- No "override safety" setting anywhere.

---

## 2. Domain Logic Specification

This is the heart of the app. All of it lives in `src/engine/` as **pure, dependency-free TypeScript** with unit tests. UI consumes it; UI never contains domain math.

### 2.1 Height measurement (`engine/measure.ts`)
Two supported methods, selected by user:

**A. Tangent (clinometer) method**
```
height = distance × (tan(angleTop) + tan(angleBase))   // when base angle is below horizontal
height = distance × (tan(angleTop) − tan(angleBase))   // when on a slope, base above horizontal
```
- Angle source: manual entry OR `DeviceOrientationEvent` (request permission flow on iOS).
- Error model: propagate ±1° angle error and ±2% distance error → report height as `H ± ΔH`. The simulation always uses `H + ΔH` (worst case) for danger radius.

**B. Stick method (fallback, no sensors)**
Classic 45° stick trick: walk until a stick held at arm's length spans base→top; distance walked ≈ height. Implemented as a guided checklist, not math input.

### 2.2 Cut recommendation (`engine/plan.ts`)
Rule-based, deterministic, fully unit-testable. Inputs: `{ heightM, dbhCm, leanDeg, leanAzimuth, targetAzimuth, windKph, windAzimuth, speciesClass, hazards[] }`

Decision rules (encode as ordered guard clauses, each with a `reason` string surfaced in UI):

1. **Referral gates (hard stops → "consult professional"):** DBH > 50 cm, lean > 10° away from target direction, dead/compromised species class, any hazard tagged `structure | powerline | road` inside 1.5× height of any feasible fall line, wind > 15 kph.
2. **Notch selection:**
   - Default: **open-face notch**, 70° total opening (≈ ⅓ DBH deep) — hinge holds longest, safest for non-pros.
   - Heavy forward lean (5–10° toward target): **conventional 45°** + recommendation of **bore cut** back cut to prevent barber chair.
   - Steep ground / want low stump: **Humboldt** (note: advanced, flag accordingly).
3. **Hinge:** thickness = 10% of DBH (min 2.5 cm), length = 80% of DBH. Never recommend cutting through the hinge.
4. **Back cut:** 2.5–5 cm above notch apex (conventional/open-face), level, leave hinge intact; wedge insertion prompt when DBH > 25 cm or back-lean component exists.
5. **Felling direction feasibility:** achievable direction = lean azimuth adjusted by hinge steering limit (±15° for open-face, ±10° conventional, less in wind). If user's target is outside the achievable cone → return `infeasible` with the nearest feasible azimuth.
6. **Escape routes:** two paths at 135°/225° relative to fall line, ≥ 4.5 m, with "never directly behind the tree" rule.

Output type:
```ts
interface FellingPlan {
  verdict: 'ok' | 'caution' | 'refer-professional';
  notch: { type: 'open-face'|'conventional'|'humboldt'; openingDeg: number; depthCm: number };
  hinge: { thicknessCm: number; lengthCm: number };
  backCut: { offsetCm: number; boreCut: boolean; wedges: number };
  fallAzimuth: number;            // achievable, possibly != target
  steeringConeDeg: number;
  escapeAzimuths: [number, number];
  dangerRadiusM: number;          // 2 × (height + ΔH)
  reasons: string[];              // every rule that fired, human-readable
}
```

### 2.3 Fall simulation (`engine/sim.ts`)
Keep it honest: this is a **kinematic visualization**, not a physics engine.

- **Side view:** tree as rigid rod rotating about hinge; angular position over time from pendulum-style energy model `θ(t)` (closed-form approximation is fine — smoothstep over ~2.5 s scaled by height is acceptable v1). Show hinge holding until ~60°, then free fall annotation.
- **Top view:** fall corridor = wedge centered on `fallAzimuth` with half-angle = `steeringConeDeg` + lean/wind uncertainty bonus. Tree footprint = line of length `height + ΔH`. Danger circle = `dangerRadiusM`.
- **Obstacles:** user drags rectangles/circles onto top view (house, fence, vehicle, other trees). Collision test = corridor ∩ obstacle. Any intersection → verdict downgrades, conflicting obstacle pulses red.
- **Bounce/roll allowance:** extend corridor 20% past tip for hazard checking only (rendered as hatched zone).

---

## 3. Architecture & Conventions

```
timberline/
├── CLAUDE.md                 # conventions file — write FIRST (template below)
├── docs/
│   ├── HANDOFF.md            # this document
│   └── decisions/            # Decision Briefs, one md per gate (see §5)
├── src/
│   ├── engine/               # pure TS, zero React imports, 100% unit-tested
│   │   ├── measure.ts
│   │   ├── plan.ts
│   │   ├── sim.ts
│   │   └── types.ts
│   ├── components/           # presentational only
│   ├── features/             # measure/ plan/ simulate/ — feature folders own state
│   ├── hooks/                # useDeviceOrientation, useUnits
│   └── App.tsx
├── tests/engine/             # vitest; every rule in §2.2 gets a named test
└── e2e/                      # playwright smoke: full measure→plan→simulate flow
```

**Conventions (seed `CLAUDE.md` with these):**
- Engine purity rule: `src/engine/**` may not import from React, DOM, or `features/`. Enforce with an ESLint `no-restricted-imports` rule in Phase 0.
- All distances stored in SI internally; unit conversion at the display boundary only (`useUnits`).
- Every safety-relevant constant (hinge %, danger multiplier, referral thresholds) lives in `engine/constants.ts` with a citation comment (source: OSHA 1910.266 guidance, USFS felling guides) — never inline magic numbers.
- Simulation rendering: SVG, not canvas — easier to test, style, and animate; performance is a non-issue at this scale.
- No new dependencies without a Decision Brief. Expected total deps: react, vite, vitest, playwright, zustand (or React context — agent decides in Phase 0 brief).

---

## 4. Agent Roster (Claude Code multi-agent setup)

Mirror the Dugout Dynasty pattern: an orchestrator plus specialized subagents, with Decision Brief gates between phases. Define these in `.claude/agents/`:

| Agent | Charter | May touch | Must not touch |
|---|---|---|---|
| **orchestrator** (main session) | Phase sequencing, Decision Briefs, merge reviews | everything (read), docs/ (write) | feature code directly |
| **engine-dev** | §2 domain logic + unit tests, TDD mandatory | `src/engine/`, `tests/` | `src/features/`, `src/components/` |
| **ui-dev** | Feature screens, forms, sensor permission flows | `src/features/`, `src/components/`, `src/hooks/` | `src/engine/` |
| **sim-dev** | SVG simulation views (top + side), animation, obstacle drag | `src/features/simulate/`, may read engine | engine internals |
| **safety-auditor** | Adversarial review: tries to make app give unsafe advice; checks every referral gate fires; copy review of warnings | read-only + `docs/` | all source (proposes patches via orchestrator) |
| **qa** | Playwright e2e, cross-checks plan outputs against hand-computed fixtures | `e2e/`, `tests/` | source |

Subagent prompt skeleton (put in each agent file):
```
You are {role} on Timberline. Read CLAUDE.md and docs/HANDOFF.md §{relevant} before any work.
Hard boundaries: {may touch / must not touch}.
Definition of done: code + tests green + one-paragraph summary appended to docs/decisions/phase-{n}-log.md.
If a requirement is ambiguous or a safety constant seems wrong, STOP and emit a Decision Brief request instead of guessing.
```

---

## 5. Phase Plan with Decision Brief Gates

Each phase ends with a **Decision Brief** (`docs/decisions/DB-{n}.md`): context, options considered, recommendation, risks, and an explicit ✅/❌ checkbox for Daniel. **No phase starts until the prior brief is approved.** Estimated total: 5 working sessions.

### Phase 0 — Scaffold (½ session)
- Vite + React + TS + vitest + playwright + ESLint (with engine-purity rule). Write `CLAUDE.md`, copy this handoff into `docs/`.
- **DB-0:** state management choice (zustand vs context), unit-toggle approach, PWA now-or-later.
- Done when: `npm run dev / test / lint` all green on hello-world.

### Phase 1 — Engine (1 session) · *engine-dev, TDD*
- Implement `measure.ts` (both methods + error propagation), `plan.ts` (all rules in §2.2 — one test per rule, including every referral gate), `sim.ts` geometry (corridor, collision).
- Fixtures: 6 hand-computed scenarios (write these into the brief): small straight pine, big oak near house (must refer), back-leaner, slope measurement, windy day refusal, dead tree refusal.
- **DB-1:** any rule the agent found ambiguous + the fixture table for Daniel to sanity-check the math.

### Phase 2 — Measure & Plan UI (1 session) · *ui-dev*
- Measure screen: method picker, device-orientation capture with iOS permission flow, manual fallback, live height readout with ± band.
- Plan screen: input form → `FellingPlan` rendered as a stepped cut card (notch diagram, hinge spec, back cut, escape compass). `reasons[]` shown as expandable "why" list. `refer-professional` verdict takes over the screen — no cut details rendered in that state.
- **DB-2:** screenshots + any UX deviations.

### Phase 3 — Simulation (1 session) · *sim-dev*
- Top view: draggable obstacles, fall corridor, danger circle, live verdict. Side view: animated fall on "Simulate" press. Re-run instantly on any input change.
- **DB-3:** demo recording + perf note.

### Phase 4 — Safety Audit & Hardening (½ session) · *safety-auditor + qa*
- Auditor red-teams: extreme inputs, unit confusion, sensor garbage, trying to coax cut advice past a referral gate. Files findings as patch proposals.
- QA: playwright flow measure→plan→simulate on the six fixtures; verifies refer-professional fixtures never show cut specs.
- **DB-4 (ship gate):** audit findings + resolutions, residual-risk statement, v2 backlog (AR measure, species DB, saved jobs, Korean localization).

---

## 6. Kickoff — paste this into Claude Code

```
Read docs/HANDOFF.md fully. You are the orchestrator.
Execute Phase 0 per §5: scaffold the repo, write CLAUDE.md per §3 conventions,
create .claude/agents/ files per §4, then produce docs/decisions/DB-0.md
and stop for my approval. Do not begin Phase 1.
```

### Standing rules for all sessions
1. One phase per session; start each session with "read CLAUDE.md + latest decision log."
2. Safety constants are never modified without an explicit Decision Brief.
3. Engine changes always land with tests in the same commit.
4. If the safety-auditor and another agent disagree, the auditor's position ships and the disagreement goes in the brief.
