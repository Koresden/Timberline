# DB-9 — On-device clinometer (native iOS tilt sensor)

**Phase:** DB-7 follow-up #1 (native sensor) · **Author:** orchestrator
**For approval by:** Daniel · **Safety sign-off:** safety-auditor (mandatory — touches the
measurement/sensor path)
**Status:** ⏸️ **APPROVED-BUT-DEFERRED (Option C / hold)** — Daniel, 2026-06-29. The analysis
and recommendation stand; **no code lands now**. Parked until a physical iPhone is available to
validate tilt accuracy + the `beta` sign convention (Gap B). Kept atomic on purpose: when
hardware arrives, the whole Option-A set (Info.plist key + hook hardening + the on-device
check) lands together rather than half-now/half-later. Meanwhile the shipped manual-entry +
stick-method paths already cover measurement safely.

DB-7 shipped the Capacitor iOS wrapper and **explicitly deferred** the on-device clinometer:
*"DeviceOrientationEvent perms differ in WKWebView; the simulator can't produce tilt. Validate
on a real device; may need `@capacitor/motion` + an Info.plist motion-usage string. Manual
entry is the safe fallback meanwhile."* (DB-7, "Open follow-ups"). This brief resolves that
deferral. It is grounded in a code audit of the current sensor seam, an inspection of the
native config, and **verified** external research (two independent adversarial fact-checkers
on the central claim).

---

## 1. The surprising headline (high confidence, primary sources)

**The native clinometer most likely already works in Capacitor 8.4 on iOS 15+ with zero code
change and zero new dependency.** The DB-7 worry was half-right and half-wrong:

- ✅ **Right:** a *bare* WKWebView does **not** behave like Mobile Safari — it does not expose
  `DeviceOrientationEvent.requestPermission` and does not fire `deviceorientation` on its own.
- ❌ **Wrong (the part that matters):** Capacitor is **not** a bare WKWebView. Capacitor
  *core* implements the iOS-15 WKUIDelegate hook
  `webView(_:requestDeviceOrientationAndMotionPermissionFor:initiatedByFrame:decisionHandler:)`
  and calls `decisionHandler(.grant)` **unconditionally** (ionic-team/capacitor PR #5317,
  confirmed against current `WebViewDelegationHandler.swift` on `main`). So inside our
  Capacitor 8.4 shell, device-orientation events **do** fire and are auto-granted (no native
  dialog) — provided the call originates from a user gesture, which our hook already enforces.

Our existing hook (`src/hooks/useDeviceOrientation.ts`) handles **both** WKWebView realities:
- If `requestPermission` is **absent** (the common WKWebView case) → `needsPermission=false`
  → status `'idle'` → `requestAccess()` takes the non-iOS branch (`:97`) and attaches the
  listener directly → Capacitor auto-grants.
- If `requestPermission` is **present** → status `'prompt'` → `requestAccess()` calls it
  (`:103`) → Capacitor resolves `.grant` dialog-free → attach.

Either path lands on a live `deviceorientation` listener. **No hook rewrite is required for
tilt to flow.**

### `@capacitor/motion` is NOT needed — and would be the wrong call
The official Motion plugin docs state it "is currently implemented using **Web APIs**"
(`DeviceMotionEvent`/`DeviceOrientationEvent`) — it is **not** native CoreMotion. It wraps the
exact same event source our hook already uses, so it adds **no reliability advantage**, while
adding one runtime dependency (which would itself need a dependency Decision Brief per
CLAUDE.md §Conventions-6). **Recommendation: do not add it.** This keeps `INV-NO-NEW-DEP`
trivially satisfied.

