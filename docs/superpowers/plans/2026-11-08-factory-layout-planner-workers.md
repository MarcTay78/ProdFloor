# Workers (Staffing Plan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place draggable worker figures on the floor, assign each to the machines they run, and show headcount per layout.

**Architecture:** New `Worker` list on each `Layout`, separate from machines (no validation, area, auto-arrange, workflow or animation involvement). Store actions mirror machine actions (one undo step each via zundo `temporal`). The existing machine drag hook is generalised with an optional commit callback so workers reuse it; the inspector, shortcuts, library and status bar get small worker branches.

**Tech Stack:** React 18, TypeScript, zustand 4 + zundo 2, @react-three/fiber 8 + drei 9, three 0.169, vitest, Tailwind.

Spec: `docs/superpowers/specs/2026-11-08-factory-layout-planner-workers-design.md`

## Global Constraints

- `schemaVersion` stays `1`; files without `workers` load with `[]`.
- Workers never affect `validateLayout`, `areaBreakdown`, `autoArrange`, workflow or `PartsAnimation`.
- One worker → 0..n machines (`machineIds`); a machine may have several workers.
- Free placement, same snap as machines, Alt = no snap, no rotation.
- Headcount only: status bar "Workers" stat and Compare row "Workers" (`better: null`).
- No new dependencies.
- Commands: `npm test` (vitest run), `npm run typecheck` (tsc --noEmit).

---

### Task 1: Worker type and project file support

**Files:**
- Modify: `src/domain/types.ts` (add `Worker`, `Layout.workers`)
- Modify: `src/domain/projectFile.ts` (`createLayout`, `migrateProject`, `validateProject`)
- Modify (fixtures only): `src/domain/analysis.test.ts`, `src/domain/compare.test.ts`, `src/domain/recommend.test.ts`, `src/domain/simulation.test.ts`, `src/domain/validation.test.ts`
- Test: `src/domain/projectFile.test.ts`

**Interfaces:**
- Produces: `export interface Worker { id: string; name: string; x: number; y: number; machineIds: string[] }`; `Layout.workers: Worker[]` (required). `createLayout()` returns `workers: []`. `migrateProject` normalises `workers` and strips unknown machine ids with a notice.

- [ ] **Step 1: Write the failing tests**

In `src/domain/projectFile.test.ts`, inside the test `'fills missing optional collections from older files'`, add `delete p.layouts[0].workers;` after `delete p.layouts[0].factory.windows;` and add inside the `if (r.ok)` block:

```ts
      expect(r.file.project.layouts[0].workers).toEqual([]);
```

Then add these tests inside `describe('serialize / parse', ...)`, after that test:

```ts
  test('worker references to unknown machines are stripped with a notice; workers round-trip', () => {
    const p: any = sample();
    const mid = p.layouts[0].machines[0].id;
    p.layouts[0].workers = [{ id: 'w1', name: 'Ann', x: 2, y: 3, machineIds: [mid, 'ghost'] }];
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 1, project: p }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.project.layouts[0].workers).toEqual([{ id: 'w1', name: 'Ann', x: 2, y: 3, machineIds: [mid] }]);
      expect(r.notices.some((n) => n.includes('from workers'))).toBe(true);
    }
  });

  test('worker without numeric position is rejected', () => {
    const p: any = sample();
    p.layouts[0].workers = [{ id: 'w1', name: 'Ann', x: 'a', y: 3, machineIds: [] }];
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 1, project: p }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain('layouts[0].workers[0] needs id, name, x and y');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/projectFile.test.ts`
Expected: FAIL — `workers` is `undefined` instead of `[]`; the stale id is not stripped; the bad worker is accepted.

- [ ] **Step 3: Add the type**

In `src/domain/types.ts`, after the `ProcessArea` interface add:

```ts
/** Person on the floor; placed freely, runs 0..n machines (staffing plan only, no capacity model). */
export interface Worker { id: string; name: string; x: number; y: number; machineIds: string[] }
```

In `interface Layout`, after `areas: ProcessArea[];` add:

```ts
  /** Workers placed on this layout's floor. */
  workers: Worker[];
```

- [ ] **Step 4: Update `createLayout`**

In `src/domain/projectFile.ts` replace:

