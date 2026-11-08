# Worker Roles — Design

Date: 2026-11-08
Status: Approved by user.
Builds on: `2026-11-08-worker-rotation-and-paths-design.md`

## Decisions

| Topic | Decision |
|---|---|
| Data | `Worker.role: 'operator' \| 'handler'`. New workers are operators. Old files: workers with a path become handlers, others operators. |
| Inspector | Role switch at the top of the worker inspector; "Walking path" only for handlers; "Face machine" button for operators with an assigned machine (turns to face the first one). |
| Play | Operators stay in place and play a work loop (tool arm up/down, free arm reaching forward, slight body lean). Handlers walk their loop as before; a handler without a path stands still. Play is enabled by a workflow, any handler path, or any operator. Stop returns to the standing pose. |
| Out of scope | Auto-placing operators on a machine's operator area; per-machine animations. |

## Units

- `simulation.ts`: `facing(dx, dy)` (degrees, worker rotation convention), reused by `walkPose`.
- `projectFile.ts`: migrate fills `role`.
- `WorkerFigure`: work loop via the existing limb refs plus the tool arm and torso.
- `RightInspector`, `TopToolbar`: role switch, face-machine button, Play enabling.

## Testing

`simulation.test.ts` (facing), `projectFile.test.ts` (role defaults), `projectStore.test.ts` (new worker is an operator), browser check.
