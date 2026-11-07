# Dining Chair Factory Layout Planner — Phase 2 Design

Date: 2026-11-07
Status: Approved design, pending spec review
Builds on: `2026-11-07-factory-layout-planner-phase1-design.md`

## 1. Goal

Add production-flow analysis to the Phase 1 planner: an editable workflow per layout that drives the flow links, distance between consecutive steps, total material movement, a floor-area utilisation breakdown, and operator-area/clearance checks. The project file stays at `schemaVersion: 1`; every new field is optional on load.

## 2. Decisions

| Topic | Decision |
|---|---|
| Distance | Straight-line and Manhattan both shown, measured from a machine's output point to the next machine's input point (world coordinates). Totals use Manhattan. No obstacle routing. |
| Flow source | The workflow drives the flow. Each layout has an ordered step list; `layout.flows` is derived from it and stored. |
| Workflow scope | Per layout. Built-in read-only templates plus user templates saved in the project. |
| Utilisation | Floor-area breakdown only (no cycle time or capacity). |
| Checks | Operator area blocked, operator areas shared, clearance/operator crossing a wall, operator area in door keep-clear, per-machine checks in inspector. Neighbouring clearances overlapping each other is not flagged. |
| Wiring | Store re-derives `flows` whenever the workflow changes or a machine is deleted. Scene and file format keep reading `flows`. |

## 3. Data model

```ts
interface WorkflowStep {
  id: string;
  name: string;
  typeId?: string;        // hint used by template auto-assign
  machineIds: string[];   // 0, 1 or several (parallel machines)
}

interface WorkflowTemplate {
  id: string;
  name: string;
  steps: { name: string; typeId?: string }[];
}

interface Layout {
  // ...Phase 1 fields
  workflow: WorkflowStep[];          // parser fills from flows or []
  flows: FlowLink[];                 // derived from workflow, stored
}

interface Project {
  // ...Phase 1 fields
  workflowTemplates: WorkflowTemplate[];  // user-saved; parser fills []
}
```

Rules:
- Step order is material order.
- A step may hold zero, one or several machines. Several machines in one step are parallel: each part goes through one of them.
- A machine may appear in more than one step (second pass, rework).
- `deriveFlows(workflow)`: ignore empty steps; link every machine of each non-empty step to every machine of the next non-empty step. Skip a link whose source and target are the same machine.
- Each derived `FlowLink` gets `label` = 1-based index of its source step, used for arrow numbering.
- An empty step raises warning `STEP_NO_MACHINE`; the chain continues across it.

## 4. Domain logic

### `src/domain/workflow.ts`
- `WORKFLOW_TEMPLATES: WorkflowTemplate[]`
  - "White part": the existing `WHITE_PART_STEPS` (13 steps).
  - "Full chair": white part, then `assembly-station`, `glue-station`, `spray-booth`, `drying-room`, `packing-station`, `finished-goods-rack`.
- `deriveFlows(workflow: WorkflowStep[]): FlowLink[]`
- `applyTemplate(template, machines): WorkflowStep[]` — one step per template step; every placed machine whose `typeId` matches joins that step. Unmatched steps stay empty.
- `workflowFromFlows(machines, flows): { workflow: WorkflowStep[]; dropped: number }` — migration. One step per machine in topological order of the flow graph (name = machine name, typeId = machine type). Links that do not fit a single chain are dropped and counted.
- `removeMachineFromWorkflow(workflow, ids)` — removes ids from every step; steps are kept even when they become empty.

`createWhitePartLayout` sets `workflow` from the "White part" template and derives `flows` from it.

### `src/domain/analysis.ts`
- `flowDistances(layout): { flowId; straight; manhattan }[]` — per derived link.
- `stepTransitions(layout): { fromStepId; toStepId; straight; manhattan; links }[]` — per consecutive pair of non-empty steps, values are the **mean** over that pair's links.
- `totalMovement(layout): { straight; manhattan } | null` — sum of transition means; `null` when the workflow has fewer than two non-empty steps.
- `areaBreakdown(layout, cell = 0.1)` — usable floor = factory floor minus pillars, restricted zones and internal walls. Returns m² and % of usable for: footprint, operator area, clearance, door keep-clear, free; plus footprint m² per machine category. Each sample cell is counted once by priority footprint > operator > clearance > keep-clear > free. Computed by sampling cell centres.
  - `ponytail:` raster sampling at 0.1 m (40 × 20 m floor ≈ 80k samples); switch to exact polygon union only if precision is a problem.

