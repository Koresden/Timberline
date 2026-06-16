# DB-7 — Native iOS wrapper (Capacitor) to run in Xcode

**Phase:** new track (native delivery) · **Author:** orchestrator
**For approval by:** Daniel · **Safety sign-off:** safety-auditor (posture confirm)
**Status:** ✅ APPROVED by Daniel (2026-06-16) — Capacitor + 3 deps, SW disabled in native, first step = simulator boot. Implementing.

Goal: open and run Timberline as a **native iOS app in Xcode** (simulator + device).
Timberline is a pure client-side Vite/React PWA with **no native target today**, so this
needs a wrapper. The standard, lightest option is **Capacitor** — it loads the existing
built `dist/` web app inside a native WKWebView shell and generates an `ios/` Xcode project.

Per the project rule (**no new deps without a brief**) and because a native wrapper touches
the "fully client-side PWA" posture, this is a decision, not a one-liner.

---

## Environment (verified on this machine)
- **Xcode 26.5** (full, at `/Applications/Xcode.app`) ✓ · **1 iOS simulator runtime** ✓
- **CocoaPods** installed but the terminal locale isn't UTF-8 → `pod install` needs
  `LANG=en_US.UTF-8` exported, else it errors. Fixable, flagged.
- Node v25. The web app already builds (`npm run build` → `dist/`).

## What Capacitor adds
- **Deps:** `@capacitor/core` (runtime, ships in the app), `@capacitor/cli` +
  `@capacitor/ios` (dev). 3 packages — the gate this brief exists for.
- **`capacitor.config.ts`** — `appId`, `appName`, `webDir: 'dist'`.
- **`ios/`** — a committed Xcode project (`App.xcworkspace`, CocoaPods).
- **Build flow:** `npm run build` → `npx cap sync ios` → open `ios/App/App.xcworkspace` →
  Run on the simulator. (A `cap:ios` npm script wraps build+sync+open.)

---

## Two real technical wrinkles (decide before we build)

**1 — The service worker (DB-5) vs the native WebView.** Inside Capacitor, the app is
served from a local scheme and is **already fully offline** from the bundled assets — the
SW becomes redundant and can *conflict* (double caching, plus the `autoUpdate`/stale-logic
model no longer applies: native updates ship via **TestFlight/App Store**, not SW
relaunch). **Recommendation:** disable the SW in the native build (Capacitor can skip
registration / we gate `injectRegister`), and treat App-Store versioning as the
"which-safety-logic" signal there. The DB-5 build stamp still renders. *Net: the DB-5
offline guarantee is preserved by a different mechanism in the native shell.*

**2 — The clinometer sensor (`useDeviceOrientation`).** iOS 13+ gates
`DeviceOrientationEvent` behind a user-gesture permission. In a WKWebView this can behave
differently than Mobile Safari — it may need `@capacitor/motion` or an Info.plist
motion-usage string, and the existing iOS permission-prompt flow must be re-validated on
device. **This is the one feature most likely to need follow-up work** after the shell
boots. The app already has a manual-entry fallback, so it degrades safely if sensors are
unavailable. *Validate on a real device; simulator can't produce tilt.*

## Safety posture — unchanged (auditor to confirm)
This is a **delivery wrapper**: same web app, same engine, same constants, same persistent
SafetyBanner and referral gates. No `src/engine/**`, no safety constant, no gate is
touched. The auditor should confirm the wrapper introduces no "override" affordance and
that the banner + referral behavior render identically in the WebView.

---

## Alternative considered (so the cost is honest)
**Stay a PWA — "Add to Home Screen."** Zero new deps; already installable with standalone
chrome (DB-0 manifest) and offline (DB-5 SW). It gives ~80% of "an app on the phone"
**today**. Capacitor is worth its toolchain cost **only if** the goal is **App Store / TestFlight
distribution** or **deeper native integration** (reliable sensors, native plugins). If the
goal is just "see it running like an app," the PWA route needs no brief and no `ios/`.

> **Question for Daniel:** is the goal **App Store / native distribution** (→ Capacitor,
> this brief), or **"run it like an app to try it"** (→ PWA Add-to-Home-Screen, no deps)?