> **Sources (verified):** Capacitor `WebViewDelegationHandler.swift` (auto-grant) ·
> PR #5317 (the iOS-15 motion delegate) · Apple WKUIDelegate docs · Apple Dev Forums #125490
> (bare WKWebView lacks the prompt) · `capacitorjs.com/docs/apis/motion` ("implemented using
> Web APIs") · WebKit bug #213467 (NSMotionUsageDescription — see §2).

---

## 2. The two real gaps

### Gap A — `Info.plist` is missing `NSMotionUsageDescription` (config-only, do now)
The native `ios/App/App/Info.plist` has **no** motion-usage key of any kind (confirmed). Both
fact-checkers pushed back hard on the initial "optional/defensive" framing:
- WebKit bug **#213467**, WebKit engineer (youenn fablet): *"If NSMotionUsageDescription is not
  present, we should probably deny access."*
- PR #5317's own description ties the dialog-free grant to the key being present.
- App Store rejection reports cite missing usage-description text.

**Treat it as effectively required** for App Store review and on-device robustness. Adding it
is a **one-key, native-config-only** change to `ios/App/App/Info.plist` — strictly additive,
no behavior change on the web build, and it **survives `cap sync`** (`cap sync` will *not* add
it for us, and `Package.swift` is CLI-managed/do-not-edit, so the plist is the only place).

### Gap B — Unverified on real hardware (needs Daniel + a physical iPhone)
**The iOS Simulator cannot produce tilt**, so the one thing that actually matters — does the
captured `beta` equal the true sighting angle? — is unverifiable from this machine. **I cannot
drive a physical phone.** Two things must be checked on a real device:
1. **Sign / coordinate convention.** Our hook assumes "phone upright, tilt back → `beta`
   increases = angle above horizontal" (`useDeviceOrientation.ts:18-21`), and the engine's
   convention is that a base sighted *below* horizontal contributes positively
   (`measure.ts` / TangentForm hint `:178`). If the native WKWebView reports `beta` with a
   different sign/range than Mobile Safari, **captured angles could be silently wrong** — the
   single highest correctness risk in this track.
2. **Accuracy.** Sight an object of known height (or compare against a physical clinometer /
   a known 45° reference) and confirm `H` lands within the ±ΔH band.

This is a **measurement-correctness** check, not a code task — it is Daniel's to run on
hardware (ideally a brief session we do together: I prep the build, you read the device).

---

## 3. Proposed change set

| Option | Scope | Recommendation |
|---|---|---|
| **A (recommend)** | (1) Add `NSMotionUsageDescription` to `Info.plist`. (2) Defensive hardening of the sensor seam *only where native data can crash/mislead* — guard `null`/`NaN`/out-of-range `beta` so it degrades to manual, never a phantom angle (see below). (3) Ship an **on-device validation checklist** for Daniel. **No engine, no constant, no gate, no new dependency.** | ✅ |
| **B** | A **+** `@capacitor/motion`. | ❌ — web-API wrapper, no benefit, needs its own dep brief. |
| **C** | Defer — rely on manual entry, change nothing until hardware is in hand. | Fallback if no device is available soon. Manual entry + stick method already cover the sensorless case safely. |

### A's concrete edits (small, layered, reversible)
1. **`ios/App/App/Info.plist`** — add:
   `NSMotionUsageDescription` = *"Timberline uses your device's tilt sensor as a clinometer to
   estimate tree height. You can also enter angles by hand."* (honest, names the use, points
   at the fallback). *Owner: orchestrator/ui-dev. Native-config only.*
2. **`src/hooks/useDeviceOrientation.ts`** (+ test) — defensive guards, contract unchanged:
   - Drop readings where `beta`/`gamma` are `null` or `NaN` (keep last good value rather than
     pushing garbage downstream). The `DeviceOrientationState` shape stays **byte-for-byte
     identical** (`INV-ENGINE-PURITY-MATH`, no silent interface change).
   - Confirm capture cannot read `null.toFixed(1)` (latent: `TangentForm` capture reads
     `orientation.beta.toFixed(1)`; a `null` right after `'active'` would throw —
     `INV-SENSOR-GARBAGE-HANDLED`). *Owner: ui-dev. Pure UI/hook — no felling math added.*
   - **No smoothing/averaging in the hook.** Any sample math is engine territory and is out of
     scope here (`INV-ENGINE-PURITY-MATH`, `INV-ANGLE-ERROR-BAND`). The hook stays a thin
     side-effect boundary.
3. **On-device validation checklist** (`docs/decisions/DB-9.md` close-out, filled by Daniel):
   tilt streams · captured angle sign matches a known reference · `H` within ±ΔH · permission
   denial / sensorless device degrades to manual + stick · SafetyBanner stays visible during
   capture.

**Explicitly out of scope (would each need their own brief):** sensor-fused/auto-capture
"steady reading" UX, a sensor-derived *distance* (rangefinder), any `@capacitor/motion`
adoption, and — per DB-8 bucket C — anything resembling detection/authorization.

---

## 4. Safety invariants this work must not weaken (the gate)

