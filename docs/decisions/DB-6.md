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

## Decision 3 — Copy (draft — **safety-auditor vets before ship**)

Proposed, deliberately attestation-voiced (guardrail 1) and re-stating worst-case radius
(guardrail 5). `{R}` = the existing `dangerRadiusLabel`; `{e1}`,`{e2}` = `escapeAzimuths`.

> **Before you cut — clear the danger zone yourself.**
> This app can't see your site. Walk the full **{R}** radius (2× the tree's worst-case
> height) and move people, pets, and equipment out of it. Confirm both escape routes —
> **{e1}° / {e2}°**, ~45° back from the fall line — are clear and walkable.
>
> ☐ *I have personally walked and cleared the {R} danger zone.*
>
> *(On check:)* Re-walk and re-check before **every** cut. This reminder never counts as
> the area being clear — only your eyes on the ground do.

**Note for the auditor:** confirm (a) the box label is attestation-voiced, not
state-voiced; (b) nothing here can be read as the app asserting the area is clear or
granting permission; (c) whether the danger radius should also restate the raw metres
(it inherits the user's unit via `dangerRadiusLabel`).

---

## Seam (designed before implementation)

- **New presentational component** `src/components/AreaClearReminder.tsx` — props:
  `dangerRadiusLabel: string`, `escapeAzimuths: [number, number]`. Holds one piece of
  local `useState` (checked) and renders the copy above. **No** store, **no** storage,
  **no** engine import. Presentational-layer only (CLAUDE.md layout rules).
- **Consumed by** `CutCard` inside step 4, beside `EscapeCompass`, passing the values the
  card already has. CutCard's interface gains nothing it doesn't already hold.
- **No change** to `engine/**`, constants, the referral path, or the SafetyBanner.

## Verification plan
- Component renders the worst-case `dangerRadiusLabel` and both escape azimuths verbatim
  from the plan (no recomputation).
- **e2e:** on an actionable fixture, the reminder is visible, starts **unchecked**, the cut
  specs are visible **both before and after** checking (proves non-gating), and a reload
  re-renders it **unchecked** (proves not persisted).
- **e2e:** a referral fixture shows **no** attestation (Decision 1B).
- `lint` / `test` / `test:e2e` green; safety-auditor signs off the final copy.

## Cost / risk
- Small additive UI; no dep, no engine/constant/gate change; fully reversible.
- The real risk is **scope creep into a real gate** — explicitly fenced off by guardrail 2
  and Decision 2C, and re-checked by the auditor.

---

### Sign-off
- [ ] Decision 1 — placement (recommend A: CutCard step 4, actionable only)
- [ ] Decision 2 — behavior (recommend A: ephemeral, non-gating, self-resetting)
- [ ] Decision 3 — copy approved **by the safety-auditor** (draft above)
- [ ] Confirm we are building a **reminder/attestation, not a gate** (no precondition)
- [ ] On approval: build the component + wire into CutCard, add the e2e, run gates, log

> Nothing built yet — this is the design for your check. The safety-auditor vets the final
> copy and confirms the guardrails before it ships; per project rule, the auditor's
> position wins any disagreement.
