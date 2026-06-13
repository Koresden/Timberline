# features/

Feature folders own their own screen state and wire the engine to the UI. One
folder per module (HANDOFF §1):

- `measure/` — height measurement screen (Phase 2, ui-dev)
- `plan/` — input form → `FellingPlan` cut card (Phase 2, ui-dev)
- `simulate/` — top + side SVG views, draggable obstacles (Phase 3, sim-dev)

Features may import from `src/engine/` and `src/components/`. The engine must
never import from here (enforced by the ESLint engine-purity rule).
