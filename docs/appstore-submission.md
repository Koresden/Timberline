# App Store Submission Runbook (iOS)

> Companion to **DB-10**. Covers the human-only steps to get Timberline from the current
> Xcode project to TestFlight and the App Store. The agent-doable Bucket-1 work (branded
> icon/splash, Info.plist housekeeping, privacy manifest) is **already done and committed** —
> this runbook is what **you** (Daniel) do on a Mac with your Apple ID.
>
> ⭐ The signed build this produces is also what **un-parks DB-9** — once Timberline installs on
> a physical iPhone you can run the on-device clinometer validation.

---

## 0. What's already done (no action needed)
- **Branded app icon + splash** — generated from `public/icon.svg` into `Assets.xcassets`
  (`npm run -s assets` equivalent: `npx @capacitor/assets generate --ios`; sources in `assets/`).
- **Info.plist** — `ITSAppUsesNonExemptEncryption=false` (auto-answers export compliance);
  `UIRequiredDeviceCapabilities` = `arm64` (was stale `armv7`).
- **Privacy manifest** — `ios/App/App/PrivacyInfo.xcprivacy` (tracking false, nothing collected,
  no required-reason APIs) — wired into the Xcode target's Resources.
- **Identity** — bundle id `com.timberline.app`, name "Timberline", v `1.0` build `1`.

## 1. Prerequisites (one-time)
- **Apple Developer Program** — enroll with your Apple ID (~$99/yr, individual or organization;
  *not* the $299 enterprise program). Accept the latest Program License Agreement in App Store
  Connect — an unaccepted PLA silently blocks uploads.
- **A Mac with Xcode 16+** (iOS 18 SDK). This is the current upload floor (since Apr 24, 2025).
  ⚠️ **Re-check** Apple's *Upcoming Requirements* page right before submitting — the floor tends
  to rise each spring and may be higher than iOS 18 by the time you submit.

## 2. Signing (one-time, in Xcode)
1. `npm run ios:open` (runs `cap open ios`).
2. Select the **App** target → **Signing & Capabilities**.
3. Check **Automatically manage signing**, pick your **Team** (your Apple Developer account).
   Xcode registers the App ID `com.timberline.app` and mints the distribution certificate +
   App Store provisioning profile for you.
4. In **App Store Connect** → **Apps → +** → create the app record (same bundle id), pick the
   primary language and the SKU.

## 3. Build, archive, upload
1. Sync the latest web build into the native shell: `npm run ios:sync`
   (= `build:native` then `cap sync ios`; the native build correctly omits the service worker).
2. In Xcode, set the run destination to **Any iOS Device (arm64)**.
3. Set the **version** (`MARKETING_VERSION`) and **build** (`CURRENT_PROJECT_VERSION`) — see §6.
4. **Product → Archive**. When it finishes, the Organizer opens.
5. **Distribute App → App Store Connect → Upload** (or use Transporter / `xcrun altool`).
6. Wait ~5–15 min for processing; the build appears under **TestFlight**.

## 4. App Store Connect metadata
- **App Privacy (required before first submission):** answer **"No, we do not collect data
  from this app."** Timberline is fully offline, no accounts, no analytics; on-device-only
  processing is not "collection" per Apple → public label reads **Data Not Collected**.
- **Export compliance:** auto-answered by `ITSAppUsesNonExemptEncryption=false` (standard
  HTTPS/OS crypto only → exempt).
- **Category:** **Utilities** (primary). *Reference* is an acceptable optional secondary.
  **Never** Medical or any safety/compliance/authorization-device category (DB-10 §6).
- **Age rating:** **17+ / highest adult band** — a tool for adult, trained operators, never
  kid-suitable (it concerns chainsaw felling). Posture-driven (DB-10 §6).
- **Screenshots:** 1–10 per device family, PNG/JPG. Required size is **6.9-inch iPhone**
  (1290×2796 **or** 1320×2868 portrait); the 6.5-inch set (1242×2688 / 1284×2778) is the
  accepted fallback. Apple auto-scales the rest. **Honest states only — see
  `docs/appstore-listing.md` §Screenshots; never screenshot the `04-danger-zone` mock.**
- **Listing text** (name, subtitle, description, keywords, promo): use
  **`docs/appstore-listing.md`** (safety-auditor-approved).
- **Required URLs:** a **support URL** and a **privacy-policy URL** (both mandatory). For a
  no-data app the privacy policy is short ("Timberline collects no data…") but still needs to be
  hosted somewhere with a public URL.

## 5. TestFlight
- **Internal testing:** up to 100 internal testers (App Store Connect team Users, e.g. you) get
  the build immediately, **no review**. This is the fastest path to your iPhone for DB-9.
- **External testing:** create an external group, invite up to 10,000 via email or public link.
  The **first** external build needs a one-time **Beta App Review** (supply a beta description +
  "what to test"; usually cleared in ~a day).
- Each uploaded build **expires 90 days** after upload.

## 6. Versioning
- `MARKETING_VERSION` (e.g. `1.0`) and `CURRENT_PROJECT_VERSION` (e.g. `1`) live in
  `ios/App/App.xcodeproj/project.pbxproj` (and surface via `CFBundleShortVersionString` /
  `CFBundleVersion`). Each upload to App Store Connect needs a **unique, higher build number**
  for a given version; bump `CURRENT_PROJECT_VERSION` for every TestFlight/Store upload.

## 7. Privacy manifest maintenance
The app currently triggers **no** required-reason API (no `@capacitor/preferences`,
`@capacitor/filesystem`, etc.; state is local web storage). If you ever add such a plugin,
update `ios/App/App/PrivacyInfo.xcprivacy` → `NSPrivacyAccessedAPITypes` with the plugin's
category + Apple-approved reason code (e.g. UserDefaults `CA92.1`, FileTimestamp `C617.1`),
or App Store Connect will reject the upload (enforced since May 1, 2024).

## 8. Build hygiene note
`@capacitor/assets` is a **dev** dependency (build-time only; nothing ships in the app). Its
deep dependency tree raised some `npm audit` advisories — these are in build tooling, not in
the shipped binary. Safe to leave; do not `npm audit fix --force` (it can break the toolchain).
