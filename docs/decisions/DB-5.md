# DB-5 — Offline service worker (PWA completion)

**Phase:** post-v1 follow-up #1 (from DB-4) · **Author:** orchestrator
**For approval by:** Daniel · **Status:** ⬜ AWAITING APPROVAL

This is the "one-line brief" promised by **DB-0 Decision 3** and queued first in the
DB-4 follow-up order. It closes the last open part of the **offline-capable PWA**
requirement (HANDOFF §1). The manifest + mobile chrome already shipped in the DB-0
"PWA-lean" step; **only the service worker is missing.**

The single ask: **add one runtime-affecting build dependency, `vite-plugin-pwa`**, to
generate an offline service worker. Per the no-new-deps rule, it gets this brief.

---

## What exists today

- `public/manifest.webmanifest` + theme/viewport/apple meta in `index.html` (installable,
  correct standalone chrome). ✅
- Self-hosted fonts in `public/fonts/`, `public/icon.svg`. ✅
- **No service worker** → the app does **not** actually load offline yet. ❌

Everything is client-side (no backend, no accounts), so "offline" just means *precache
the app shell and serve it back* — there are no API responses to cache or reconcile.

---

## Decision — add `vite-plugin-pwa` and precache the shell

| Option | Notes |
|---|---|
| **A. `vite-plugin-pwa` (Workbox under the hood)** | The de-facto Vite PWA plugin. Generates the SW + precache manifest at build, wires registration, integrates with the existing `manifest.webmanifest`. One dep to us; pulls `workbox-*` as **build-time** transitive deps (they don't ship to the client — only the generated SW does). |
| **B. Hand-rolled service worker** | Zero deps, but we'd hand-maintain the precache list and cache-busting on every asset hash change — exactly the stale-asset footgun DB-0 wanted to avoid, and a poor fit for a **safety** tool where serving stale logic is a real hazard. |
| **C. Stay manifest-only** | Leaves the §1 offline requirement unmet. Rejected — offline is a v1 requirement, only deferred, not waived. |

**Recommendation: A.** It's the dependency DB-0 already earmarked for exactly this step.

### Proposed configuration
- **`registerType: 'autoUpdate'`** — on each app load, a new SW takes over and the next
  navigation runs the latest assets. For a safety tool this is the safer default: it
  minimizes the window where a user runs **stale safety logic** offline. (See the safety
  note below — this is the one point I want the auditor to confirm.)
- **Precache the full shell**: built JS/CSS/HTML + `manifest.webmanifest`, `icon.svg`,
  and **all `public/fonts/*`** so the app is fully styled offline, not just functional.
- **Navigation fallback** to `index.html` (SPA) so a cold offline launch resolves.
- **No runtime/API caching strategy** — there are no network requests to cache.
- **Dev:** leave the SW disabled in `vite dev` (`devOptions.enabled: false`) to keep the
  Phase-2/3 stale-asset friction DB-0 worried about out of the dev loop entirely.

---

## Safety angle (flag for the safety-auditor — DB-4 posture)

An offline-cached safety tool can serve **outdated safety logic**: if a locked constant
or referral gate is ever corrected, a user offline on an old cached build keeps getting
the old advice. `autoUpdate` shortens that window (latest assets on next launch with
connectivity) but cannot eliminate it. Two things I'd want the auditor to sign off on
before this ships:
1. `autoUpdate` (not `prompt`) is the right update posture for this tool.
2. Whether a small **"app version / last updated"** line belongs somewhere unobtrusive so
   a user can tell which build's logic they're holding. (Leaning yes; cheap, honest.)

No referral gate, locked constant, or engine code changes in this work — it's pure
delivery/caching. The persistent SafetyBanner and all gates are unaffected.

---

## Verification plan (what "done" means)

- `npm run build` emits `sw.js` + a precache manifest covering shell + fonts.
- **qa:** a Playwright spec loads the app, registers the SW, then reloads **offline**
  (`context.setOffline(true)`) and asserts Measure renders + SafetyBanner present.
- `npm run lint` / `npm run test` / existing e2e stay green.
- Re-run `npm audit` and record any new advisories from the Workbox chain in the log
  (DB-0 already tracks the esbuild dev-server one).

## Cost / risk
- **+1 dep we own** (`vite-plugin-pwa`) + its build-time Workbox chain (not shipped to client).
- Risk is the classic SW one — stale assets — mitigated by `autoUpdate` + dev-disabled SW.
- Fully reversible: removing the plugin + SW returns to today's manifest-only state.

---

### Sign-off
- [ ] Approve adding `vite-plugin-pwa` (Option A) with the config above
- [ ] Safety-auditor confirms `autoUpdate` posture + version-stamp question
- [ ] On approval: install, wire config, add the offline e2e spec, run all gates, log results

> I have **not** installed anything yet — awaiting your check on this brief.