The investigation extracted 14 invariants on the measurement/sensor path. The safety-auditor
checks **every one** before sign-off. Summary:

| ID | Invariant |
|---|---|
| INV-SENSOR-BANNER | SafetyBanner stays visible during *any* live capture/aim state — no full-screen takeover hides it. |
| INV-MANUAL-FIRST-CLASS | Manual angle entry stays always-available; capture is never sensor-only. |
| INV-STICK-FALLBACK | The no-sensor stick method stays reachable for sensorless devices. |
| INV-IOS-PERMISSION-GRACEFUL | Denied/unsupported degrades to manual/stick — never blank, frozen, or silent-zero. |
| INV-SI-INTERNAL | Sensor angles/distances stored in SI; convert only at the `useUnits` edge. |
| INV-ANGLE-ERROR-BAND | ±1° angle error always propagated; no "precise" reading shrinks/bypasses ΔH. |
| INV-DISTANCE-ERROR-BAND | ±2% distance error always propagated. |
| INV-WORSTCASE-HPLUS-DELTAH | Sim + Plan danger geometry always consume H+ΔH, never bare H. |
| INV-CONSTANTS-LOCKED | `ANGLE_ERROR_DEG` / `DISTANCE_ERROR_FRACTION` unchanged (this brief touches neither). |
| INV-ENGINE-PURITY-MATH | All trig/smoothing/error math stays in `src/engine`; the hook does none. |
| INV-SENSOR-GARBAGE-HANDLED | null/NaN/out-of-range readings never yield a NaN or absurd height shown as valid. |
| INV-NO-SENSOR-OVERRIDE | No "trust this reading"/"lock ±" affordance that suppresses the error band. |
| INV-NO-NEW-DEP | No new runtime dependency (satisfied — Option A adds none). |

**This brief changes no engine file, no safety constant, and no referral gate.** The only
source edit is presentational/sensor-plumbing (the hook) plus one native-config key.

---

## 5. Verification (before close-out)
- `lint` · `test` (incl. a new named test for the null/NaN-`beta` guard) · `test:e2e` stay
  green. Web `build` still emits `sw.js`; `build:native` still omits it (DB-7 invariant).
- `cap sync ios` → confirm `NSMotionUsageDescription` is present in the synced
  `ios/App/App/Info.plist` and the app still boots on the simulator (manual path intact).
- **On a real iPhone (Daniel):** the §2-B + §3-A.3 checklist — the only place tilt accuracy
  and the `beta` sign convention can actually be confirmed.
- **safety-auditor** signs off against all 14 invariants in §4 (mandatory — this touches the
  measurement path).

---

## 6. Risks & residual
- **`beta` sign mismatch on native** (highest): mitigated by the on-device sign check before
  any "the sensor works" claim; until then, manual entry is the trusted path.
- **Older iOS (<15):** the dialog-free auto-grant relies on the iOS-15 delegate. Capacitor 8's
  floor is modern iOS and the install base is overwhelmingly 15+, so low risk; on older iOS the
  worst case is a permission prompt or a fall to manual — never an unsafe reading.
- **Auto-grant is dialog-free but not always pixel-perfect** (a brief gray flash reported
  upstream) — cosmetic only.

---

### Sign-off (Daniel)
- [x] **Decision: Option C — hold/defer.** Approved in principle; implement nothing until a
  physical iPhone is available — Daniel, 2026-06-29
- [x] Acknowledge **Gap B** is the blocker: tilt accuracy + `beta` sign convention can only be
  validated on hardware (orchestrator cannot drive a phone) — this is *why* we hold
- [x] Confirm `@capacitor/motion` is **not** adopted (verified unnecessary)
- [ ] *(when un-parked)* Implement Option A + safety-auditor sign-off against the §4 invariants

**To un-park:** start a session with a physical iPhone in hand. Implement Option A (Info.plist
key + defensive hook guards + named null/NaN-`beta` test), prep/sync the native build, then run
the §2-B / §3-A.3 on-device checklist. Auditor signs off → close DB-9 complete.

---

> Nothing built yet — this is the scope for your direction. If you don't have an iPhone handy
> to validate on, say so and I'll either do the device-independent half now (Info.plist key +
> hook hardening + checklist, leaving the accuracy check pending) or hold the whole thing
> (Option C) until hardware is available.