```ts
  return { id: newId(), name, factory, machines: [], workflow: [], flows: [], areas: [] };
```

with:

```ts
  return { id: newId(), name, factory, machines: [], workflow: [], flows: [], areas: [], workers: [] };
```

- [ ] **Step 5: Migrate workers**

In `migrateProject`, directly after the line
`if (unassigned) notices.push(\`Layout "${l.name}": ${unassigned} machine(s) referred to a missing process area and were unassigned\`);`
(and before `if (!Array.isArray(l.workflow)) {`, whose branch ends with `continue`) insert:

```ts
    if (!Array.isArray(l.workers)) l.workers = [];
    const machineIds = new Set(l.machines.map((m: any) => m?.id));
    let staleCrew = 0;
    for (const w of l.workers) {
      if (!w) continue;
      if (!Array.isArray(w.machineIds)) { w.machineIds = []; continue; }
      const kept = w.machineIds.filter((id: string) => machineIds.has(id));
      staleCrew += w.machineIds.length - kept.length;
      w.machineIds = kept;
    }
    if (staleCrew) notices.push(`Layout "${l.name}": removed ${staleCrew} unknown machine reference(s) from workers`);
```

- [ ] **Step 6: Validate workers**

In `validateProject`, after the `(l.areas as any[]).forEach(...)` block (still inside `p.layouts.forEach`) insert:

```ts
    const workerIds = new Set<string>();
    (l.workers as any[]).forEach((w, wi) => {
      const wat = `${at}.workers[${wi}]`;
      if (typeof w?.id !== 'string' || typeof w?.name !== 'string' || !num(w?.x) || !num(w?.y)) errors.push(`${wat} needs id, name, x and y`);
      else if (workerIds.has(w.id)) errors.push(`${wat}: duplicate worker id ${w.id}`);
      else workerIds.add(w.id);
    });
```

- [ ] **Step 7: Fix `Layout` literals in test fixtures (required field)**

Run:

```bash
sed -i 's/areas: \[\] }/areas: [], workers: [] }/' src/domain/analysis.test.ts src/domain/compare.test.ts src/domain/recommend.test.ts src/domain/simulation.test.ts src/domain/validation.test.ts
```

Then `grep -rn "areas: \[\]" src` — every hit outside `projectFile.ts` must now also contain `workers: []`.

- [ ] **Step 8: Run tests and typecheck**

Run: `npm test` then `npm run typecheck`
Expected: all tests PASS (including `'a current project passes through unchanged'`), typecheck clean. If typecheck reports another `Layout` literal missing `workers`, add `workers: []` there.

