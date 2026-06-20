# DB-8 — Closing the gap to the original design mockups

**Phase:** new track (visual reconciliation) · **Author:** orchestrator
**For approval by:** Daniel · **Safety sign-off:** safety-auditor (mandatory — see §C)
**Status:** ✅ APPROVED by Daniel (2026-06-16) — **scope A2** (Measure + Plan/Sim polish). B stays v2; **C is intentionally NOT built** (safety). Implementing.

You noticed the running app looks different from `design/screens/*`. This brief scopes
*why* and *what to do*. The headline: **the gap is real, but a large part of it is
deliberate and safety-driven — the original mockups draw things the posture forbids, and
v1 correctly omitted them.** So "make it match the mockup" is not a single task; it splits
three ways.

The design *language* already matches (dark pine theme, chainsaw-orange accent, Archivo/Plex
type, the token system in `src/index.css`). The divergence is **layout, populated states,
and a few features** — sorted below.

---

## A — Safe visual polish we CAN do (v1)

These close the *look* gap without touching safety meaning. They mostly reuse tokens and,
in two cases, CSS that already exists but was never wired to a component.

1. **Measure "sighting" panel.** The mockup shows a viewfinder-style sight panel. The CSS
   (`.sight-panel`, `.sight-chip`) **already exists in `App.css` but is used by no
   component** (orphaned in the Phase-3.5 design pass). It is explicitly a *styled panel,
   "NOT real AR"* — safe. Wire it into the Measure screen.
2. **Stat tiles + result state.** The mockup shows a *completed* measurement (Height/DBH/Lean
   tiles, "Continue to Plan" CTA). The `.stat-tiles` CSS also exists unused. The build
   currently shows only the *empty input* state + a text confirmation. Add the populated
   readout + a forward CTA.
3. **Populated/result states generally.** The comps are filled-in; the app shows empty
   states (you saw the pre-measurement Measure screen). Bringing result states closer to the
   comps is most of the perceived difference.

**Architectural snag (needs a decision):** the mockup's Measure shows **DBH and Lean** as
measured outputs, but the build captures those on the **Plan** screen, not Measure. A
faithful Height/DBH/Lean tile row on Measure means either (a) show **Height only** on
Measure (no IA change), or (b) move DBH/lean capture into Measure (real IA rework). I lean
(a) for v1.

## B — Features the mockup shows that are deferred to v2 (DB-4 backlog)

Not bugs — explicitly out of v1 scope. Building them is a product decision, not a "fix":
- **Weight estimate** ("EST. WEIGHT 1.9 t").
- **Saved jobs / tree IDs** ("OAK · TREE #A-12" in the app-bar subtitle).
- **Kickback / Barber-chair / Hang-up risk rows** (Simulate) — "risk scoring" is v2 backlog.

## C — Mockup elements that are SAFETY-INCOMPATIBLE — must NOT build

**This is the biggest reason the app looks different, and the divergence is correct.** Two
mockup elements would re-introduce exactly the failure modes this whole project (and the
DB-6 area-clear work) exists to prevent. The safety-auditor will block them; they ship only
over the auditor's objection, which the rules forbid.

