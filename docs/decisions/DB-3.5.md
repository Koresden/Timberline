# DB-3.5 — Design Integration

**Phase:** 3.5 (Design integration — visual restyle) · **Author:** orchestrator · **Implementers:** ui-dev + sim-dev
**For approval by:** Daniel · **Status:** ⏳ awaiting sign-off — Phase 4 (safety audit & ship gate) starts after this.

You imported `timberlinevisual.zip` (a "rugged field instrument" design system). Per
your steer, this was a **visual restyle only** (Option 1): re-skin the existing
screens; defer net-new features. Done and verified.

---

## Verification (re-run + browser-checked by the orchestrator)

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm run test` | **112 passed** (restyle is markup/CSS — broke no logic test) |
| `npm run build` | ✓ |
| Browser (dark + light, mobile) | Measure, Plan, referral takeover, Simulate all match the mockups |

---

## What landed
- **Token system** — `src/index.css` replaced with the design tokens (light **and**
  dark, auto by `prefers-color-scheme`; dark is the on-site primary). Chainsaw-orange
  accent, pine-charcoal surfaces, plus type/spacing/radius scales and a 48px hit floor.
- **Fonts self-hosted** (offline-safe PWA): Archivo (display), IBM Plex Sans (UI),
  IBM Plex Mono (readouts) as `.woff2` in `public/fonts/`, with `system-ui` fallbacks.
- **App icon + chrome** — new conifer/notch logomark (`public/icon.svg`); manifest +
  `theme-color` set to the dark field background.
- **Shell → stepper** — the tab bar is now the Measure/Plan/Sim 3-step stepper; a step
  shows **done** (green ✓) when its data exists (measured height → Measure done,
  published plan → Plan done), derived from the store.
- **Components restyled** to the SPEC redlines — buttons, status chips, stat tiles,
  banners, diagram panels/strokes — across Measure, Plan, and all shared components.
- **Simulate polish** (sim-dev) — diagram panels, accent fell cone + arrow, accent
  fall arc; and the **danger-ring safety fix** below.

## Safety semantics — preserved and *improved*
- Persistent SafetyBanner on every screen (now with a warning icon); `refer-professional`
  takeover still renders **no cut specs** (type-guaranteed; narrowing untouched), using
  the solid-red §8 danger banner.
- **Red is now reserved strictly for danger.** The Simulate danger ring previously
  showed a solid red fill even when the path was *clear*; it's now a **neutral dashed
  ring when calm**, switching to red stroke + fill **only on a real obstacle breach**.
  This matches the design's color logic (orange = action, amber = caution-proceed, red =
  stop) and is a genuine safety-readability improvement over the pre-design build.

## Deviations from the mockups (intentional, Option 1)
- Placeholder content in the mockups was **not** built: weight estimate, Kickback/
  Barber-chair/Hang-up risk rows, tree-ID subtitle, the phone device-frame/status-bar
  chrome. The app-bar subtitle is a static "Tree-felling planning aid."
- Measure's "live sight" is a **styled tilt readout**, not a real AR viewfinder
  (HANDOFF §1 lists AR as a v1 non-goal).

---

## Decisions recorded / for your nod

**Scope = Option 1 (visual only).** Confirmed. The following are explicitly parked:

**→ v2 backlog** (new engine/flow work, each needs its own spec; the design README calls
this data "placeholder"): AR camera measurement · weight estimate · Kickback/Barber-chair/
Hang-up risk scoring · cut-sequence checklist · tree IDs / saved jobs.

**→ Queued for Phase 4** (auditor-reviewed): the **manual "area-clear" danger gate** —
a "confirm the 2× danger radius is clear before cutting" step with the locked/horn
affordances, reframed as a *manual* gate (no fake person-detection, which isn't possible
client-side). It's a feasible safety win, so it goes on the Phase 4 agenda where the
safety-auditor can vet a new safety flow properly.

> ⬜ **Approve the restyle + the v2/Phase-4 split above** &nbsp;|&nbsp; ⬜ Adjust (note below)

Open design-side options (from the design README, FYI — no action needed unless you want
them): light-theme screen mockups can be produced; two alternate accent directions exist
(we locked **Pine + Orange**).

---

### Sign-off
- [ ] Restyle reviewed (dark + light)
- [ ] v2 backlog + the Phase-4 manual area-clear gate agreed
- [ ] **Phase 4 (safety audit & ship gate) cleared to start**