- [ ] **Step 9: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add Worker to layouts with file migration and validation"
```

---

### Task 2: Store actions for workers

**Files:**
- Modify: `src/store/projectStore.ts`
- Test: `src/store/projectStore.test.ts`

**Interfaces:**
- Consumes: `Worker`, `Layout.workers` (Task 1); `Point2` from `src/domain/types.ts`; `newId` from `src/domain/catalogue.ts`.
- Produces (on `ProjectState`):
  - `addWorker(at: Point2): string` — name `Worker N` (N = current count + 1), `machineIds: []`, returns id.
  - `updateWorker(id: string, patch: Partial<Omit<Worker, 'id'>>): void` — `machineIds` deduped and filtered to machines of the active layout.
  - `removeWorker(id: string): void`
  - `deleteMachines(ids)` also strips `ids` from every worker's `machineIds`.

- [ ] **Step 1: Write the failing tests**

Append to `src/store/projectStore.test.ts`:

```ts
describe('workers', () => {
  test('addWorker names in order and lands in the active layout', () => {
    const a = s().addWorker({ x: 2, y: 3 });
    s().addWorker({ x: 4, y: 3 });
    expect(layout().workers.map((w) => w.name)).toEqual(['Worker 1', 'Worker 2']);
    expect(layout().workers[0]).toEqual({ id: a, name: 'Worker 1', x: 2, y: 3, machineIds: [] });
  });
  test('updateWorker keeps only known machines, once each', () => {
    const m = s().addMachine('bandsaw', 3, 4)!;
    const w = s().addWorker({ x: 1, y: 1 });
    s().updateWorker(w, { machineIds: [m, m, 'ghost'], name: 'Ann' });
    expect(layout().workers[0]).toMatchObject({ name: 'Ann', machineIds: [m] });
  });
  test('deleteMachines strips the machine from workers', () => {
    const a = s().addMachine('bandsaw', 3, 4)!;
    const b = s().addMachine('bandsaw', 8, 4)!;
    const w = s().addWorker({ x: 1, y: 1 });
    s().updateWorker(w, { machineIds: [a, b] });
    s().deleteMachines([a]);
    expect(layout().workers[0].machineIds).toEqual([b]);
  });
  test('removeWorker', () => {
    const w = s().addWorker({ x: 1, y: 1 });
    s().removeWorker(w);
    expect(layout().workers).toEqual([]);
  });
  test('undo reverts addWorker', () => {
    s().addWorker({ x: 1, y: 1 });
    expect(canUndo()).toBe(true);
    undo();
    expect(layout().workers).toEqual([]);
  });
  test('duplicateLayout keeps workers', () => {
    s().addWorker({ x: 1, y: 1 });
    s().duplicateLayout(layout().id);
    expect(layout().name).toMatch(/\(copy\)$/);
    expect(layout().workers.map((w) => w.name)).toEqual(['Worker 1']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/projectStore.test.ts`
Expected: FAIL — `s().addWorker is not a function`.

- [ ] **Step 3: Implement**

In `src/store/projectStore.ts`:

Change the types import to include `Point2` and `Worker`:

```ts
import type { Factory, FactoryItemKind, Layout, Machine, MachineType, Point2, ProcessArea, Project, Worker, WorkflowStep } from '../domain/types';
```

In `interface ProjectState`, after `removeArea(id: string): void;` add:

```ts
  /** New worker on the active layout's floor ("Worker N"); returns its id. */
  addWorker(at: Point2): string;
  /** machineIds are deduped and limited to machines of the active layout. */
  updateWorker(id: string, patch: Partial<Omit<Worker, 'id'>>): void;
  removeWorker(id: string): void;
```

Replace the existing `deleteMachines` implementation:

```ts
        deleteMachines: (ids) =>
          setLayout((l) => {
            const workflow = removeMachineFromWorkflow(l.workflow, ids);
            return { ...l, machines: l.machines.filter((m) => !ids.includes(m.id)), workflow, flows: deriveFlows(workflow) };
          }),
```

with:

```ts
        deleteMachines: (ids) =>
          setLayout((l) => {
            const workflow = removeMachineFromWorkflow(l.workflow, ids);
            return {
              ...l,
              machines: l.machines.filter((m) => !ids.includes(m.id)),
              workflow,
              flows: deriveFlows(workflow),
              workers: l.workers.map((w) => ({ ...w, machineIds: w.machineIds.filter((x) => !ids.includes(x)) })),
            };
          }),
```

After the `removeArea` implementation add:

```ts
        addWorker(at) {
          const id = newId();
          setLayout((l) => ({ ...l, workers: [...l.workers, { id, name: `Worker ${l.workers.length + 1}`, x: at.x, y: at.y, machineIds: [] }] }));
          return id;
        },
        updateWorker: (id, patch) =>
          setLayout((l) => {
            if (patch.machineIds) {
              const known = new Set(l.machines.map((m) => m.id));
              patch = { ...patch, machineIds: [...new Set(patch.machineIds)].filter((x) => known.has(x)) };
            }
            return { ...l, workers: l.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) };
          }),
        removeWorker: (id) => setLayout((l) => ({ ...l, workers: l.workers.filter((w) => w.id !== id) })),
```

(`duplicateLayout` uses `structuredClone(src)`, so workers are already copied; no change.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/projectStore.test.ts` then `npm run typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/store/projectStore.ts src/store/projectStore.test.ts
git commit -m "feat(store): add, update and remove workers; deleting machines unassigns them"
```

---

### Task 3: Headcount in Compare and the status bar

**Files:**
- Modify: `src/domain/compare.ts`
- Modify: `src/ui/BottomStatus.tsx`
- Test: `src/domain/compare.test.ts`

**Interfaces:**
- Consumes: `Layout.workers` (Task 1).
- Produces: `LayoutMetrics.workers: number`; `METRIC_ROWS` entry `{ key: 'workers', label: 'Workers', ... better: null }` right after `machines`.

- [ ] **Step 1: Write the failing test**

In `src/domain/compare.test.ts`, inside `describe('layoutMetrics', ...)` (where `a` is defined) add:

```ts
  test('workers counts the layout workers', () => {
    const l = { ...layoutOf([a], [[a]]), workers: [{ id: 'w1', name: 'W', x: 1, y: 1, machineIds: [a.id] }] };
    expect(layoutMetrics(l, P).workers).toBe(1);
    expect(METRIC_ROWS.find((r) => r.key === 'workers')).toMatchObject({ label: 'Workers', better: null });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/compare.test.ts`
Expected: FAIL — `workers` is `undefined`.

- [ ] **Step 3: Implement metric**

In `src/domain/compare.ts`:
- In `interface LayoutMetrics`, after `machines: number;` add `workers: number;`
- In `layoutMetrics` return object, after `machines: layout.machines.length,` add `workers: layout.workers.length,`
- In `METRIC_ROWS`, after the `machines` row add:

```ts
  { key: 'workers', label: 'Workers', value: (m) => m.workers, format: count, better: null },
```

- [ ] **Step 4: Status bar stat**

In `src/ui/BottomStatus.tsx`, after the closing `</button>` of the "Material movement" button (last child of the left grid) add:

```tsx
        <Stat label="Workers" value={String(layout.workers.length)} />
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test` then `npm run typecheck`
Expected: PASS, clean. (`CompareDialog` renders `METRIC_ROWS` generically, so the new row appears without UI changes — confirm with `grep -n METRIC_ROWS src/ui/CompareDialog.tsx`.)

- [ ] **Step 6: Commit**

```bash
git add src/domain/compare.ts src/domain/compare.test.ts src/ui/BottomStatus.tsx
git commit -m "feat: show worker headcount in status bar and Compare"
```

---

### Task 4: Worker figure in the scene, drag and drop

**Files:**
- Modify: `src/scene/DragController.tsx` (generalise `useMachineDrag`)
- Create: `src/scene/WorkerFigure.tsx`
- Modify: `src/scene/FactoryCanvas.tsx` (render workers, apply drag preview, drop handler)
- Modify: `src/ui/LeftLibrary.tsx` (export `WORKER_MIME` only in this task)

**Interfaces:**
- Consumes: `updateWorker`, `addWorker` (Task 2).
- Produces:
  - `useMachineDrag()` returns `(item: { id: string; x: number; y: number; rotation?: number }, mode: 'move' | 'rotate', e: ThreeEvent<PointerEvent>, commit?: (p: { x: number; y: number; rotation: number }) => void) => void`. Default `commit` calls `updateMachine(item.id, p)` — existing callers unchanged.
  - `export const WORKER_MIME = 'application/x-worker';` in `src/ui/LeftLibrary.tsx`.
  - `WorkerFigure` component: props `{ worker: Worker; machines: Machine[]; selected: boolean; flat: boolean; showLabel: boolean }`.

No unit test: scene code is checked in the browser (Task 6), matching how other scene files are tested in this repo.

- [ ] **Step 1: Generalise the drag hook**

In `src/scene/DragController.tsx`, replace the whole `return useCallback(...)` block inside `useMachineDrag` with:

```ts
  return useCallback(
    (
      m: { id: string; x: number; y: number; rotation?: number },
      mode: 'move' | 'rotate',
      e: ThreeEvent<PointerEvent>,
      commit: (p: { x: number; y: number; rotation: number }) => void = (p) => useProjectStore.getState().updateMachine(m.id, p),
    ) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const start = floorPoint(e.nativeEvent, camera, gl.domElement);
      if (!start) return;
      if (controls) controls.enabled = false;
      const ui = useUiStore.getState();
      ui.select(m.id);
      const rot0 = m.rotation ?? 0;
      const offset = { x: m.x - start.x, y: m.y - start.y };
      const startAngle = Math.atan2(start.y - m.y, start.x - m.x);
      let preview = { id: m.id, x: m.x, y: m.y, rotation: rot0 };

      const move = (ev: PointerEvent) => {
        const p = floorPoint(ev, camera, gl.domElement);
        if (!p) return;
        if (mode === 'move') {
          const step = ev.altKey ? 0 : useUiStore.getState().snap;
          preview = { ...preview, x: snapTo(p.x + offset.x, step), y: snapTo(p.y + offset.y, step) };
        } else {
          const delta = ((Math.atan2(p.y - m.y, p.x - m.x) - startAngle) * 180) / Math.PI;
          const step = ev.shiftKey ? 1 : 15;
          preview = { ...preview, rotation: normDeg(Math.round((rot0 + delta) / step) * step) };
        }
        useUiStore.getState().setDragPreview(preview);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        useUiStore.getState().setDragPreview(null);
        if (controls) controls.enabled = true;
        if (preview.x !== m.x || preview.y !== m.y || preview.rotation !== rot0) {
          commit({ x: preview.x, y: preview.y, rotation: preview.rotation });
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [camera, gl, controls],
  );
```

Also update the doc comment above `useMachineDrag` to: `Start moving or rotating a machine (or moving a worker, via commit) from a pointer-down. ...`. The `Machine` type import may become unused — remove it from the import if typecheck flags it.

- [ ] **Step 2: Export the drag MIME type**

In `src/ui/LeftLibrary.tsx`, after `export const MACHINE_TYPE_MIME = ...;` add:

```ts
export const WORKER_MIME = 'application/x-worker';
```

- [ ] **Step 3: Create the figure**

Create `src/scene/WorkerFigure.tsx`:

```tsx
import { Html, Line } from '@react-three/drei';
import type { Machine, Worker } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { toThree } from './coords';
import { useMachineDrag } from './DragController';

interface Props {
  worker: Worker;
  machines: Machine[];
  selected: boolean;
  flat: boolean;
  showLabel: boolean;
}

/** ~1.7 m person (disc in plan view). Drag to move; when selected, dashed lines to each assigned machine. */
export function WorkerFigure({ worker: w, machines, selected, flat, showLabel }: Props) {
  const startDrag = useMachineDrag();
  const updateWorker = useProjectStore((s) => s.updateWorker);
  const color = selected ? '#38bdf8' : '#f59e0b';
  const assigned = machines.filter((m) => w.machineIds.includes(m.id));

  return (
    <>
      <group
        position={toThree(w.x, w.y)}
        onPointerDown={(e) => startDrag(w, 'move', e, (p) => updateWorker(w.id, { x: p.x, y: p.y }))}
        onClick={(e) => e.stopPropagation()}
      >
        {flat ? (
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 24]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ) : (
          <>
            <mesh position={[0, 0.75, 0]} castShadow>
              <capsuleGeometry args={[0.18, 1.0, 4, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 1.55, 0]} castShadow>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshStandardMaterial color="#fcd9b6" />
            </mesh>
          </>
        )}
        {showLabel && (
          <Html zIndexRange={[5, 0]} position={[0, (flat ? 0.1 : 1.7) + 0.25, 0]} center className="pointer-events-none select-none whitespace-nowrap rounded bg-amber-900/80 px-1.5 py-0.5 text-[11px] text-amber-100">
            {w.name}
          </Html>
        )}
      </group>
      {selected && assigned.map((m) => (
        <Line
          key={m.id}
          points={[toThree(w.x, w.y, 0.05), toThree(m.x, m.y, 0.05)]}
          color="#f59e0b"
          lineWidth={1.5}
          dashed
          dashSize={0.3}
          gapSize={0.2}
          raycast={() => null}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 4: Render workers and accept drops in the canvas**

In `src/scene/FactoryCanvas.tsx`:

Change the LeftLibrary import to:

```ts
import { MACHINE_TYPE_MIME, WORKER_MIME } from '../ui/LeftLibrary';
```

Add the import:

```ts
import { WorkerFigure } from './WorkerFigure';
```

In `FactoryCanvas`, after `const addMachine = useProjectStore((s) => s.addMachine);` add:

```ts
  const addWorker = useProjectStore((s) => s.addWorker);
```

After the `shownMachines` line add:

```ts
  const shownWorkers = layout.workers.map((w) => (dragPreview?.id === w.id ? { ...w, x: dragPreview.x, y: dragPreview.y } : w));
```

Replace the start of `onDrop`:

```ts
  const onDrop = (e: DragEvent) => {
    const typeId = e.dataTransfer.getData(MACHINE_TYPE_MIME);
    if (!typeId) return;
    e.preventDefault();
    const p = floorPoint(e);
    if (!p) return;
    const snap = useUiStore.getState().snap;
    const id = addMachine(typeId, snapTo(p.x, snap), snapTo(p.y, snap));
    if (id) select(id);
  };
```

with:

```ts
  const onDrop = (e: DragEvent) => {
    const typeId = e.dataTransfer.getData(MACHINE_TYPE_MIME);
    const isWorker = e.dataTransfer.types.includes(WORKER_MIME);
    if (!typeId && !isWorker) return;
    e.preventDefault();
    const p = floorPoint(e);
    if (!p) return;
    const snap = useUiStore.getState().snap;
    const at = { x: snapTo(p.x, snap), y: snapTo(p.y, snap) };
    const id = isWorker ? addWorker(at) : addMachine(typeId, at.x, at.y);
    if (id) select(id);
  };
```

Replace the `onDragOver` prop:

```tsx
      onDragOver={(e) => { if (e.dataTransfer.types.includes(MACHINE_TYPE_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
```

with:

```tsx
      onDragOver={(e) => {
        const t = e.dataTransfer.types;
        if (t.includes(MACHINE_TYPE_MIME) || t.includes(WORKER_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
      }}
```

Inside `<Canvas>`, after the closing `})}` of `layout.machines.map(...)` add:

```tsx
        {shownWorkers.map((w) => (
          <WorkerFigure key={w.id} worker={w} machines={shownMachines} selected={w.id === selectedId} flat={flat} showLabel={showLabels} />
        ))}
```

- [ ] **Step 5: Typecheck and tests**

Run: `npm run typecheck` then `npm test`
Expected: clean, all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scene/DragController.tsx src/scene/WorkerFigure.tsx src/scene/FactoryCanvas.tsx src/ui/LeftLibrary.tsx
git commit -m "feat(scene): draggable worker figures with lines to assigned machines"
```

---

### Task 5: Library item, worker inspector, Delete shortcut

**Files:**
- Modify: `src/ui/LeftLibrary.tsx` (Worker card)
- Modify: `src/ui/RightInspector.tsx` (`WorkerPanel`, machine "Workers" line)
- Modify: `src/ui/shortcuts.ts` (Delete removes selected worker)

**Interfaces:**
- Consumes: `WORKER_MIME` (Task 4); `addWorker`, `updateWorker`, `removeWorker` (Task 2); `Worker` (Task 1).

- [ ] **Step 1: Worker card in the library**

In `src/ui/LeftLibrary.tsx`, in `LeftLibrary` after `const addWhitePartLayout = ...;` add:

```ts
  const addWorker = useProjectStore((s) => s.addWorker);
```

After the `addAtCentre` function add:

```ts
  const addWorkerAtCentre = () => select(addWorker({ x: layout.factory.length / 2, y: layout.factory.width / 2 }));
```

Inside `<div className="flex-1 overflow-y-auto p-2">`, before `{CATEGORIES.map(...`, add:

```tsx
        <div className="mb-2">
          <div className="py-1 text-xs font-medium uppercase tracking-wide text-slate-400">People</div>
          <div
            draggable
            onDragStart={(e) => { e.dataTransfer.setData(WORKER_MIME, 'worker'); e.dataTransfer.effectAllowed = 'copy'; }}
            onDoubleClick={addWorkerAtCentre}
            className="mb-1 cursor-grab rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5 hover:border-amber-500 active:cursor-grabbing"
            title="Drag onto the factory floor, then assign machines in the inspector"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span>Worker</span>
              <span className="rounded bg-slate-700 px-1.5 text-[11px] text-slate-300" title="Placed in this layout">{layout.workers.length}</span>
            </div>
          </div>
        </div>
```

- [ ] **Step 2: Worker inspector**

In `src/ui/RightInspector.tsx`:

Change the types import to:

```ts
import type { Machine, Side, Worker } from '../domain/types';
```

In `RightInspector`, after `const steps = ...;` add:

```ts
  const w = m ? undefined : layout.workers.find((x) => x.id === selectedId);
  if (w) return <WorkerPanel w={w} />;
```

(This sits after every hook call in the component, so hook order is unchanged.)

After `const type = findType(project, m.typeId);` add:

```ts
  const crew = layout.workers.filter((x) => x.machineIds.includes(m.id)).map((x) => x.name);
```

After the `<button ...>Reset to type defaults</button>` line add:

```tsx
      <p className="mt-1 text-xs text-slate-400">Workers: <span className="text-slate-200">{crew.length ? crew.join(', ') : 'none'}</span></p>
```

Before `const NEW_AREA = '__new__';` add:

```tsx
/** Selected worker: name, position, machines they run, delete. */
function WorkerPanel({ w }: { w: Worker }) {
  const project = useProjectStore((s) => s.project);
  const { updateWorker, removeWorker } = useProjectStore();
  const select = useUiStore((s) => s.select);
  const layout = activeLayout(project);
  const toggle = (id: string) =>
    updateWorker(w.id, { machineIds: w.machineIds.includes(id) ? w.machineIds.filter((x) => x !== id) : [...w.machineIds, id] });
  return (
    <Panel>
      <input
        key={w.id + w.name}
        className={`${input} w-full py-1 text-sm`}
        defaultValue={w.name}
        onBlur={(e) => e.target.value.trim() && e.target.value !== w.name && updateWorker(w.id, { name: e.target.value.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label="Worker name"
      />
      <div className="mt-2 space-y-1.5">
        <NumberField label="X (from west wall)" value={w.x} onCommit={(v) => updateWorker(w.id, { x: v })} />
        <NumberField label="Y (from south wall)" value={w.y} onCommit={(v) => updateWorker(w.id, { y: v })} />
      </div>
      <div className="mt-3 border-t border-slate-800 pt-2">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Runs machines ({w.machineIds.length})</div>
        {!layout.machines.length && <p className="text-xs text-slate-500">No machines placed yet.</p>}
        {layout.machines.map((m) => (
          <label key={m.id} className="flex items-center gap-1.5 text-xs text-slate-300">
            <input type="checkbox" checked={w.machineIds.includes(m.id)} onChange={() => toggle(m.id)} />
            {m.name}
          </label>
        ))}
      </div>
      <button className={`${btn} mt-4 w-full text-red-300`} onClick={() => { removeWorker(w.id); select(null); }}>Delete worker</button>
    </Panel>
  );
}
```

- [ ] **Step 3: Delete shortcut for workers**

In `src/ui/shortcuts.ts` replace:

```ts
      const m = activeLayout(store.project).machines.find((x) => x.id === id);
      if (!m) return;
```

with:

```ts
      const layout = activeLayout(store.project);
      const m = layout.machines.find((x) => x.id === id);
      if (!m) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && layout.workers.some((w) => w.id === id)) { store.removeWorker(id); ui.select(null); }
        return;
      }
```

- [ ] **Step 4: Typecheck and tests**

Run: `npm run typecheck` then `npm test`
Expected: clean, all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/LeftLibrary.tsx src/ui/RightInspector.tsx src/ui/shortcuts.ts
git commit -m "feat(ui): worker library item, worker inspector with machine assignment, Delete shortcut"
```

---

### Task 6: Browser verification

**Files:** none (fix in the relevant file if a check fails, then re-run).

- [ ] **Step 1: Start preview**

Use `preview_start` with the dev server name from `.claude/launch.json`.

- [ ] **Step 2: Check, using read_page / console / screenshot**

1. No console errors on load.
2. Library shows "People → Worker 0". Double-click it: a figure appears at floor centre, inspector shows "Worker 1", status bar "Workers 1", card count 1.
3. Add two machines (double-click library items). In worker inspector tick both: dashed lines go from worker to both machines; each machine inspector shows "Workers: Worker 1".
4. Drag the worker on the floor: it follows with snap, lines follow; release commits; Ctrl+Z puts it back.
5. Drag a Worker card from the library onto the floor: worker added at drop point.
6. Select a machine assigned to the worker, press Delete: worker's "Runs machines" count drops by 1.
7. Select worker, press Delete: worker gone, "Workers 0".
8. Switch to 2D: worker shows as an amber disc and is draggable.
9. Duplicate the layout, open Compare: "Workers" row present for both layouts.
10. Reload the page: workers persist (browser storage).

- [ ] **Step 3: Screenshot as proof** of a selected worker with assignment lines in 3D.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A src
git commit -m "fix: worker verification fixes"
```

(Skip if nothing changed.)
