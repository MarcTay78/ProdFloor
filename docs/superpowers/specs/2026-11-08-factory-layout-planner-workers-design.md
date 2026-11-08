# Dining Chair Factory Layout Planner — Workers Design

Date: 2026-11-08
Status: Approved by user in brainstorming.
Builds on: `2026-11-08-factory-layout-planner-phase3b-design.md`

## 1. Goal

Staffing plan on the floor: place worker figures, drag them freely, assign each worker to the machines they run, and see headcount per layout.

## 2. Decisions

| Topic | Decision |
|---|---|
| Model | New `Worker` object on each layout, separate from machines. Workers never take part in clearance/overlap validation, area breakdown, auto-arrange, workflow or parts animation. |
| Assignment | Worker → 0..n machines (`machineIds`). A machine may have several workers. |
| Placement | Free placement; worker is dragged on the floor like a machine (same snap, Alt = no snap). No rotation. Position is independent of assignment. |
| Checks | Headcount only: status bar and Compare row. |
| Persistence | `Layout.workers` in the project file; `schemaVersion` stays 1; files without it load with `[]`. |

Out of scope (YAGNI): unstaffed-machine warnings, walk distance, shifts/roles, worker collision checks, workers in the animation. Add when testing asks for them.

## 3. Domain

- `types.ts`: `export interface Worker { id: string; name: string; x: number; y: number; machineIds: string[] }`; `Layout.workers: Worker[]`.
- `projectFile.ts`: new layouts get `workers: []`; load normalises a missing/non-array `workers` to `[]` and drops `machineIds` entries that are not machines of that layout (same pattern as `areas`). Validation errors for a worker missing numeric `x`/`y` or string `id`, matching the existing per-item checks.
- `compare.ts`: `LayoutMetrics.workers: number`; metric row `{ key: 'workers', label: 'Workers', better: null }`.

## 4. Store (`projectStore.ts`)

- `addWorker(at: Point2): string` — id via `newId()`, name `Worker N` (N = count + 1), returns id.
- `updateWorker(id, patch: Partial<Omit<Worker, 'id'>>)`.
- `removeWorker(id)`.
- `deleteMachines(ids)` also removes those ids from every worker's `machineIds`.
- Layout duplicate copies `workers` (new worker ids not needed; ids are per layout).
- Each action is one undo step, like machine edits.

## 5. Scene

- `src/scene/WorkerFigure.tsx`: capsule body + sphere head, ~1.7 m tall, at `(x, y)`; highlighted when selected. Pointer-down starts a move drag.
- Drag: generalise `useMachineDrag` move logic so it also previews/commits a worker (`updateWorker` on release, one undo step). Rotation mode stays machine-only.
- When a worker is selected: thin lines from the worker to the centre of each assigned machine.
- Rendered from `FactoryCanvas` alongside machines.

## 6. UI

- Left library: a "Worker" item (own small section). Drop on floor or click adds a worker at the drop point / floor centre and selects it.
- Selection: shared `uiStore.selectedId`. Inspector looks up the id in machines first, then workers. Delete key removes the selected worker.
- Worker inspector: name field; checklist of the layout's machines (by name) to assign; Delete button.
- Machine inspector: read-only line "Workers: A, B" (or "none") listing workers assigned to it.
- Bottom status: "Workers: N".

## 7. Testing

- `projectStore.test.ts`: add worker gets `Worker 1` and is in the active layout; `updateWorker` assigns machines; `deleteMachines` strips the id from workers; undo reverts add; duplicate layout keeps workers.
- `projectFile.test.ts`: file without `workers` loads with `[]`; stale `machineIds` dropped; round-trip keeps workers.
- `compare.test.ts`: `workers` metric counts the layout's workers.
- Manual check in preview: drag worker, assign in inspector, lines show, headcount updates, Compare row present.
