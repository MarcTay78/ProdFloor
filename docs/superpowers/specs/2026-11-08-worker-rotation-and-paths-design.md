# Worker Rotation and Walking Paths — Design

Date: 2026-11-08
Status: Approved by user.
Builds on: `2026-11-08-factory-layout-planner-workers-design.md`

## Decisions

| Topic | Decision |
|---|---|
| Data | `Worker.rotation` (degrees, 0 = facing south, same convention as machines) and `Worker.path: Point2[]`. Old files load with `0` and `[]`. |
| Route | Loop: worker position → each path point in order → back to the worker position. |
| Rotate | R / Shift+R turns 90°; "Rotation °" inspector field; drag ring around the selected worker (15° steps, Shift 1°). |
| Edit path | Inspector "Edit path" enters path mode; each floor click adds a snapped point (machine clicks ignored). Done or Esc ends. Undo last point, Clear path. Path drawn (dashed line + dots) while the worker is selected. |
| Walk | Toolbar "▶ Play" (enabled with a workflow or any worker path). Workers with a path walk their loop at 1.2 m/s × speed setting, facing travel direction, small bob. Stop returns them to their saved pose. Display only. |
| Out of scope | Dragging/deleting single points, per-worker speed, back-and-forth routes, walking-distance stats. |

## Units

- `simulation.ts`: `walkLoop(worker): RouteLeg[]`, `pathLength(worker): number`, `walkPose(legs, t): { x, y, rotation } | null` (wraps; rotation = `normDeg(atan2(dx, -dy))`).
- `projectFile.ts`: migrate fills `rotation`/`path`; validation rejects non-point path entries.
- `uiStore`: `pathEditId` + `setPathEdit`; selecting another item ends path mode.
- Scene: `WorkerFigure` pose set per frame (`useFrame`), rotation ring, path line; `FactoryShell` floor click adds a point in path mode.
- UI: worker inspector rotation + walking-path section; shortcuts R and Esc; toolbar Play.

## Testing

`simulation.test.ts` (loop length, pose and facing, wrap), `projectFile.test.ts` (defaults, bad path rejected), `projectStore.test.ts` (rotation and path saved via `updateWorker`), browser check.