### `src/domain/validation.ts` — new warning codes
| Code | Severity | Condition |
|---|---|---|
| `OPERATOR_BLOCKED` | error | Operator area overlaps another machine's footprint, a pillar, an internal wall or a restricted zone |
| `OPERATOR_SHARED` | warning | Operator areas of two machines overlap (one warning per pair) |
| `ZONE_CROSSES_WALL` | warning | Clearance or operator area leaves the building or crosses an internal wall |
| `OPERATOR_AT_DOOR` | warning | Operator area overlaps a door keep-clear zone |
| `STEP_NO_MACHINE` | warning | Workflow step has no machine (`machineIds: []`, `targetId` = step id) |

Existing `CLEARANCE_INTRUSION` is unchanged.

## 5. UI

### Left panel: tabs Library | Workflow
Workflow tab:
- Header: **Load template** dropdown (built-ins and project templates; replaces current steps after confirm), **Save as template**, **Add step**.
- One row per step: number, editable name, machine chips (click selects the machine; × removes it from the step), **+ selected** (adds the selected machine(s)), ↑ ↓ reorder, delete. Empty steps shown amber with "no machine".
- Between rows: transition distance, e.g. `→ 6.40 m (straight 5.10 m)`. With parallel machines the value is the mean; hover lists each link.
- Footer: **Total movement** Manhattan total, straight total in brackets; "—" when not computable.
- Clicking a step name selects all its machines.

### Bottom status bar
- "Space utilisation" becomes a thin stacked bar (footprint, operator, clearance, keep-clear, free). Hover shows m² and % per part and footprint per category.
- New stat **Material movement** (Manhattan total). Clicking it opens the Workflow tab.
- Warning list unchanged; new codes appear automatically.

### Inspector (selected machine)
- **Checks** section: "All clear" or this machine's warnings, from the same `validateLayout` result.
- **Workflow** line: each step containing the machine, e.g. "Step 3 (Crosscut)".

### Scene
- Flow arrow label shows step number and link Manhattan distance, e.g. `3 · 6.4 m`, when labels are on.
- New toolbar toggle **Flows** (`showFlows` in UI store) hides arrows.
- Operator areas involved in `OPERATOR_BLOCKED` are drawn red on every machine, not only the selected one.

### Store actions
`setWorkflow`, `addStep`, `updateStep`, `moveStep`, `removeStep`, `assignToStep`, `applyTemplate`, `saveTemplate`. Each writes `workflow` and re-derived `flows` in one set (one undo entry). Machine delete calls `removeMachineFromWorkflow` and re-derives flows. Layout duplicate remaps workflow machine ids to the copied machines.

Analysis results are memoised on the layout object; layout changes only on drop, so analysis never runs per drag frame.

## 6. Migration and edge cases

- Missing `workflow` on load: built with `workflowFromFlows`; when links were dropped, the import shows a notice with the count. Missing `workflowTemplates`: `[]`.
- Step `machineIds` referring to machines not in the layout are stripped on load with a notice (not an error). Duplicate step ids are an import error.
- Deleting a machine leaves its step in place (empty step warning).
- Undo restores workflow and flows together.
- Same machine in two consecutive steps: no link, no arrow.
- Template step whose `typeId` is not in the catalogue: step kept, unassigned.

## 7. Testing

Vitest, domain and store only; UI verified with a browser checklist per task, as in Phase 1.
- `workflow.test.ts`: `deriveFlows` (linear, split, merge, empty-step skip, self-link skip, labels); `applyTemplate` auto-assign; `workflowFromFlows` for a chain and for branching input.
- `analysis.test.ts`: straight vs Manhattan for rotated machines; mean over parallel links; total and `null` case; `areaBreakdown` on a hand-checkable layout within ±0.1 m², overlap priority.
- `validation.test.ts`: one case per new code.
- `projectFile.test.ts`: old file without workflow migrates; unknown machine ids stripped; duplicate step id rejected.
- `projectStore.test.ts`: step actions re-derive flows; machine delete updates steps; layout duplicate remaps ids.

## 8. Out of scope

- Obstacle-aware routed paths.
- Cycle time, capacity, bottleneck analysis.
- Drag-and-drop step reordering.
- Phase 3: layout comparison, optimisation, automated arrangement.
