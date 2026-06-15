# Timberline — Component & redline spec

Developer reference for the screens in `Timberline App.dc.html`. All values are the **dark field theme**; substitute the matching token for light (see `src/index.css`). Token names below map 1:1 to the CSS variables.

> Conventions: sizes in `px`. "Hit target" = minimum tappable area, floor **48px** (`--hit`) for any gloved-use control. Radii reference `--radius-*` (sm 6 / md 10 / lg 16 / xl 22 / pill 999). Spacing references the 4→64 scale (`--space-1…8`).

---

## 1. Foundations

### Spacing scale
`4, 8, 12, 16, 24, 32, 48, 64` — screen gutter is **18px**; card internal padding **12–14px**; control gaps **8–10px**.

### Radius usage
| Element | Radius |
|---|---|
| Device screen | 40 |
| Cards / diagram panels | 18 (`lg`+) |
| Buttons | 14 |
| Stat tiles | 13–14 |
| Icon buttons | 11 |
| Chips / pills / dots | 999 (`pill`) |

### Type ramp (as used)
| Role | Font | Weight | Size / line |
|---|---|---|---|
| Hero readout | Archivo | 800 | 52 / 1.0 |
| Screen title | Archivo | 700 | 19 / 1.1 |
| Stat value | Archivo | 800 | 24 / 1.1 |
| Stat value (compact) | Archivo | 700 | 16 |
| Body | IBM Plex Sans | 400–500 | 14–15 / 1.45 |
| Button label | IBM Plex Sans | 600 | 15–16 |
| Chip / status | IBM Plex Sans | 600 | 12–13 |
| Data / readout caption | IBM Plex Mono | 500 | 10–11, tracking 0.06–0.08em |

---

## 2. Device frame

- **Bezel:** background `#000`, radius **50**, padding **11**, shadow `0 22px 50px rgba(8,12,10,.28)`.
- **Screen:** 336 × 752, radius **40**, `overflow:hidden`, `--bg` background, `display:flex; flex-direction:column`.
- **Status bar:** height **46**, padding `0 22 0 26`. Time `--fg` 15/600; signal-wifi-battery cluster gap 6; battery fill `--safe`.
- **Home indicator:** 128 × 5, `--radius-pill`, `--fg` @ 30% opacity, in a 24px-high row.

---

## 3. App bar

- Height ~46 (content), gutter 18, gap 12.
- **Back / overflow buttons:** 38 × 38, radius 11, `--surface-2` fill, `1px --border`. (Hit area extends to 48 — pad the tap target even though the visual is 38.)
- **Title:** Archivo 700 / 19, `--fg`. **Subtitle:** Mono 11, `--muted`, e.g. `OAK · TREE #A-12`.

---

## 4. Stepper (Measure / Plan / Sim)

Three equal pills, height **32**, radius pill, gap 6, number badge 18 × 18 (pill), label 12/600.

| State | Background | Border | Badge fill / text | Label |
|---|---|---|---|---|
| Active | `--warn-bg` | `--warn-border` | `--accent` / `--accent-fg` | `--warn-fg` |
| Done | `--ok-bg` | `--ok-border` | `--safe` / `#0A1F14`, "✓" | `--safe` |
| Idle | `--surface` | `--border` | `--border` / `--muted` | `--muted` |

---

## 5. Buttons

| Variant | Height | Radius | Fill | Text | Weight/Size | Use |
|---|---|---|---|---|---|---|
| Primary | 52 | 14 | `--accent` | `--accent-fg` | 600 / 16 | Forward action (Continue, Run, Begin) |
| Secondary | 46–52 | 13–14 | `--surface` | `--fg` | 600 / 14–15 | `1.5px --border` outline |
| Icon (square) | 56 × 52 | 14 | `--surface` | `--fg` | — | Re-measure, etc. `1.5px --border` |
| Danger | 54 | 14 | `--danger` | `#fff` | 700 / 16 | Stop / destructive |
| Ghost | 48 | 14 | none | `--muted` | 600 / 15 | Skip / tertiary |
| Locked (disabled) | 52 | 14 | `#211613` | `#9A857F` | 600 / 15 | `1.5px #3A2925`, lock glyph, non-interactive |

**States (apply to all):**
- **Pressed:** scale 0.98, fill darkened ~6%.
- **Focus (keyboard):** 2px outer ring in `--accent` @ 50%, 2px offset.
- **Disabled:** the Locked spec above — never just lower opacity on a safety control; show *why* it's locked.

---

## 6. Status chips (safety semantics)

