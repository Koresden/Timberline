# Phase 3.5 — Design integration (visual restyle only)

Applied the landed design system to the existing Measure and Plan screens and the
app shell, with no new features or device chrome (Option 1, owner-confirmed).
Replaced `src/index.css` with the design tokens (light + dark, `prefers-color-scheme`
auto-theming preserved; dark is the on-site primary) and self-hosted the type stack
under `public/fonts/` (Archivo variable + IBM Plex Sans 400/500/600 + IBM Plex Mono
500 as `.woff2`, wired via `@font-face`; the design's `system-ui`/`ui-monospace`
fallbacks remain). Rebuilt `App.tsx`/`App.css`: the Measure/Plan/Simulate tab bar is
now the SPEC §4 stepper (new presentational `components/Stepper.tsx`), whose
active/done/idle states derive purely from the store — a stored `HeightEstimate`
marks Measure done, a published `ActionablePlan` (`currentPlan`) marks Plan done; a
referral clears `currentPlan` so it never falsely reads done. Restyled every owned
component to the redlines: SPEC §5 buttons (52px primary, 48px hit floor, press/focus
states, reduced-motion respected), §6 status chips, §7 stat tiles & readouts, §8
banners, §9 diagram strokes (planned fell line → `--accent`, escape routes → `--safe`
dashed, danger ring → calm `--diagram-stroke` dashed), and the §8 danger-banner
treatment for the `ReferralTakeover`. All safety invariants held: the persistent
`SafetyBanner` (caution semantics, icon + text) sits above every screen; the
`refer-professional` takeover still renders **no cut specs** (the discriminated-union
narrowing is untouched) and reads as danger; `--accent` is brand/action only, `--danger`
stays reserved for stop/locked. Did not touch `src/features/simulate/**` or
`src/engine/**`. Verified in-browser at port 5180 (Playwright, 390px mobile viewport,
dark + light): Measure, Plan (caution cut card + notch/escape diagrams), and the
referral takeover all match the mockups; the post-measure stepper correctly flips
Measure to green-done. `npm run lint` clean, `npm run test` 112 passing, `npm run
build` green. Note for the brief: Simulate inherits the tokens but its calm danger
ring currently reads as a solid red fill and its panels/buttons predate these
redlines — it needs a sim-dev polish follow-up.

## Simulate views — visual polish (sim-dev follow-up)

Restyled the Simulate top + side views to the SPEC §9 diagram redlines, visual only —
no geometry, no `θ(t)` curve, no collision logic, no store wiring changed; the pure
helpers and their tests are untouched (test count stays 112). The key safety fix: the
top-view danger ring no longer reads as a solid red fill when the path is clear. It now
renders **calm** as a dashed `--diagram-stroke` circle with no fill, and switches to
`--danger` (1.6px stroke + ~14% `--danger` fill, pulsing per §11) **only on a real
breach** — driven entirely off the existing `checkCorridor` conflict result (`blocked =
conflictIds.size > 0`), via an `is-breached` class on the ring + its legend swatch. No
new logic was added. Also applied §9: diagram panels get `--diagram-fill` / `1px
--border` / radius 18; the fall corridor cone is `--accent` @16% with a 3px accent
centerline + arrowhead (the planned fell line); the bounce/roll hatch is now neutral
`--diagram-stroke` (red reserved for danger); side-view ground/ghost/impact markers are
dashed `--diagram-stroke`, the falling rod and predicted fall arc are `--accent`, the
impact zone is marked, and all map labels/readouts/captions use `--font-mono` + `--muted`.
`prefers-reduced-motion` drops both the ring pulse (to a static 2px `--danger` ring) and
the obstacle pulse to static strokes. All colours are tokens — no hardcoded hex; SVG
only; engine untouched. Verified in dark at port 5180 (Playwright, mobile viewport):
clear state shows a neutral ring with no red and an accent corridor; dropping a House into
the corridor flips the verdict, ring (`sim-danger-ring is-breached`), legend, and the
obstacle to red. `npm run lint` clean, `npm run test` 112 passing, `npm run build` green.
