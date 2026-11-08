# Dining Chair Factory Layout Planner — Phase 3a Design

Date: 2026-11-08
Status: Approved design, pending spec review
Builds on: `2026-11-07-factory-layout-planner-phase2-design.md`

## 1. Goal

Help the user choose between layouts and improve one: a side-by-side metrics comparison of layouts in the current project, and a list of rule-based text suggestions for the active layout. No project file change (`schemaVersion: 1`, no new fields). Automated arrangement is Phase 3b, specified separately.

## 2. Decisions

| Topic | Decision |
|---|---|
| Scope | Comparison + suggestions. Auto-arrangement deferred to Phase 3b. |
| Comparison | Metrics table in a dialog, one column per chosen layout. No mini plans, no second 3D view. |
| Suggestions | Text only. Clicking selects a machine; the user moves machines by hand. No one-click apply. |
| Layouts compared | Any layouts of the current project. |
| Persistence | Nothing new stored. All results are computed from the layout and memoised on the layout object. |
| Wiring | Pure functions in `src/domain/`; UI memoises. No new store state or actions. |

## 3. Domain logic

### `src/domain/compare.ts`

```ts
interface LayoutMetrics {
  machines: number;
  movement: Distance | null;              // totalMovement(layout)
  longest: { from: string; to: string; manhattan: number } | null; // step names
  steps: number;
  emptySteps: number;
  area: { footprint: number; operator: number; clearance: number; free: number }; // % of usable floor
  errors: number;                         // validateLayout severity 'error'
  warnings: number;                       // validateLayout severity 'warning'
}

function layoutMetrics(layout: Layout, project: Pick<Project, 'customTypes'>): LayoutMetrics;

interface MetricRow {
  key: string;
  label: string;
  value: (m: LayoutMetrics) => number | null;  // null renders "—"
  format: (v: number) => string;
  better: 'lower' | 'higher' | null;          // null: never highlighted
}

const METRIC_ROWS: MetricRow[];
```

Rows, in order: Material movement (Manhattan, lower), Straight-line movement (lower), Longest move (lower; each value cell also shows the step names), Machines (null), Steps (null), Empty steps (lower), Footprint % (null), Operator area % (null), Clearance % (null), Free floor % (higher), Errors (lower), Warnings (lower).

- `bestIndexes(row, metrics[]): number[]` — indexes holding the best non-null value; all of them on a tie; `[]` when `better` is null, fewer than two non-null values exist, or all values are equal.
- Reuses `totalMovement`, `stepTransitions`, `areaBreakdown`, `validateLayout`. No new geometry.

### `src/domain/recommend.ts`

```ts
type SuggestionCode = 'SWAP_SAVES' | 'LONG_MOVE' | 'FLOWS_CROSS' | 'NOT_IN_WORKFLOW' | 'CROWDED';

interface Suggestion {
  code: SuggestionCode;
  text: string;
  machineIds: string[];   // first one is selected on click; [] for CROWDED
  savingM?: number;       // Manhattan metres saved, SWAP_SAVES only
}

function recommend(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[];
```

Rules (metres, Manhattan unless stated):

| Code | Condition | Text example | Limit |
|---|---|---|---|
| `SWAP_SAVES` | Swapping the `x`/`y` of two machines (rotations kept) lowers total movement by ≥ 1 m and the swapped layout has no error-severity warning that the current layout lacks (compared by code + sorted machine ids). | "Swap Bandsaw and Planer: saves 7.2 m" | top 3 by saving |
| `LONG_MOVE` | A step transition's mean Manhattan is > 1.5 × the mean over all transitions and > 5 m. Needs ≥ 2 transitions. | "Step 4 → 5 (Crosscut → Planing) is 18.0 m: move them closer" | top 3 by distance |
| `FLOWS_CROSS` | Two derived flow links whose segments (source output point → target input point, world coords) properly intersect. Links sharing a machine are skipped. | "Flows 2→3 and 6→7 cross" | 3 |
| `NOT_IN_WORKFLOW` | Placed machine in no workflow step and its category is not `storage` or `utilities`. Category from catalogue, then `customTypes`; unknown type counts as not excluded. | "Edge sander is not in the workflow" | none |
| `CROWDED` | `areaBreakdown` free % < 15. | "Only 12% of the floor is free" | 1 |

- `SWAP_SAVES` and `LONG_MOVE` need `totalMovement` non-null; otherwise skipped.
- Swap pairs: only machines that appear in at least one workflow step (a swap of two unused machines can't change movement).
- Order: suggestions with `savingM` first (descending), then the rest in table order above.
- No suggestion restates a `validateLayout` warning.
- `ponytail:` swap search tries every pair (≈ 435 layouts for 30 machines, each with `totalMovement` + `validateLayout`). Fine at this size; switch to a pruned search if it gets measurably slow.

## 4. UI

### Compare dialog
- Toolbar button **Compare** (disabled with tooltip when the project has one layout) opens a `Dialog`.
- Top: one checkbox per layout, all ticked by default; table needs ≥ 2 ticked, otherwise a short hint.
- Table: first column metric labels, then one column per ticked layout. Header: layout name, "Active" tag or a **Switch** button (switch closes the dialog).
- Best cells (`bestIndexes`) tinted green. `null` shows "—".
- Metrics computed when the dialog opens, memoised per layout object.

### Suggestions tab
- Left panel tabs: Library | Workflow | **Suggestions**. The tab label shows the count when > 0.
- One row per suggestion; clicking a row with machines selects `machineIds[0]`. Empty list: "No suggestions".
- `recommend` memoised on the active layout object (+ `customTypes`); layout changes only on drop, so nothing runs per drag frame.

## 5. Edge cases

- Layout with no machines: counts 0, movement and longest "—", suggestions empty (`CROWDED` follows the free-floor rule only).
- Workflow with < 2 non-empty steps: movement and longest "—"; no swap or long-move suggestions.
- Machines with identical positions: a swap is a no-op (saving 0), never suggested.
- Comparing layouts with different workflows is allowed; metrics are per layout.

## 6. Testing

Vitest, domain only; UI by browser checklist, as before.
- `compare.test.ts`: metrics on a hand-built 3-machine layout; `null` movement case; `bestIndexes` for lower, higher, tie, all-equal, single-value.
- `recommend.test.ts`: one positive and one negative case per code; a beneficial swap rejected because it creates an overlap; ordering (saving first); limits respected.

## 7. Out of scope

- Phase 3b: automated arrangement suggestions.
- One-click apply of suggestions.
- Mini plans or 3D views in the comparison.
- Saving comparison snapshots or exporting the table.