Height **30–32**, radius pill, padding `0 11–12`, gap 6–7, leading dot **7–8**, label 12–13/600.

| Meaning | Background | Border | Text / dot |
|---|---|---|---|
| Clear / OK | `--ok-bg` | `--ok-border` | `--safe` |
| Caution | `--caution-bg` | `--caution-border` | `--warn-fg` |
| Warn | `--warn-bg` | `--warn-border` | `--warn-fg` |
| Danger / breach | `--danger-fill` | `#5A211B` (dark) | `--danger` family |
| Neutral / sensor | `--surface` | `--border` | `--muted` |

---

## 7. Stat tiles & readouts

- Tile: `--surface` fill, `1px --border`, radius 13–14, padding 11×13.
- Label: Mono 9–10, tracking 0.06–0.08em, `--muted`, uppercase.
- Value: Archivo 800/24 (or 700/16 compact); unit suffix Mono 10–12 `--muted`.
- Lean value uses `--warn-fg` when lean is in the caution band (≥ ~4°); height/DBH stay `--fg`.

---

## 8. Banners

- **Result (ok):** height 46, radius 13, `--ok-bg` / `1px --ok-border`. Leading 26px check disc filled `--safe`. Title 14/700 `--safe`, sub 11 `--muted`.
- **Alert (danger):** height 60, radius 15, **solid `--danger`** fill. 34px icon tile `rgba(0,0,0,.18)`. Title Archivo 800/17 `#fff`, sub 12 `#FFE2DE`. Reserved for active hazards only.

---

## 9. Diagram layer (Measure AR · Plan map · Sim side)

- Panel: `--diagram-fill` background, `1px --border`, radius 18.
- Geometry strokes: reference lines `--diagram-stroke` 1–1.5, dashed `5 6` for zones.
- **Planned fell line:** `--accent`, 3px solid + arrowhead. Fell cone: `--accent` @ 16% fill.
- **Escape routes:** `--safe`, 2.5px, dash `6 5`.
- **Danger zone ring:** dashed, `--diagram-stroke` (calm) → switches to `--danger` 1.6px + `--danger` @ 14% fill when breached.
- **Measurement callouts:** filled pill in the semantic color (`--accent` for height, `--warn-bg` for lean), Mono 12–14.
- Map labels: Mono 10, tracking 1, `--muted`.

---

## 10. Iconography

- Line icons, stroke **1.4–1.8**, round caps/joins, sizes 16–22.
- Inherit the text color of their context (`--muted` default, semantic color when stateful).
- App icon (`public/icon.svg`): 512 canvas, 112 corner radius, conifer `--fg`, felling-notch wedge `--accent`, timberline horizon `--safe`.

---

## 11. Motion

- **Breach pulse** (person-in-zone marker): ring scales 1→2.4, opacity .35→0, **1.6s** ease-out, infinite (`@keyframes tl-pulse`).
- Screen transitions: 200–240ms ease; forward = slide-left, back = slide-right.
- Button press: 90ms.
- Respect `prefers-reduced-motion` — drop the pulse to a static 2px `--danger` ring.

---

## 12. Per-screen layout (top → bottom)

**Measure:** status · app bar · stepper · AR viewfinder (≈296h) · 3 stat tiles (Height/DBH/Lean) · meta line (weight/species/±) · sighting tip card · `[Re-measure][Continue to Plan]`.

**Plan:** status · app bar · stepper (Measure done) · top-down map (≈264h: zone ring, compass, fell cone+arrow, escape routes, hazard) · 3 control tiles (Direction/Notch/Hinge) · status chips · `[Run simulation]`.

**Simulate:** status · app bar · stepper (Measure+Plan done) · side-view sim (≈208h: ghost upright, fall arc, predicted fall, impact zone, play) · result banner · 3 risk rows (Kickback/Barber-chair/Hang-up) · 3 stat tiles (Fall dir/To ground/Fall len) · `[Begin cut sequence]` + checklist line.

**Danger zone (safety):** status · alert banner · scan header + breach count chip · map (≈300h: red zone fill, dimmed fell/escape, pulsing person marker) · auto-lock explainer · `[Felling locked]` + `[Sound horn][Re-scan]`.

---

## 13. Accessibility / field notes

- Min control hit area **48px**; primary actions span the gutter width.
- Body text ≥ 14px; never below 10px even for mono captions.
- Don't rely on color alone — every semantic state pairs color with an icon, dot, or label.
- Target AA contrast on `--bg`/`--surface`; the dark theme is tuned for glare. Validate any new accent against both themes.
