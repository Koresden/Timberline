# App Store Listing Copy — Timberline

> Draft listing text for App Store Connect. **The listing is a safety posture surface**
> (DB-10 §6): every claim here must be true of the shipped *planning-aid* scope and must never
> imply detection, authorization, or lockout. **safety-auditor sign-off required before this
> ships** (see bottom). Char limits noted are Apple's.

---

## App name (≤30)
`Timberline` (10)

## Subtitle (≤30)
`Tree-felling planning aid` (25)

## Promotional text (≤170, editable anytime)
A planning aid for felling: estimate height, think through the cut and the fall zone, and see the
danger radius — offline. Not a substitute for training or an arborist.

## Description (≤4000)
Timberline is an offline **planning aid** for felling a tree. It helps a trained operator think
through a fell before any saw touches wood — it does **not** authorize the cut, decide when it's
safe, or sense the worksite.

It assumes you are an experienced operator wearing proper PPE, and it is honest about its
limits. Measurements are estimates with an error band, not instrument-grade readings. For trees
that are large, heavily leaning, dead or compromised, or near structures, power lines, or roads,
Timberline recommends a **professional arborist** and drops to information-only — it stops
showing cut specs.

THREE MODULES
• Measure — estimate tree height with a clinometer (device tilt) or by entering angles by hand;
  every height carries a ± error band, and the worst case is what drives the danger zone.
• Plan — a suggested cut for a trained operator: notch type and angles, hinge dimensions, back
  cut, the achievable felling direction, two escape routes, and the 2× tree-height danger
  radius. Every recommendation shows the reasoning behind it.
• Simulate — a simple top-down fall corridor and danger circle, plus a side-view fall arc, so
  you can sanity-check the plan against obstacles before you commit.

WHAT IT IS NOT
• It does not detect people, animals, or objects — a phone cannot sense your worksite, and
  Timberline never claims to. Walking and clearing the danger zone is your job, on foot.
• It does not tell you it's "safe to cut" or give a go-ahead. There is no authorization, no
  lockout, and no "override safety" setting anywhere.
• It is not augmented reality and not a camera measurement — the sighting panel is a styled
  illustration of a real, computed reading.
• It does not replace training, an arborist, or local law and OSHA-style practice. You remain
  responsible for the fell.

BUILT FOR THE FIELD
• Fully offline — no account, no backend, no tracking, no data collected.
• Works in metric or imperial.

Felling trees is dangerous. Timberline is a thinking tool, not a license to fell.

## Keywords (≤100, comma-separated)
`tree felling,clinometer,tree height,arborist,fall line,notch,hinge,felling plan,forestry,offline`

## What's New (v1.0 release notes)
First release. Measure tree height (clinometer or manual), plan the cut with escape routes and
the danger radius, and simulate the fall corridor — all offline. A planning aid for trained
operators; not authorization.

## Category & rating
- **Primary category:** Utilities. (Optional secondary: Reference.) Never Medical or a
  safety/compliance/authorization-device category.
- **Age rating:** 17+ / highest adult band — an adult, trained-operator tool.

## Screenshots (plan — honest states only)
Capture at 6.9-inch iPhone size (1290×2796 or 1320×2868). Show only real, shipped states:
1. **Measure** — the sighting viewfinder *illustration* with a captured Height stat and its
   "± ΔH · worst case" band. (Caption must not call it AR or imply detection.)
2. **Plan — cut card** — notch / hinge / back cut + the two escape routes and the danger radius.
3. **Plan — referral takeover** — the "consult a professional arborist / information only" state
   (shows the app refusing to give cut specs). This is a *feature*, show it.
4. **Simulate** — the top-down fall corridor + **danger** circle, read clearly **as danger**.
5. Any screen showing the **persistent SafetyBanner** ("planning aid, not authorization").

**Forbidden in any screenshot or caption** (DB-8 bucket C): the `04-danger-zone` "live area
scan" / "person in danger zone" / "1 breach" / "felling locked until clear" mock, any "begin
cut sequence" CTA, or relabeling the danger radius as "clear" / "safe". These were intentionally
never built; depicting them would advertise a product that must not exist.

---

### Forbidden-claims checklist (must stay TRUE across name/subtitle/promo/description/keywords)
- [x] No "detects people / live area scan / person in danger zone / N breach"
- [x] No "tells you when it's safe to cut / go-ahead / go-no-go authorization"
- [x] No "felling locked until clear / unlocks felling" lockout language
- [x] No "begin cut sequence" or any cut-authorization affordance
- [x] No "guarantees a safe fall / prevents accidents"
- [x] No "OSHA-certified / approved / compliant"
- [x] No "replaces an arborist"
- [x] No "AR / camera detection" framing of the sighting panel
- [x] No "instrument-grade / precise / exact height" (it's an estimate with a band)
- [x] No "override / expert mode that bypasses referrals"

### safety-auditor sign-off
- [x] Auditor confirms the listing carries the posture and contains no forbidden claim — **APPROVE-WITH-CHANGES** (safety-auditor, 2026-06-29)

**Sign-off note (2026-06-29):** No forbidden claim found in name, subtitle, promo, description,
keywords, What's New, or the screenshot plan; the copy affirmatively states every non-negotiable
(planning aid not authorization, trained operator + PPE, professional-arborist referral to
information-only, estimate-with-error-band, no "override safety", operator stays responsible) and
the screenshot plan explicitly forbids the `04-danger-zone` scanner mock and never relabels the
danger radius as "clear"/"safe". Category (Utilities, never Medical) and rating (17+) match the
posture. Two Apple hard-limit fixes applied, neither weakening posture: (1) Promotional text was
188 chars (limit 170) and the 18-char overflow was the "…or an arborist" caveat itself — trimmed
to 168 chars (dropped the adjective "clear-headed" and the object "a tree"; the full
"Not a substitute for training or an arborist" caveat is preserved intact). (2) Keywords were 101
chars (limit 100) — changed "fall direction" to "fall line" (now 96 chars; equally accurate and
on-posture). No source files touched.
