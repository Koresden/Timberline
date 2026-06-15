# DB-6 — Manual area-clear reminder (attestation, not a gate)

**Phase:** post-v1 follow-up #2 (from DB-4) · **Author:** orchestrator
**For approval by:** Daniel · **Safety sign-off:** safety-auditor (copy + guardrails)
**Status:** ⬜ AWAITING APPROVAL

This is the last of the three DB-4 follow-ups. DB-4 Decision 2 endorsed a **human
attestation** — "I've walked and cleared the 2× danger radius" — surfacing the danger
radius and the two escape routes at the decision point, **with hard guardrails**. This
brief turns that into a concrete, reviewable design before any code.

> ⚠️ **Naming.** DB-4 called it a "gate," but the auditor's own guardrails forbid it from
> *gating* anything. A gate that unlocks cut specs would drift toward **authorization** —
> which the safety posture forbids (CLAUDE.md §1). So this ships as an **area-clear
> reminder / attestation**, never a gate. The brief uses that name deliberately; please
> confirm we are not building a precondition.

---

## The hard guardrails (from DB-4 / the auditor) — fixed, not up for debate

1. **Never implies detection.** The app cannot see the site. Copy must read as *"you
   confirm,"* never *"area is clear."*
2. **Never gates or unlocks anything.** Cut specs are already visible and **stay** visible
   whether or not the box is checked. The attestation is not a precondition for anything.
3. **Additive friction only.** Its entire purpose is to slow the operator down at the
   danger-zone step and re-state the radius + escape routes.
4. **Not persisted, not dismissable.** It cannot be permanently turned off, and a check is
   **never remembered** — every new plan and every session starts unchecked. You re-affirm
   each time, because the area must be re-walked each time.
5. **Re-affirms the worst-case radius.** It shows the same `2 × (H + ΔH)` danger radius the
   cut card already displays — reusing the engine value, never recomputed.

---

## What already exists (so this is purely additive)

- `dangerRadiusM = DANGER_RADIUS_HEIGHT_MULT × heightM`, where `heightM` is the worst-case
  `H + ΔH` (`plan.ts:249`, `worstCaseHeight.ts`). Carried on **both** `ActionablePlan` and
  `ReferralPlan` (`types.ts:62,81`).
- `escapeAzimuths: [number, number]` (~45° back from the fall line) on `ActionablePlan`
  (`types.ts:79`), already drawn by `EscapeCompass` inside the CutCard's **"Escape & danger
  zone"** step (`CutCard.tsx`, step 4).

The reminder reuses these exact values — **no engine change, no new constant, no new
dependency.** A new presentational component only.

---

## Decision 1 — Placement

| Option | Notes |
|---|---|
| **A. In the CutCard "Escape & danger zone" step, actionable plans only** *(recommend)* | Lands exactly where the radius + escape compass already are, at the moment the operator is reading how to retreat. Scoped to `verdict: 'ok' | 'caution'` — the only states with cut specs. |
| **B. Also on the referral takeover** | **Rejected.** A referral says *consult a professional / no cut specs*. Putting "I cleared the area" there implies "…so I can proceed," which contradicts the referral and edges toward authorization — a guardrail-1/2 violation. The referral keeps showing the radius as information only, with no attestation. |
| **C. On the Simulate screen too** | Deferred. One canonical location avoids a second copy drifting. Sim already shows the danger ring; it can link attention to the Plan step rather than duplicate the attestation. |

**Recommendation: A.** Single location, co-located with the escape guidance, actionable
plans only.

## Decision 2 — Does checking it *do* anything?

| Option | Notes |
|---|---|
| **A. Pure ephemeral acknowledgement** *(recommend)* | The checkbox holds **local component state only** (no store, no storage). Checking it reveals a short, calm re-affirmation ("Re-walk and re-check before *every* cut"). It changes nothing else — specs were and remain visible. Resets on remount / new plan / reload. |
| **B. Static checklist line, no interactivity** | Even simpler, but loses the deliberate physical "tick to acknowledge" friction the auditor wanted. |
| **C. Anything that toggles spec visibility / enables a button** | **Forbidden** by guardrail 2. Listed only to name it as out of scope. |

**Recommendation: A** — ephemeral, non-gating, self-resetting.

## Decision 3 — Copy ✅ **safety-auditor APPROVED-WITH-CHANGES (2026-06-15)**

Final, auditor-vetted copy. Attestation-voiced throughout (guardrail 1), re-states the
worst-case radius (guardrail 5). `{R}` = the existing `dangerRadiusLabel`; `{e1}`,`{e2}` =
`escapeAzimuths`. **Ship this verbatim** — the heading and checkbox label below are the
auditor's exact wording.

> **You are responsible for clearing the danger zone.**
> This app can't see your site. Walk the full **{R}** radius (2× the tree's worst-case
> height) and move people, pets, and equipment out of it. Confirm both escape routes —
> **{e1}° / {e2}°**, ~45° back from the fall line — are clear and walkable.
>
> ☐ *I have personally walked the full {R} radius and moved people, pets, and equipment
> out of it — and I will re-walk it before every cut.*
>
> *(On check:)* Re-walk and re-check before **every** cut. This reminder never counts as
> the area being clear — only your eyes on the ground do.

**Auditor's two required changes (vs. the original draft), now applied:**
1. **Heading** — was "Before you cut — clear the danger zone yourself." The "before X →
   then cut" cadence could read as the app *granting permission*. Now names the human as
   sole actor with no permission rhythm.