## Decisions
1. **Approve Capacitor** + the 3 deps, and committing the `ios/` project? (recommend yes
   *if* native distribution is the goal)
2. **Service worker in native build:** disable it in the wrapper (recommend), keeping the
   web PWA build unchanged.
3. **Scope of this first step:** boot the shell on the **simulator** and confirm the app +
   SafetyBanner render. Sensor (clinometer) validation on device is a **follow-up**, not
   part of "launch."

## Verification (what "launched" means here)
- `npm run build && npx cap sync ios` clean; `App.xcworkspace` opens in Xcode 26.5.
- App boots on the iOS simulator; **SafetyBanner visible**, Measure screen renders, manual
  plan flow works. (Tilt sensor deferred to on-device follow-up.)
- Existing web gates stay green (the wrapper doesn't change the web app).

## Cost / risk / reversibility
- Adds a native toolchain surface (Xcode project, CocoaPods, eventual signing for device).
- Fully reversible: remove the deps + `ios/` + `capacitor.config.ts` → back to pure PWA.
- Low code risk (no app logic change); the real unknowns are SW-in-WebView and sensor perms.

---

### Sign-off
- [x] Goal confirmed: **App Store / native** (Capacitor) — Daniel, 2026-06-16
- [x] Decision 1 — Capacitor + 3 deps + committed `ios/` — approved
- [x] Decision 2 — service worker disabled in the native build — approved
- [x] Decision 3 — first step = simulator boot; sensor validation a follow-up — approved
- [ ] Safety-auditor confirms the wrapper preserves the posture (banner/gates/no override)
  — **pending**; the only posture-adjacent change is the banner safe-area padding, which
  strictly *improves* visibility (see close-out)
- [x] Implemented: installed, `cap add ios`, synced, opened in Xcode, **booted on the simulator**

---

## Close-out record (2026-06-16)

**Shipped (native delivery, Capacitor 8.4):**
- Deps: `@capacitor/core` (runtime), `@capacitor/cli` + `@capacitor/ios` (dev).
- `capacitor.config.ts` (`appId: com.timberline.app`, `webDir: dist`); committed `ios/`
  Xcode project (Capacitor 8 uses **Swift Package Manager**, not CocoaPods — the UTF-8/pod
  caveat was moot). `ios/.gitignore` excludes build artifacts + the copied web bundle.
- **SW disabled in native** via `VitePWA({ disable: !!process.env.TIMBERLINE_NATIVE })`.
  `npm run build:native` confirmed: **no `sw.js`** in the native bundle; the web build is
  unchanged and **still emits `sw.js`** (web PWA intact).
- Scripts: `build:native`, `ios:sync`, `ios:open`, `ios:run`.

**Launched & verified:** `xcodebuild` compiled and deployed to the **iPhone 17 Pro
simulator** (iOS sim); the app boots, the **SafetyBanner is fully visible**, the Measure
screen + stepper + unit toggle + manual inputs render. Xcode opened on the project.

**One fix made during launch (posture-relevant):** the SafetyBanner was initially clipped
under the iOS status bar (the WebView extends under it). Since the banner MUST always be
fully visible (HANDOFF §1), added a top **safe-area inset**
(`padding-top: calc(10px + env(safe-area-inset-top))`) to `.safety-banner`. This strictly
improves visibility and is a **no-op on the plain web** (env() = 0). Flagged for the
safety-auditor, but it strengthens — never weakens — the posture.

**Open follow-ups (not part of "launch"):**
- **Clinometer sensor on device** — `DeviceOrientationEvent` perms differ in WKWebView;
  the simulator can't produce tilt. Validate on a real device; may need `@capacitor/motion`
  + an Info.plist motion-usage string. Manual entry is the safe fallback meanwhile.
- App icon / splash, signing for on-device + TestFlight, App Store metadata.

**Web gates (unchanged by the wrapper):** `lint` clean · `test` **125** · `test:e2e`
**16** · web `build` ✓ (`sw.js` present). No `src/engine/**`, constant, or referral-gate
change; the only source edit is the banner safe-area padding.

> Nothing installed yet. If the goal is just to *see it running like an app*, say so and I'll
> skip all of this and stand up the PWA instead.
