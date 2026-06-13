# hooks/

Logic/state hooks — the thin boundary where React meets side effects.

- `useDeviceOrientation` — `DeviceOrientationEvent` capture + iOS permission
  flow (Phase 2, ui-dev).
- `useUnits` — SI ⇄ imperial conversion at the display boundary. Internals stay
  SI everywhere; conversion happens here only (HANDOFF §3). The unit-toggle
  approach is decided in DB-0.

Filled out in Phase 2.
