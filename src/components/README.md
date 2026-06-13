# components/

Presentational components only — no business logic, no I/O. They take props and
render. Domain math lives in `src/engine/`; feature state lives in
`src/features/`.

- `SafetyBanner.tsx` — the persistent, non-dismissable safety banner (HANDOFF §1).

Filled out further in Phases 2–3 (shared UI: cut card, compass, diagrams).
