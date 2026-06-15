# design/

Drop visual design source here (or share a Figma link and Claude will pull it via
the Figma integration). The app is fully CSS-variable-driven, so applying a design
system means remapping tokens in `src/index.css` — components don't change.

**Most useful, in priority order:**
1. **Design tokens** — color palette, type scale, spacing/radii. These map to the
   CSS variables already in `src/index.css` (`--bg`, `--fg`, `--accent`, `--danger`,
   `--warn-*`, `--ok-*`, `--caution-*`, `--diagram-*`, …).
2. **Screen mockups** — Measure, Plan, and the new Simulate views.
3. **The safety states especially** — the persistent "planning aid, not authorization"
   banner, the `refer-professional` takeover, and the danger-zone visuals.

**Non-negotiable (HANDOFF §1):** whatever the design says, the safety semantics are
preserved — the banner stays persistent and undismissable, the referral takeover
shows no cut specs, and the danger zone reads as danger. A restyle changes the look,
not the safety meaning.

Timing: ideal before the Phase 3 visual polish so tokens flow into all three screens
at once; latest useful point is before Phase 4 (safety audit).