1. **The entire `04-danger-zone` screen** — "**Live area scan**", "**Person in danger
   zone**", a "**PERSON · 18 m**" marker, "**1 BREACH**", "**Felling locked until the area
   is clear**", "**Sound horn / Re-scan**". This depicts the app **detecting people** and
   **gating felling** on that detection. The app *cannot* sense anyone (it's a phone), and
   the posture is absolute: **never imply detection, never gate/authorize.** DB-6 already
   built the *safe* version of this intent — a human **attestation** ("I have personally
   walked the danger zone"), which never claims detection and unlocks nothing. We keep that;
   we do **not** build the fake-scanner screen.
2. **"Begin cut sequence" CTA** (Simulate) and **"Felling locked/unlocked"** language — an
   **authorization** affordance. DB-4 is explicit: *any move toward a "begin cut" action
   needs a fresh safety review — it drifts toward authorization, which the posture forbids.*

> Net: a chunk of "why it looks different" is that the mockups drift into a
> **detection/lockout/authorization** product, and v1 is a **planning aid**. Matching those
> screens would be a regression in the one dimension that matters most.

---

## Recommendation & options (your call)

Pursue **A**, never **C**, and treat **B** as separate product decisions. For A, pick scope:

| Option | Scope | Effort |
|---|---|---|
| **A1 (recommend)** | **Measure only**: wire the sighting panel + a Height readout/stat + "Continue to Plan" CTA + result state. Height-only (no IA change). Highest-visibility gap, self-contained. | small–med |
| **A2** | A1 **+** align Plan & Simulate *result* states/visuals closer to the comps (they already have the map/side-view; this is polish + populated states). | med |
| **A3** | A2 **+** IA rework so DBH/Lean are captured on Measure to match the tile row exactly. | larger; touches the Measure/Plan seam |

Each A option:
- Reuses the existing tokens; **no new dependency**.
- Changes **presentation only** — no `src/engine/**`, no constant, no referral gate.
- Must keep every safety invariant: persistent SafetyBanner, referral takeover shows no cut
  specs, danger radius reads as danger, **no detection/authorization affordance introduced**.
- **Safety-auditor reviews the result** (mandatory here precisely because we're moving toward
  the mockups, some of which are unsafe — the auditor confirms we took only the A bits).

## Verification (whatever A scope)
- Screens render closer to `design/screens/*` for the **A** items; visual check in the
  simulator + browser.
- `lint` / `test` / `test:e2e` stay green; existing safety e2e (referral hides specs,
  banner persistent, area-clear non-gating) unchanged.
- Auditor signs off that **no C element** crept in.

---

### Sign-off
- [x] Acknowledged the A/B/C split — **C (danger-zone scanner + "begin cut") intentionally
  NOT built** for safety — Daniel, 2026-06-16
- [x] Scope chosen: **A2** (Measure + Plan/Sim polish) — Daniel, 2026-06-16
- [x] **B** (weight, tree IDs, risk rows) stays **v2**
- [x] Implemented, **safety-auditor APPROVED**, gates green, browser-verified — see close-out

---

## Close-out record (2026-06-16)

**Built (A2, presentation-only — no engine/constant/gate change):**
- **Measure:** new `components/SightPanel.tsx` sighting viewfinder (a *styled illustration,
  not AR/camera* — honestly labeled) that reflects the **real** measured height ("LINE UP
  THE SIGHT" → "HEIGHT CAPTURED"); result shown as a Height stat tile + "± ΔH · worst case"
  meta; a **"Continue to Plan"** CTA (threaded via a new `MeasureScreen onContinue` prop
  from `App.tsx`). No fabricated DBH/lean (not measured here).
- **Simulate:** Fall-direction / Fall-length / **Danger-radius** stat tiles — real engine
  values only. Deliberately **no** "time to ground" (the sim models no fall time) and **no**
  "Begin cut sequence" (bucket C).
- **Plan:** an at-a-glance Direction / Notch / Hinge summary tile row above the existing
  detailed CutCard (same engine values it expands).
- `e2e/helpers.ts` `fillMeasure` updated for the new stat-tile readout markup.

**Not built (confirmed):** the `04-danger-zone` detection/lockout screen and the "Begin cut
sequence" CTA — bucket **C**, posture-forbidden. The DB-6 area-clear **attestation** (the
sanctioned, non-gating version) remains unchanged.

**Safety-auditor: APPROVE** (2026-06-16), no required changes. Confirmed: zero C-creep
(no detection/authorization/lockout), every displayed number is a real engine output, the
viewfinder is honestly labeled, and the SafetyBanner / referral takeover / worst-case-height
invariants are intact. Optional copy nit applied: "HEIGHT LOCKED" → "HEIGHT CAPTURED" (keeps
"lock" vocabulary out of the tool).

**Gates:** `lint` clean · `test` **125** · `test:e2e` **16** · browser-verified all three
screens at mobile width.

> Reminder for the record: a meaningful part of the original design (the danger-zone
> scanner, "begin cut") was **never** appropriate to build — the app diverging from those
> mockups is the safety posture working as intended, now documented here.

> Nothing built yet — this is the scope for your direction. The single most important line
> in this brief: **we should not chase the danger-zone / begin-cut mockups; the app looking
> different there is the safety posture working as intended.**