2. **Checkbox label** — was "I have personally walked and cleared the {R} danger zone." A
   ticked "I have cleared…" box reads, in an incident review, as a **clearance record** —
   the human asserting a world-state the app then visually endorses. Reworded to
   first-person *action* only ("walked," "moved," "will re-walk"), claiming no end-state,
   and front-loads the re-walk-every-cut obligation so it shows even if the box is never
   ticked.

**Auditor ruled (c) — do NOT restate raw metres.** `{R}` already carries the user's active
unit; a second figure invites unit confusion. The "(2× the tree's worst-case height)"
gloss conveys the derivation with one number. Keep one number.

---

## Seam (designed before implementation)

- **New presentational component** `src/components/AreaClearReminder.tsx` — props:
  `dangerRadiusLabel: string`, `escapeAzimuths: [number, number]`. Holds one piece of
  local `useState` (checked) and renders the copy above. **No** store, **no** storage,
  **no** engine import. Presentational-layer only (CLAUDE.md layout rules).
- **Consumed by** `CutCard` inside step 4, beside `EscapeCompass`, passing the values the
  card already has. CutCard's interface gains nothing it doesn't already hold.
- **No change** to `engine/**`, constants, the referral path, or the SafetyBanner.
- **Stays visually subordinate to the SafetyBanner** (auditor): quieter than or equal to
  it, never a headline — it's the operator's own checklist, not an authority.

### Auditor's three residual-gate fences (carry into the build ticket)
1. **No `disabled`/`aria-disabled`/visibility/styling coupling to `checked`.** Nothing —
   not the spec fields, not Simulate navigation, not any "proceed" affordance — may
   respond to the checkbox state. The moment something does, it's a gate.
2. **No completion/success styling and no telemetry on the check.** The on-check reveal is
   a calm re-affirmation only — no green "done" state, no checkmark-complete affordance
   that frames ticking as "unlocking" or "passing."
3. **`checked` stays local `useState`, never lifted to the plan store / storage.** A
   one-line code comment must say so — if it ever moves to shared/persisted state,
   guardrail 4 breaks silently.

## Verification plan
- Component renders the worst-case `dangerRadiusLabel` and both escape azimuths verbatim
  from the plan (no recomputation).
- **e2e:** on an actionable fixture, the reminder is visible, starts **unchecked**, the cut
  specs are visible **both before and after** checking (proves non-gating), and a reload
  re-renders it **unchecked** (proves not persisted).
- **e2e (auditor):** the **Simulate entry point is reachable with the box unchecked**
  (proves no de-facto gate on navigation).
- **e2e:** a referral fixture shows **no** attestation (Decision 1B).
- `lint` / `test` / `test:e2e` green. ✅ Safety-auditor copy + guardrails signed off
  (2026-06-15); sign-off is conditional on the two copy changes landing verbatim and the
  non-gating e2e assertions above being present before ship.

## Cost / risk
- Small additive UI; no dep, no engine/constant/gate change; fully reversible.
- The real risk is **scope creep into a real gate** — explicitly fenced off by guardrail 2,
  Decision 2C, and the three auditor fences above; re-checked by the auditor.

---

### Sign-off
- [x] Decision 3 — copy + guardrails **APPROVED-WITH-CHANGES by the safety-auditor**
  (2026-06-15); the two required changes are applied verbatim above
- [x] Decision 1 — placement (A: CutCard step 4, actionable only) — **Daniel, 2026-06-15**
- [x] Decision 2 — behavior (A: ephemeral, non-gating, self-resetting) — **Daniel, 2026-06-15**
- [x] Confirmed: **reminder/attestation, not a gate** (no precondition) — **Daniel, 2026-06-15**
- [x] Built + wired + e2e + gates + browser-verified — see close-out below

---

## Close-out record (2026-06-15)

**Shipped:** `src/components/AreaClearReminder.tsx` — presentational, local `useState` only,
no store/storage/engine import. Wired into `CutCard` step 4 beside `EscapeCompass`, passing
the card's existing `dangerRadiusLabel` + `plan.escapeAzimuths`. Copy is the auditor's
approved wording verbatim. CSS `.area-clear*` is deliberately quiet — subordinate to the
SafetyBanner, no success/"done" styling. All three auditor fences honored (no
`checked`-coupling to any element; no completion styling/telemetry; `checked` stays local,
with a code comment saying so).

**e2e** (`e2e/area-clear.spec.ts`, 4 specs, all green):
- Reminder shows on an actionable plan, starts unchecked; **cut specs visible both before
  and after** checking (non-gating); checking reveals only the muted re-affirmation.
- **Simulate reachable with the box unchecked** (no navigation gate) — auditor's assertion.
- **Not persisted:** after a full reload + re-submit, the box is unchecked again.
- **No attestation on a referral** (info-only) — it never implies "clear it and proceed".

**Browser-verified** (mobile 375px): renders as a quiet card under the escape compass,
worst-case radius **29.8 m** matches the cut card / compass / sim ring, escape routes
315°/45°; checked state reveals the re-affirmation with no green success treatment; no
console errors.

**Gates:** `lint` clean · `test` **125** · `test:e2e` **16** (incl. 4 area-clear) ·
`build` ✓. No engine, constant, referral-gate, or SafetyBanner change.

> All three DB-4 follow-ups are now complete: (1) PWA offline SW, (3) hinge rounding,
> (2) area-clear reminder.
