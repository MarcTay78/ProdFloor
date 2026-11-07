# Factory Layout Planner — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-layout editable workflow that drives flow links, with straight/Manhattan distances between consecutive steps, total material movement, a floor-area utilisation breakdown, and operator-area/clearance checks.

**Architecture:** Pure domain modules (`workflow.ts`, `analysis.ts`, extended `validation.ts`, `templates.ts`, `projectFile.ts`) are unit-tested. The project store gains workflow actions that write `layout.workflow` and re-derived `layout.flows` in one set. UI adds a Workflow tab in the left panel, an area bar and movement stat in the status bar, a Checks section in the inspector, and flow distance labels in the scene. File format stays `schemaVersion: 1`.

**Tech Stack:** Unchanged from Phase 1 (React 18.3.1, TypeScript 5.6.3, Vite 5.4.10, three 0.169.0, @react-three/fiber 8.17.10, @react-three/drei 9.122.0, zustand 4.5.5, zundo 2.2.0, idb-keyval 6.2.1, Tailwind 3.4.14, Vitest 2.1.4). No new dependencies.

Spec: `docs/superpowers/specs/2026-11-07-factory-layout-planner-phase2-design.md`

## Global Constraints

- All Phase 1 global constraints still apply (metres, degrees, floor coordinates, `toThree()` mapping, `src/domain/` imports nothing from React/three/store/scene/ui, IDs via `crypto.randomUUID()` through `newId()`).
- Project file stays `schemaVersion: 1`; every new field is filled on load when missing.
- Distances measured from a machine's output point to the next machine's input point, in world coordinates. Totals use Manhattan.
- Several machines in one step are parallel; a step transition's distance is the mean over its links.
- Empty steps are skipped when deriving flows; the chain continues across them.
- Workflow store actions write `workflow` and `flows` in one `set` (one undo entry).
- No new npm dependencies. Step reorder uses ↑ ↓ buttons.
- Selection stays single (`selectedId`); "select a step" focuses its first machine.
- Run `npm test` and `npm run typecheck` at the end of every task; both must pass.
- Commit after every task on branch `phase2`; commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Plan conventions

Tasks 1–7 (domain and store) contain complete code and tests. Tasks 8–10 are React/three components; they give complete component code and a browser checklist as the test. Task 11 is final verification.

## File map

```
src/domain/types.ts          + WorkflowStep, WorkflowTemplate; Layout.workflow; Project.workflowTemplates
src/domain/workflow.ts       NEW deriveFlows, applyTemplate, removeMachineFromWorkflow, workflowFromFlows
src/domain/workflow.test.ts  NEW
src/domain/templates.ts      + WORKFLOW_TEMPLATES, allWorkflowTemplates; white-part layout sets workflow
src/domain/templates.test.ts + workflow assertions
src/domain/projectFile.ts    + migrateProject, notices, workflow validation
src/domain/projectFile.test.ts
src/domain/analysis.ts       NEW linkDistance, flowDistances, stepTransitions, totalMovement, areaBreakdown
src/domain/analysis.test.ts  NEW
src/domain/validation.ts     + OPERATOR_BLOCKED, OPERATOR_SHARED, ZONE_CROSSES_WALL, OPERATOR_AT_DOOR, STEP_NO_MACHINE
src/domain/validation.test.ts
src/store/projectStore.ts    + workflow actions; deleteMachines updates workflow
src/store/projectStore.test.ts
src/store/persistence.ts     loadProject runs migrateProject
src/store/uiStore.ts         + leftTab, showFlows
src/ui/projectIO.ts          import shows notices
src/ui/LeftPanel.tsx         NEW tabs Library | Workflow
src/ui/WorkflowPanel.tsx     NEW
src/ui/BottomStatus.tsx      area bar, material movement stat
src/ui/RightInspector.tsx    Checks section, workflow line
src/ui/TopToolbar.tsx        Flows toggle
src/App.tsx                  LeftLibrary -> LeftPanel
src/scene/FlowArrows.tsx     step number + distance labels
src/scene/FactoryCanvas.tsx  showFlows, operatorBlocked ids
src/scene/MachineInstance.tsx red operator area when blocked
README.md                    Phase 2 features
```

---

### Task 1: Workflow types and core workflow functions

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/projectFile.ts:22-29`, `src/domain/validation.test.ts:18`
- Create: `src/domain/workflow.ts`
- Test: `src/domain/workflow.test.ts`

**Interfaces:**
- Consumes: `newId` from `catalogue.ts`; `Machine`, `FlowLink` types.
- Produces:
  - `interface WorkflowStep { id: string; name: string; typeId?: string; machineIds: string[] }`
  - `interface WorkflowTemplate { id: string; name: string; steps: { name: string; typeId?: string }[] }`
  - `Layout.workflow: WorkflowStep[]`, `Project.workflowTemplates: WorkflowTemplate[]`
  - `deriveFlows(workflow: WorkflowStep[]): FlowLink[]` — `label` = 1-based source step number as string
  - `applyTemplate(template: WorkflowTemplate, machines: Machine[]): WorkflowStep[]`
  - `removeMachineFromWorkflow(workflow: WorkflowStep[], ids: string[]): WorkflowStep[]`
  - `workflowFromFlows(machines: Machine[], flows: FlowLink[]): { workflow: WorkflowStep[]; dropped: number }`

- [ ] **Step 1: Add types**

In `src/domain/types.ts`, after the `FlowLink` line add:
```ts
export interface WorkflowStep {
  id: string;
  name: string;
  /** Hint for template auto-assign and "save as template". */
  typeId?: string;
  /** 0, 1 or several machines; several = parallel machines. */
  machineIds: string[];
}

export interface WorkflowTemplate { id: string; name: string; steps: { name: string; typeId?: string }[] }
```
Change `Layout` to:
```ts
export interface Layout {
  id: string;
  name: string;
  factory: Factory;
  machines: Machine[];
  /** Ordered process steps; source of truth for flows. */
  workflow: WorkflowStep[];
  /** Derived from workflow by deriveFlows; stored for the scene and the file format. */
  flows: FlowLink[];
}
```
In `Project`, after `typeModels`, add:
```ts
  workflowTemplates: WorkflowTemplate[];
```

- [ ] **Step 2: Fill new fields where layouts and projects are created**

`src/domain/projectFile.ts`, `createLayout`:
```ts
  return { id: newId(), name, factory, machines: [], workflow: [], flows: [] };
```
`createProject`:
```ts
  return { id: newId(), name, createdAt: now, updatedAt: now, customTypes: [], typeModels: {}, workflowTemplates: [], layouts: [layout], activeLayoutId: layout.id };
```
`src/domain/validation.test.ts` line 18:
```ts
const layout = (machines: Machine[], f: Factory = factory()): Layout => ({ id: 'L', name: 'L', factory: f, machines, workflow: [], flows: [] });
```

- [ ] **Step 3: Write the failing tests**

`src/domain/workflow.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import type { WorkflowStep } from './types';
import { applyTemplate, deriveFlows, removeMachineFromWorkflow, workflowFromFlows } from './workflow';

const step = (name: string, machineIds: string[]): WorkflowStep => ({ id: name, name, machineIds });
const pairs = (w: WorkflowStep[]) => deriveFlows(w).map((f) => `${f.fromMachineId}>${f.toMachineId}:${f.label}`);
const type = (id: string) => CATALOGUE.find((t) => t.id === id)!;

describe('deriveFlows', () => {
  test('linear chain, labels are source step numbers', () => {
    expect(pairs([step('A', ['a']), step('B', ['b']), step('C', ['c'])])).toEqual(['a>b:1', 'b>c:2']);
  });
  test('parallel step links every pair (split and merge)', () => {
    expect(pairs([step('A', ['a']), step('B', ['b1', 'b2']), step('C', ['c'])])).toEqual(['a>b1:1', 'a>b2:1', 'b1>c:2', 'b2>c:2']);
  });
  test('empty step is skipped, chain continues', () => {
    expect(pairs([step('A', ['a']), step('B', []), step('C', ['c'])])).toEqual(['a>c:1']);
  });
  test('same machine in consecutive steps makes no self link', () => {
    expect(pairs([step('A', ['a']), step('B', ['a', 'b'])])).toEqual(['a>b:1']);
  });
  test('each link gets its own id', () => {
    const f = deriveFlows([step('A', ['a']), step('B', ['b1', 'b2'])]);
    expect(new Set(f.map((x) => x.id)).size).toBe(2);
  });
});

describe('applyTemplate', () => {
  test('assigns every placed machine of the matching type; unmatched steps stay empty', () => {
    const s1 = createMachine(type('bandsaw'), 1, 1);
    const s2 = createMachine(type('bandsaw'), 4, 1);
    const w = applyTemplate(
      { id: 't', name: 'T', steps: [{ name: 'Saw', typeId: 'bandsaw' }, { name: 'Drill', typeId: 'drill-press' }, { name: 'Check' }] },
      [s1, s2],
    );
    expect(w.map((s) => [s.name, s.typeId, s.machineIds])).toEqual([
      ['Saw', 'bandsaw', [s1.id, s2.id]], ['Drill', 'drill-press', []], ['Check', undefined, []],
    ]);
    expect(new Set(w.map((s) => s.id)).size).toBe(3);
  });
});

describe('removeMachineFromWorkflow', () => {
  test('removes ids from every step and keeps empty steps', () => {
    const w = removeMachineFromWorkflow([step('A', ['a', 'b']), step('B', ['b'])], ['b']);
    expect(w.map((s) => s.machineIds)).toEqual([['a'], []]);
  });
});

describe('workflowFromFlows', () => {
  const ms = ['bandsaw', 'mortiser', 'tenoner', 'drill-press'].map((id, i) => createMachine(type(id), i * 3, 1));
  const [a, b, c, d] = ms;
  const link = (x: string, y: string) => ({ id: `${x}${y}`, fromMachineId: x, toMachineId: y });

  test('single chain: one step per machine in flow order, nothing dropped', () => {
    const r = workflowFromFlows(ms, [link(c.id, b.id), link(a.id, c.id)]);
    expect(r.workflow.map((s) => s.machineIds[0])).toEqual([a.id, c.id, b.id]);
    expect(r.workflow[0]).toMatchObject({ name: 'Bandsaw', typeId: 'bandsaw' });
    expect(r.dropped).toBe(0);
  });
  test('branching input: topological order, extra links counted as dropped', () => {
    const r = workflowFromFlows(ms, [link(a.id, b.id), link(a.id, c.id)]);
    expect(r.workflow.map((s) => s.machineIds[0])).toEqual([a.id, b.id, c.id]);
    expect(r.dropped).toBe(1);
  });
  test('machines without flows are left out; no flows gives empty workflow', () => {
    expect(workflowFromFlows(ms, [link(a.id, b.id)]).workflow).toHaveLength(2);
    expect(workflowFromFlows([d], []).workflow).toEqual([]);
  });
});
```

- [ ] **Step 4: Run, verify fail**

Run: `npx vitest run src/domain/workflow.test.ts`
Expected: FAIL, cannot resolve `./workflow`.

- [ ] **Step 5: Implement**

`src/domain/workflow.ts`:
```ts
import { newId } from './catalogue';
import type { FlowLink, Machine, WorkflowStep, WorkflowTemplate } from './types';

/**
 * Link every machine of each non-empty step to every machine of the next non-empty step.
 * Empty steps are skipped; label = 1-based number of the source step.
 */
export function deriveFlows(workflow: WorkflowStep[]): FlowLink[] {
  const out: FlowLink[] = [];
  let prev: WorkflowStep | undefined;
  let prevNo = 0;
  workflow.forEach((step, i) => {
    if (!step.machineIds.length) return;
    for (const a of prev?.machineIds ?? []) {
      for (const b of step.machineIds) {
        if (a !== b) out.push({ id: newId(), fromMachineId: a, toMachineId: b, label: String(prevNo) });
      }
    }
    prev = step;
    prevNo = i + 1;
  });
  return out;
}

export function applyTemplate(template: WorkflowTemplate, machines: Machine[]): WorkflowStep[] {
  return template.steps.map((s) => ({
    id: newId(),
    name: s.name,
    typeId: s.typeId,
    machineIds: s.typeId ? machines.filter((m) => m.typeId === s.typeId).map((m) => m.id) : [],
  }));
}

export function removeMachineFromWorkflow(workflow: WorkflowStep[], ids: string[]): WorkflowStep[] {
  return workflow.map((s) => ({ ...s, machineIds: s.machineIds.filter((id) => !ids.includes(id)) }));
}

/**
 * Migration for files written before workflows existed: one step per linked machine, in topological
 * order of the flow graph (ties and cycles broken by machine order). Links that are not consecutive
 * in that order are counted as dropped.
 */
export function workflowFromFlows(machines: Machine[], flows: FlowLink[]): { workflow: WorkflowStep[]; dropped: number } {
  const linked = new Set(flows.flatMap((f) => [f.fromMachineId, f.toMachineId]));
  const left = machines.filter((m) => linked.has(m.id));
  const indeg = new Map(left.map((m) => [m.id, 0]));
  for (const f of flows) if (indeg.has(f.fromMachineId) && indeg.has(f.toMachineId)) indeg.set(f.toMachineId, indeg.get(f.toMachineId)! + 1);

  const order: Machine[] = [];
  while (left.length) {
    const i = Math.max(0, left.findIndex((m) => indeg.get(m.id) === 0));
    const [m] = left.splice(i, 1);
    order.push(m);
    for (const f of flows) if (f.fromMachineId === m.id && indeg.has(f.toMachineId)) indeg.set(f.toMachineId, indeg.get(f.toMachineId)! - 1);
  }

  const chain = new Set(order.slice(1).map((m, i) => `${order[i].id}>${m.id}`));
  return {
    workflow: order.map((m) => ({ id: newId(), name: m.name, typeId: m.typeId, machineIds: [m.id] })),
    dropped: flows.filter((f) => !chain.has(`${f.fromMachineId}>${f.toMachineId}`)).length,
  };
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npx vitest run src/domain/workflow.test.ts`
Expected: all passed.

Run: `npm run typecheck`
Expected: exit 0. `templates.ts` and the store build layouts through `createLayout`, which now fills `workflow`. If typecheck reports a `Layout` or `Project` literal missing the new fields, add `workflow: []` / `workflowTemplates: []` there.

Run: `npm test`
Expected: all passed.

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add workflow steps and flow derivation"
```

---

### Task 2: Workflow templates

**Files:**
- Modify: `src/domain/templates.ts`
- Test: `src/domain/templates.test.ts`

**Interfaces:**
- Consumes: `applyTemplate`, `deriveFlows` (Task 1); `CATALOGUE`.
- Produces:
  - `FULL_CHAIR_STEPS: string[]`
  - `WORKFLOW_TEMPLATES: WorkflowTemplate[]` — ids `'white-part'` and `'full-chair'`
  - `allWorkflowTemplates(project: Pick<Project, 'workflowTemplates'>): WorkflowTemplate[]`
  - `createWhitePartLayout(...)` now returns a layout whose `workflow` comes from the `'white-part'` template and whose `flows` = `deriveFlows(workflow)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/domain/templates.test.ts` (and extend the import line to `import { FULL_CHAIR_STEPS, WHITE_PART_STEPS, WHITE_PART_SUPPORT, WORKFLOW_TEMPLATES, allWorkflowTemplates, createWhitePartLayout } from './templates';` plus `import { CATALOGUE } from './catalogue';`):
```ts
describe('workflow templates', () => {
  test('built-ins reference real catalogue types', () => {
    const ids = new Set(CATALOGUE.map((t) => t.id));
    expect(WORKFLOW_TEMPLATES.map((t) => t.id)).toEqual(['white-part', 'full-chair']);
    for (const t of WORKFLOW_TEMPLATES) for (const s of t.steps) expect(ids.has(s.typeId!)).toBe(true);
    expect(FULL_CHAIR_STEPS.slice(0, WHITE_PART_STEPS.length)).toEqual(WHITE_PART_STEPS);
  });

  test('step names come from the catalogue', () => {
    expect(WORKFLOW_TEMPLATES[0].steps[1]).toEqual({ name: 'Rip saw', typeId: 'rip-saw' });
  });

  test('project templates are listed after built-ins', () => {
    const mine = { id: 'm', name: 'Mine', steps: [] };
    expect(allWorkflowTemplates({ workflowTemplates: [mine] }).map((t) => t.id)).toEqual(['white-part', 'full-chair', 'm']);
  });

  test('white-part layout has one step per line machine and numbered flows', () => {
    const l = createWhitePartLayout(createFactory(), { customTypes: [] });
    expect(l.workflow).toHaveLength(WHITE_PART_STEPS.length);
    l.workflow.forEach((s, i) => expect(s.machineIds).toEqual([l.machines[i].id]));
    expect(l.flows.map((f) => f.label)).toEqual(WHITE_PART_STEPS.slice(1).map((_, i) => String(i + 1)));
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/domain/templates.test.ts`
Expected: FAIL, `FULL_CHAIR_STEPS` / `WORKFLOW_TEMPLATES` not exported.

- [ ] **Step 3: Implement**

In `src/domain/templates.ts`:

Change imports:
```ts
import { CATALOGUE, createMachine, findType } from './catalogue';
import { createLayout } from './projectFile';
import type { Factory, Layout, Machine, Project, WorkflowTemplate } from './types';
import { applyTemplate, deriveFlows } from './workflow';
```
After `WHITE_PART_SUPPORT` add:
```ts
/** Whole chair: white parts, then glue-up, assembly, finishing and packing. */
export const FULL_CHAIR_STEPS = [
  ...WHITE_PART_STEPS,
  'glue-station',
  'assembly-station',
  'spray-booth',
  'drying-room',
  'packing-station',
  'finished-goods-rack',
];

const templateOf = (id: string, name: string, typeIds: string[]): WorkflowTemplate => ({
  id, name,
  steps: typeIds.map((t) => ({ name: CATALOGUE.find((c) => c.id === t)?.name ?? t, typeId: t })),
});

/** Built-in, read-only workflow templates. */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  templateOf('white-part', 'White part', WHITE_PART_STEPS),
  templateOf('full-chair', 'Full chair', FULL_CHAIR_STEPS),
];

export function allWorkflowTemplates(project: Pick<Project, 'workflowTemplates'>): WorkflowTemplate[] {
  return [...WORKFLOW_TEMPLATES, ...project.workflowTemplates];
}
```
Replace the last three lines of `createWhitePartLayout` (`layout.machines = ...`, `layout.flows = ...`, `return layout;`) with:
```ts
  layout.machines = [...steps, ...support];
  layout.workflow = applyTemplate(WORKFLOW_TEMPLATES[0], steps);
  layout.flows = deriveFlows(layout.workflow);
  return layout;
```
Remove the now-unused `newId` import if typecheck reports it.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/domain/templates.test.ts`
Expected: all passed (including the existing "flows chain the line in order").

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add white-part and full-chair workflow templates"
```

---

### Task 3: Load migration and import notices

**Files:**
- Modify: `src/domain/projectFile.ts`, `src/store/persistence.ts:20`, `src/ui/projectIO.ts:32-47`
- Test: `src/domain/projectFile.test.ts`

**Interfaces:**
- Consumes: `workflowFromFlows`, `deriveFlows` (Task 1).
- Produces:
  - `migrateProject(p: Project): { project: Project; notices: string[] }` — mutates and returns `p`; fills `workflowTemplates`, builds missing `workflow` from flows, strips unknown machine ids from steps; re-derives flows only for layouts it changed.
  - `ParseResult` ok branch becomes `{ ok: true; file: ProjectFile; notices: string[] }`.
  - `loadProject(id)` returns a migrated project.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('serialize / parse', ...)` in `src/domain/projectFile.test.ts`:
```ts
  test('old file without workflow: built from the flow chain, no notice', () => {
    const p: any = sample();
    const l = p.layouts[0];
    l.machines.push(createMachine(CATALOGUE[4], 9, 5));
    l.flows = [{ id: 'f', fromMachineId: l.machines[0].id, toMachineId: l.machines[1].id }];
    delete l.workflow;
    delete p.workflowTemplates;
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 1, project: p }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const out = r.file.project.layouts[0];
      expect(out.workflow.map((s) => s.machineIds)).toEqual([[l.machines[0].id], [l.machines[1].id]]);
      expect(out.flows).toHaveLength(1);
      expect(r.file.project.workflowTemplates).toEqual([]);
      expect(r.notices).toEqual([]);
    }
  });

  test('unknown machine ids in steps are stripped with a notice', () => {
    const p = sample();
    const m = p.layouts[0].machines[0];
    p.layouts[0].workflow = [{ id: 's1', name: 'Saw', machineIds: [m.id, 'ghost'] }];
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.project.layouts[0].workflow[0].machineIds).toEqual([m.id]);
      expect(r.notices[0]).toMatch(/1 unknown machine/);
    }
  });

  test('duplicate step ids are rejected', () => {
    const p = sample();
    p.layouts[0].workflow = [{ id: 's', name: 'A', machineIds: [] }, { id: 's', name: 'B', machineIds: [] }];
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes('duplicate step id'))).toBe(true);
  });
```
Add a top-level test after the `describe('asNewProject', ...)` block:
```ts
describe('migrateProject', () => {
  test('a current project passes through unchanged', () => {
    const p = sample();
    const before = structuredClone(p);
    expect(migrateProject(p)).toEqual({ project: before, notices: [] });
  });
});
```
Extend the import: `import { asNewProject, createProject, migrateProject, parseProjectFile, serializeProject } from './projectFile';`

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/domain/projectFile.test.ts`
Expected: FAIL, `migrateProject` not exported; workflow tests fail.

- [ ] **Step 3: Implement**

In `src/domain/projectFile.ts`:

Add imports:
```ts
import { deriveFlows, workflowFromFlows } from './workflow';
```
Change `ParseResult`:
```ts
export type ParseResult = { ok: true; file: ProjectFile; notices: string[] } | { ok: false; errors: string[] };
```
Replace `migrate` with:
```ts
/**
 * Fill collections added after a project was written (files and browser storage).
 * Bump SCHEMA_VERSION and add steps here for breaking changes.
 */
export function migrateProject(project: Project): { project: Project; notices: string[] } {
  const p: any = project;
  const notices: string[] = [];
  p.customTypes ??= [];
  p.typeModels ??= {};
  p.workflowTemplates ??= [];
  for (const l of p.layouts ?? []) {
    l.flows ??= [];
    l.machines ??= [];
    const f = l.factory ?? {};
    for (const k of ['internalWalls', 'doors', 'windows', 'pillars', 'restrictedZones']) f[k] ??= [];

    if (!Array.isArray(l.workflow)) {
      const r = workflowFromFlows(l.machines, l.flows);
      l.workflow = r.workflow;
      l.flows = deriveFlows(l.workflow);
      if (r.dropped) notices.push(`Layout "${l.name}": ${r.dropped} flow link(s) did not fit one sequence and were dropped`);
      continue;
    }
    const known = new Set(l.machines.map((m: any) => m.id));
    let stripped = 0;
    for (const s of l.workflow) {
      if (!Array.isArray(s?.machineIds)) continue;
      const kept = s.machineIds.filter((id: string) => known.has(id));
      stripped += s.machineIds.length - kept.length;
      s.machineIds = kept;
    }
    if (stripped) {
      l.flows = deriveFlows(l.workflow);
      notices.push(`Layout "${l.name}": removed ${stripped} unknown machine reference(s) from the workflow`);
    }
  }
  return { project: p, notices };
}
```
In `validateProject`, inside `p.layouts.forEach(...)` after the machines loop, add:
```ts
    const stepIds = new Set<string>();
    (l.workflow as any[]).forEach((s, si) => {
      const sat = `${at}.workflow[${si}]`;
      if (typeof s?.id !== 'string' || typeof s?.name !== 'string' || !Array.isArray(s?.machineIds)) errors.push(`${sat} needs id, name and machineIds`);
      else if (stepIds.has(s.id)) errors.push(`${sat}: duplicate step id ${s.id}`);
      else stepIds.add(s.id);
    });
```
Replace the end of `parseProjectFile`:
```ts
  if (typeof raw.project !== 'object' || raw.project === null) return { ok: false, errors: ['File has no project'] };
  const { notices } = migrateProject(raw.project);
  const errors = validateProject(raw.project);
  return errors.length ? { ok: false, errors } : { ok: true, file: raw as ProjectFile, notices };
```
Note: the unknown-id test's notice reads `removed 1 unknown machine reference(s)`; the test regex `/1 unknown machine/` matches it.

`src/store/persistence.ts`: change the import and `loadProject`:
```ts
import { migrateProject } from '../domain/projectFile';
```
```ts
export const loadProject = async (id: string): Promise<Project | undefined> => {
  const p = await get<Project>(`project:${id}`);
  return p && migrateProject(p).project;
};
```

`src/ui/projectIO.ts`, last line of `importProjectJson`:
```ts
  const extra = result.notices.length ? ` — ${result.notices.join('; ')}` : '';
  useUiStore.getState().showToast(`Imported "${project.name}" as a new project${extra}`);
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/domain/projectFile.test.ts src/store/persistence.test.ts`
Expected: all passed.

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain src/store/persistence.ts src/ui/projectIO.ts
git commit -m "feat(domain): migrate projects to workflows on load and report import notices"
```

---

### Task 4: Flow distances and total movement

**Files:**
- Create: `src/domain/analysis.ts`
- Test: `src/domain/analysis.test.ts`

**Interfaces:**
- Consumes: `localToWorld` from `geometry.ts`; `Layout`, `Machine`.
- Produces:
  - `interface Distance { straight: number; manhattan: number }`
  - `linkDistance(a: Machine, b: Machine): Distance` — a's output point to b's input point
  - `flowDistances(layout: Layout): Map<string, Distance>` — keyed by flow id; flows with missing machines left out
  - `interface StepTransition extends Distance { fromStepId: string; toStepId: string; links: number }`
  - `stepTransitions(layout: Layout): StepTransition[]` — consecutive non-empty steps, mean over links
  - `totalMovement(layout: Layout): Distance | null` — `null` when there is no transition

- [ ] **Step 1: Write the failing tests**

`src/domain/analysis.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { flowDistances, linkDistance, stepTransitions, totalMovement } from './analysis';
import { createFactory } from './projectFile';
import type { Layout, Machine, WorkflowStep } from './types';
import { deriveFlows } from './workflow';

// table-saw: length 2.0, so input point (-1, 0) and output point (1, 0) in local coordinates.
const saw = (x: number, y: number, rotation = 0): Machine => ({ ...createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y), rotation });
const layoutOf = (machines: Machine[], groups: Machine[][]): Layout => {
  const workflow: WorkflowStep[] = groups.map((g, i) => ({ id: `s${i}`, name: `S${i}`, machineIds: g.map((m) => m.id) }));
  return { id: 'L', name: 'L', factory: createFactory(), machines, workflow, flows: deriveFlows(workflow) };
};

describe('linkDistance', () => {
  test('output (1,0) to input (4,3)', () => {
    const d = linkDistance(saw(0, 0), saw(5, 3));
    expect(d.manhattan).toBeCloseTo(6, 6);
    expect(d.straight).toBeCloseTo(Math.hypot(3, 3), 6);
  });
  test('rotation moves the input point: 90° puts it at (5,2)', () => {
    const d = linkDistance(saw(0, 0), saw(5, 3, 90));
    expect(d.manhattan).toBeCloseTo(6, 6);
    expect(d.straight).toBeCloseTo(Math.hypot(4, 2), 6);
  });
});

describe('stepTransitions and totals', () => {
  const a = saw(0, 0), b1 = saw(5, 3), b2 = saw(5, 7), c = saw(10, 3);

  test('parallel step uses the mean over its links', () => {
    const l = layoutOf([a, b1, b2], [[a], [b1, b2]]);
    const [t] = stepTransitions(l);
    expect(t).toMatchObject({ fromStepId: 's0', toStepId: 's1', links: 2 });
    expect(t.manhattan).toBeCloseTo((6 + 10) / 2, 6);
  });

  test('empty steps are skipped; total sums the transitions', () => {
    const l = layoutOf([a, b1, c], [[a], [], [b1], [c]]);
    const ts = stepTransitions(l);
    expect(ts.map((t) => [t.fromStepId, t.toStepId])).toEqual([['s0', 's2'], ['s2', 's3']]);
    // b1 output (6,3) -> c input (9,3): 3
    expect(totalMovement(l)!.manhattan).toBeCloseTo(6 + 3, 6);
  });

  test('null when fewer than two non-empty steps', () => {
    expect(totalMovement(layoutOf([a], [[a], []]))).toBeNull();
  });

  test('flowDistances keyed by flow id', () => {
    const l = layoutOf([a, b1], [[a], [b1]]);
    expect(flowDistances(l).get(l.flows[0].id)!.manhattan).toBeCloseTo(6, 6);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/domain/analysis.test.ts`
Expected: FAIL, cannot resolve `./analysis`.

- [ ] **Step 3: Implement**

`src/domain/analysis.ts`:
```ts
import { localToWorld } from './geometry';
import type { Layout, Machine } from './types';

export interface Distance { straight: number; manhattan: number }

export function linkDistance(a: Machine, b: Machine): Distance {
  const p = localToWorld(a, a.outputPoint), q = localToWorld(b, b.inputPoint);
  const dx = Math.abs(q.x - p.x), dy = Math.abs(q.y - p.y);
  return { straight: Math.hypot(dx, dy), manhattan: dx + dy };
}

export function flowDistances(layout: Layout): Map<string, Distance> {
  const byId = new Map(layout.machines.map((m) => [m.id, m]));
  const out = new Map<string, Distance>();
  for (const f of layout.flows) {
    const a = byId.get(f.fromMachineId), b = byId.get(f.toMachineId);
    if (a && b) out.set(f.id, linkDistance(a, b));
  }
  return out;
}

export interface StepTransition extends Distance { fromStepId: string; toStepId: string; links: number }

/** Consecutive non-empty steps; distance is the mean over the pair's links (a part goes through one parallel machine). */
export function stepTransitions(layout: Layout): StepTransition[] {
  const byId = new Map(layout.machines.map((m) => [m.id, m]));
  const steps = layout.workflow
    .map((s) => ({ id: s.id, ms: s.machineIds.flatMap((id) => byId.get(id) ?? []) }))
    .filter((s) => s.ms.length);
  const out: StepTransition[] = [];
  for (let i = 1; i < steps.length; i++) {
    const ds = steps[i - 1].ms.flatMap((a) => steps[i].ms.filter((b) => b.id !== a.id).map((b) => linkDistance(a, b)));
    if (!ds.length) continue;
    out.push({
      fromStepId: steps[i - 1].id,
      toStepId: steps[i].id,
      links: ds.length,
      straight: ds.reduce((s, d) => s + d.straight, 0) / ds.length,
      manhattan: ds.reduce((s, d) => s + d.manhattan, 0) / ds.length,
    });
  }
  return out;
}

export function totalMovement(layout: Layout): Distance | null {
  const ts = stepTransitions(layout);
  if (!ts.length) return null;
  return { straight: ts.reduce((s, t) => s + t.straight, 0), manhattan: ts.reduce((s, t) => s + t.manhattan, 0) };
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/domain/analysis.test.ts`
Expected: all passed.

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add flow distances, step transitions and total movement"
```

---

### Task 5: Floor-area breakdown

**Files:**
- Modify: `src/domain/analysis.ts`
- Test: `src/domain/analysis.test.ts`

**Interfaces:**
- Consumes: `machineRect`, `operatorRect`, `clearanceRect`, `Rect` from `geometry.ts`; `pillarRect`, `zoneRect`, `wallRect`, `doorKeepClearRect` from `validation.ts`; `findType` from `catalogue.ts`.
- Produces:
  - `type AreaPart = 'footprint' | 'operator' | 'clearance' | 'keepClear' | 'free'`
  - `interface AreaBreakdown { usable: number; parts: Record<AreaPart, number>; footprintByCategory: Partial<Record<MachineCategory, number>> }`
  - `areaBreakdown(layout: Layout, project: Pick<Project, 'customTypes'>, cell = 0.1): AreaBreakdown` — all values m²

- [ ] **Step 1: Write the failing test**

Append to `src/domain/analysis.test.ts` (extend imports: `areaBreakdown` from `./analysis`; `Factory` type):
```ts
describe('areaBreakdown', () => {
  // 10 x 10 floor, 1 x 1 pillar => usable 99.
  // Machine 2 x 1 at (5,5): footprint x 4..6, y 4.5..5.5 = 2.
  // Operator front, depth 0.9, width 2: x 4..6, y 5.5..6.4 = 1.8.
  // Clearance 0.5 all round: x 3.5..6.5, y 4..6 = 6; minus footprint 2, minus operator overlap (y 5.5..6) 1 => 3.
  // Door keep-clear on south wall, offset 8, width 2, depth 1: x 7..9, y 0..1 = 2.
  const f: Factory = {
    ...createFactory(), length: 10, width: 10,
    pillars: [{ id: 'p', x: 1, y: 1, sizeX: 1, sizeY: 1 }],
    doors: [{ id: 'd', name: 'D', wall: 'south', offset: 8, width: 2, height: 2, keepClear: 1 }],
  };
  const m: Machine = {
    ...saw(5, 5), length: 2, width: 1,
    clearance: { front: 0.5, back: 0.5, left: 0.5, right: 0.5 },
    operatorArea: { side: 'front', depth: 0.9, width: 2 },
  };
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.1);

  test('each cell counted once, by priority', () => {
    const r = areaBreakdown({ id: 'L', name: 'L', factory: f, machines: [m], workflow: [], flows: [] }, { customTypes: [] });
    near(r.usable, 99);
    near(r.parts.footprint, 2);
    near(r.parts.operator, 1.8);
    near(r.parts.clearance, 3);
    near(r.parts.keepClear, 2);
    near(r.parts.free, 99 - 2 - 1.8 - 3 - 2);
    near(r.footprintByCategory.cutting!, 2);
  });

  test('empty floor is all free', () => {
    const r = areaBreakdown({ id: 'L', name: 'L', factory: { ...f, pillars: [], doors: [] }, machines: [], workflow: [], flows: [] }, { customTypes: [] });
    near(r.usable, 100);
    near(r.parts.free, 100);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/domain/analysis.test.ts`
Expected: FAIL, `areaBreakdown` not exported.

- [ ] **Step 3: Implement**

Add to `src/domain/analysis.ts` (merge the imports with the existing ones):
```ts
import { findType } from './catalogue';
import { clearanceRect, machineRect, operatorRect, type Rect } from './geometry';
import type { Layout, Machine, MachineCategory, Project } from './types';
import { doorKeepClearRect, pillarRect, wallRect, zoneRect } from './validation';

export type AreaPart = 'footprint' | 'operator' | 'clearance' | 'keepClear' | 'free';

export interface AreaBreakdown {
  usable: number;
  parts: Record<AreaPart, number>;
  footprintByCategory: Partial<Record<MachineCategory, number>>;
}

/** Point-in-rotated-rectangle tester with the trig done once. */
function contains(r: Rect): (x: number, y: number) => boolean {
  const c = Math.cos((-r.rotation * Math.PI) / 180), s = Math.sin((-r.rotation * Math.PI) / 180);
  const hl = r.length / 2, hw = r.width / 2;
  return (x, y) => {
    const dx = x - r.cx, dy = y - r.cy;
    return Math.abs(dx * c - dy * s) <= hl && Math.abs(dx * s + dy * c) <= hw;
  };
}

/**
 * Usable floor (minus pillars, restricted zones, internal walls) split by what covers it.
 * Each cell counted once: footprint > operator > clearance > keep-clear > free.
 * ponytail: samples cell centres at 0.1 m (40 x 20 m ≈ 80k cells); exact polygon union only if precision becomes a problem.
 */
export function areaBreakdown(layout: Layout, project: Pick<Project, 'customTypes'>, cell = 0.1): AreaBreakdown {
  const f = layout.factory;
  const blocked = [...f.pillars.map(pillarRect), ...f.restrictedZones.map(zoneRect), ...f.internalWalls.map(wallRect)].map(contains);
  const footprints = layout.machines.map((m: Machine) => ({
    hit: contains(machineRect(m)),
    cat: findType(project, m.typeId)?.category ?? ('custom' as MachineCategory),
  }));
  const ops = layout.machines.flatMap((m) => {
    const r = operatorRect(m);
    return r ? [contains(r)] : [];
  });
  const clears = layout.machines.map((m) => contains(clearanceRect(m)));
  const keeps = f.doors.map((d) => contains(doorKeepClearRect(f, d)));

  const a = cell * cell;
  const parts: Record<AreaPart, number> = { footprint: 0, operator: 0, clearance: 0, keepClear: 0, free: 0 };
  const byCat: Partial<Record<MachineCategory, number>> = {};
  let usable = 0;
  const nx = Math.round(f.length / cell), ny = Math.round(f.width / cell);
  for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * cell;
    for (let j = 0; j < ny; j++) {
      const y = (j + 0.5) * cell;
      if (blocked.some((h) => h(x, y))) continue;
      usable += a;
      const fp = footprints.find((p) => p.hit(x, y));
      if (fp) {
        parts.footprint += a;
        byCat[fp.cat] = (byCat[fp.cat] ?? 0) + a;
      } else if (ops.some((h) => h(x, y))) parts.operator += a;
      else if (clears.some((h) => h(x, y))) parts.clearance += a;
      else if (keeps.some((h) => h(x, y))) parts.keepClear += a;
      else parts.free += a;
    }
  }
  return { usable, parts, footprintByCategory: byCat };
}
```
`validation.ts` imports only from `geometry.ts` and `types.ts`, so `analysis.ts` importing `validation.ts` creates no cycle.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/domain/analysis.test.ts`
Expected: all passed.

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add floor-area utilisation breakdown"
```

---

### Task 6: Operator, clearance and workflow warnings

**Files:**
- Modify: `src/domain/validation.ts`
- Test: `src/domain/validation.test.ts`

**Interfaces:**
- Consumes: `operatorRect`, `clearanceRect`, `polygonsOverlap`, `polygonInsideBox`, `rectCorners` from `geometry.ts`.
- Produces: `WarningCode` gains `'OPERATOR_BLOCKED' | 'OPERATOR_SHARED' | 'ZONE_CROSSES_WALL' | 'OPERATOR_AT_DOOR' | 'STEP_NO_MACHINE'`. `STEP_NO_MACHINE` warnings have `machineIds: []` and `targetId` = step id. `OPERATOR_BLOCKED` warnings always list the blocked machine first in `machineIds`.

Rules:
- `OPERATOR_BLOCKED` (error): operator area overlaps another machine's footprint (skipped when the two footprints already overlap), a pillar, an internal wall or a restricted zone.
- `OPERATOR_SHARED` (warning): two operator areas overlap; once per pair; skipped when the two footprints overlap.
- `ZONE_CROSSES_WALL` (warning): machine footprint is inside the building, but its clearance or operator area leaves the building or overlaps an internal wall; once per machine.
- `OPERATOR_AT_DOOR` (warning): operator area overlaps a door keep-clear zone.
- `STEP_NO_MACHINE` (warning): a workflow step has no machine that exists in the layout.

- [ ] **Step 1: Isolate existing tests from operator areas**

In `src/domain/validation.test.ts`, change the `box` helper so existing tests keep their old meaning:
```ts
const box = (x: number, y: number, l = 2, w = 1, over: Partial<Machine> = {}): Machine => ({
  ...createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y),
  length: l, width: w, height: 1,
  clearance: { front: 0, back: 0, left: 0, right: 0 },
  operatorArea: { side: 'front', depth: 0, width: 0 },
  ...over,
});
```

- [ ] **Step 2: Write the failing tests**

Append to `src/domain/validation.test.ts`:
```ts
describe('operator and clearance checks', () => {
  // Operator 0.9 deep on the front (+y), as wide as the 2 m machine.
  const op = { operatorArea: { side: 'front' as const, depth: 0.9, width: 2 } };

  test('operator area blocked by another machine', () => {
    const a = box(5, 5, 2, 1, op), b = box(5, 6.5);
    const w = validateLayout(layout([a, b]));
    expect(w.map((x) => [x.code, x.severity, x.machineIds])).toEqual([['OPERATOR_BLOCKED', 'error', [a.id, b.id]]]);
  });

  test('operator area blocked by a pillar', () => {
    const f = factory({ pillars: [{ id: 'p1', x: 5, y: 6, sizeX: 0.4, sizeY: 0.4 }] });
    const w = validateLayout(layout([box(5, 5, 2, 1, op)], f));
    expect(w.map((x) => [x.code, x.targetId])).toEqual([['OPERATOR_BLOCKED', 'p1']]);
  });

  test('two operator areas sharing space, once per pair', () => {
    const a = box(5, 5, 2, 1, op), b = box(5, 7.5, 2, 1, { operatorArea: { side: 'back', depth: 0.9, width: 2 } });
    const w = validateLayout(layout([a, b]));
    expect(w.map((x) => x.code)).toEqual(['OPERATOR_SHARED']);
  });

  test('overlapping machines report only the overlap', () => {
    const w = validateLayout(layout([box(5, 5, 2, 1, op), box(6, 5, 2, 1, op)]));
    expect(w.map((x) => x.code)).toEqual(['MACHINE_OVERLAP']);
  });

  test('clearance leaving the building', () => {
    const m = box(5, 9.2, 2, 1, { clearance: { front: 1, back: 0, left: 0, right: 0 } });
    expect(codes(layout([m]))).toEqual(['ZONE_CROSSES_WALL']);
  });

  test('operator area crossing an internal wall', () => {
    const f = factory({ internalWalls: [{ id: 'w1', x1: 0, y1: 6, x2: 20, y2: 6, thickness: 0.2, height: 3 }] });
    expect(codes(layout([box(5, 5, 2, 1, op)], f))).toEqual(['OPERATOR_BLOCKED', 'ZONE_CROSSES_WALL']);
  });

  test('operator area in a door keep-clear zone', () => {
    const f = factory({ doors: [{ id: 'd1', name: 'Loading', wall: 'north', offset: 5, width: 4, height: 4, keepClear: 2 }] });
    const w = validateLayout(layout([box(5, 7, 2, 1, op)], f));
    expect(w.map((x) => [x.code, x.targetId])).toEqual([['OPERATOR_AT_DOOR', 'd1']]);
  });
});

describe('workflow checks', () => {
  test('step with no existing machine', () => {
    const a = box(5, 5);
    const l = { ...layout([a]), workflow: [{ id: 's1', name: 'Saw', machineIds: [a.id] }, { id: 's2', name: 'Drill', machineIds: ['gone'] }] };
    const w = validateLayout(l);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'STEP_NO_MACHINE', severity: 'warning', machineIds: [], targetId: 's2' });
    expect(w[0].message).toBe('Workflow step 2 "Drill" has no machine');
  });
});
```
Check the geometry of each case before running:
- blocked by machine: a operator y 5.5..6.4; b footprint y 6.0..7.0 → overlap; footprints a y 4.5..5.5, b y 6..7 → no overlap.
- shared: a operator y 5.5..6.4; b at 7.5 back side → y 6.1..7.0 → overlap; b footprint y 7..8 vs a operator y ≤ 6.4 → no block.
- leaving building: footprint y 8.7..9.7 inside 10; clearance front to 10.7 → outside.
- internal wall at y 6 (5.9..6.1): operator y 5.5..6.4 crosses it → blocked (wall is an obstacle) and crosses wall.
- door north keep-clear: y 8..10, x 3..7; footprint y 6.5..7.5 (clear of it); operator y 7.5..8.4 → in it.

- [ ] **Step 3: Run, verify fail**

Run: `npx vitest run src/domain/validation.test.ts`
Expected: the new tests FAIL; existing tests pass.

- [ ] **Step 4: Implement**

In `src/domain/validation.ts`:

Imports:
```ts
import {
  boxRect, clearanceRect, machineRect, operatorRect, polygonInsideBox, polygonsOverlap, rectCorners, segmentRect, type Rect,
} from './geometry';
```
`WarningCode`:
```ts
export type WarningCode =
  | 'OUTSIDE_BUILDING' | 'TOO_TALL' | 'MACHINE_OVERLAP' | 'OBSTACLE_OVERLAP' | 'DOOR_BLOCKED' | 'CLEARANCE_INTRUSION'
  | 'OPERATOR_BLOCKED' | 'OPERATOR_SHARED' | 'ZONE_CROSSES_WALL' | 'OPERATOR_AT_DOOR' | 'STEP_NO_MACHINE';
```
In `validateLayout`, after `const keepClear = ...` add:
```ts
  const ops = machines.map((m) => {
    const r = operatorRect(m);
    return r ? rectCorners(r) : null;
  });
  const walls = f.internalWalls.map((w) => rectCorners(wallRect(w)));
  const overlapsPair = (i: number, j: number) => polygonsOverlap(corners[i], corners[j]);
```
Replace the body of `machines.forEach((m, i) => { ... })` with:
```ts
  machines.forEach((m, i) => {
    const inside = polygonInsideBox(corners[i], 0, 0, f.length, f.width);
    if (!inside) {
      add({ severity: 'error', code: 'OUTSIDE_BUILDING', message: `${m.name} is outside or crossing the building walls`, machineIds: [m.id] });
    }
    if (m.height > f.ceilingHeight) {
      add({ severity: 'warning', code: 'TOO_TALL', message: `${m.name} (${m.height} m) is taller than the ceiling (${f.ceilingHeight} m)`, machineIds: [m.id] });
    }
    for (let j = i + 1; j < machines.length; j++) {
      if (overlapsPair(i, j)) {
        add({ severity: 'error', code: 'MACHINE_OVERLAP', message: `${m.name} overlaps ${machines[j].name}`, machineIds: [m.id, machines[j].id] });
      } else if (ops[i] && ops[j] && polygonsOverlap(ops[i]!, ops[j]!)) {
        add({ severity: 'warning', code: 'OPERATOR_SHARED', message: `Operator areas of ${m.name} and ${machines[j].name} overlap`, machineIds: [m.id, machines[j].id] });
      }
    }
    for (const o of obstacles) {
      if (polygonsOverlap(corners[i], o.poly)) {
        add({ severity: 'error', code: 'OBSTACLE_OVERLAP', message: `${m.name} overlaps ${o.label}`, machineIds: [m.id], targetId: o.id });
      }
    }
    for (const d of keepClear) {
      if (polygonsOverlap(corners[i], d.poly)) {
        add({ severity: 'warning', code: 'DOOR_BLOCKED', message: `${m.name} blocks the access area of ${d.name}`, machineIds: [m.id], targetId: d.id });
      }
    }
    const clear = rectCorners(clearanceRect(m));
    machines.forEach((other, j) => {
      if (j !== i && polygonsOverlap(clear, corners[j]) && !overlapsPair(i, j)) {
        add({ severity: 'warning', code: 'CLEARANCE_INTRUSION', message: `${other.name} is inside the operating clearance of ${m.name}`, machineIds: [m.id, other.id] });
      }
    });

    const op = ops[i];
    if (op) {
      machines.forEach((other, j) => {
        if (j !== i && !overlapsPair(i, j) && polygonsOverlap(op, corners[j])) {
          add({ severity: 'error', code: 'OPERATOR_BLOCKED', message: `Operator area of ${m.name} is blocked by ${other.name}`, machineIds: [m.id, other.id] });
        }
      });
      for (const o of obstacles) {
        if (polygonsOverlap(op, o.poly)) {
          add({ severity: 'error', code: 'OPERATOR_BLOCKED', message: `Operator area of ${m.name} is blocked by ${o.label}`, machineIds: [m.id], targetId: o.id });
        }
      }
      for (const d of keepClear) {
        if (polygonsOverlap(op, d.poly)) {
          add({ severity: 'warning', code: 'OPERATOR_AT_DOOR', message: `Operator area of ${m.name} is in the access area of ${d.name}`, machineIds: [m.id], targetId: d.id });
        }
      }
    }
    const zones = op ? [clear, op] : [clear];
    const crosses = zones.some((z) => !polygonInsideBox(z, 0, 0, f.length, f.width) || walls.some((w) => polygonsOverlap(z, w)));
    if (inside && crosses) {
      add({ severity: 'warning', code: 'ZONE_CROSSES_WALL', message: `Clearance or operator area of ${m.name} crosses a wall`, machineIds: [m.id] });
    }
  });

  const present = new Set(machines.map((m) => m.id));
  layout.workflow.forEach((s, i) => {
    if (!s.machineIds.some((id) => present.has(id))) {
      add({ severity: 'warning', code: 'STEP_NO_MACHINE', message: `Workflow step ${i + 1} "${s.name}" has no machine`, machineIds: [], targetId: s.id });
    }
  });
  return out;
```
Note: the `codes()` helper sorts, so `['OPERATOR_BLOCKED', 'ZONE_CROSSES_WALL']` matches regardless of emit order.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/domain/validation.test.ts`
Expected: all passed.

Run: `npm test`
Expected: all passed, including `templates.test.ts` "every machine placed, no warnings at all". The template spaces neighbours by clearance reach plus walkway and uses `frontReach` (max of front clearance and operator depth) against walls and the aisle, so the new checks raise nothing there. If that test fails, print `validateLayout(l)` in the test, find the clashing machines, and widen the matching spacing constant in `createWhitePartLayout` (`WALKWAY` for `OPERATOR_SHARED`, `WALL_MARGIN` for `ZONE_CROSSES_WALL`) until it passes; do not relax the check.

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add operator area, wall-crossing and empty-step warnings"
```

---

### Task 7: Store workflow actions

**Files:**
- Modify: `src/store/projectStore.ts`, `src/store/uiStore.ts`
- Test: `src/store/projectStore.test.ts`

**Interfaces:**
- Consumes: `deriveFlows`, `applyTemplate`, `removeMachineFromWorkflow` (Task 1); `allWorkflowTemplates` (Task 2).
- Produces (project store):
  - `addStep(name?: string): string` — returns new step id
  - `updateStep(id: string, patch: Partial<Pick<WorkflowStep, 'name' | 'machineIds'>>): void`
  - `moveStep(id: string, dir: -1 | 1): void`
  - `removeStep(id: string): void`
  - `assignToStep(stepId: string, machineId: string): void` — no duplicates; sets step `typeId` from the machine when the step has none
  - `applyWorkflowTemplate(templateId: string): void` — replaces steps
  - `saveWorkflowTemplate(name: string): void` — adds to `project.workflowTemplates`
  - `deleteMachines` now removes ids from the workflow and re-derives flows
- Produces (UI store): `leftTab: 'library' | 'workflow'`, `setLeftTab(t)`, `showFlows: boolean` (default `true`, toggled via `toggle('showFlows')`)

- [ ] **Step 1: Write the failing tests**

In `src/store/projectStore.test.ts`, replace the `describe('white part template', ...)` block with:
```ts
describe('white part template', () => {
  test('adds and activates a linked layout; deleting a machine empties its step and the chain continues', () => {
    s().addWhitePartLayout();
    expect(s().project.layouts).toHaveLength(2);
    expect(layout().name).toBe('White part production');
    const before = layout().flows.length;
    s().deleteMachines([layout().machines[1].id]);
    expect(layout().workflow[1].machineIds).toEqual([]);
    expect(layout().flows).toHaveLength(before - 1);
  });
});
```
Append:
```ts
describe('workflow', () => {
  const twoMachines = () => [s().addMachine('bandsaw', 3, 4)!, s().addMachine('mortiser', 8, 4)!];

  test('add, assign, rename: flows follow the steps', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('Saw');
    const s2 = s().addStep();
    s().assignToStep(s1, a);
    s().assignToStep(s1, a);
    s().assignToStep(s2, b);
    s().updateStep(s2, { name: 'Mortise' });
    expect(layout().workflow.map((x) => [x.name, x.typeId, x.machineIds])).toEqual([['Saw', 'bandsaw', [a]], ['Mortise', 'mortiser', [b]]]);
    expect(layout().flows.map((f) => [f.fromMachineId, f.toMachineId])).toEqual([[a, b]]);
  });

  test('default step name is numbered', () => {
    s().addStep();
    expect(layout().workflow[0].name).toBe('Step 1');
  });

  test('move and remove re-derive flows', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('A'), s2 = s().addStep('B');
    s().assignToStep(s1, a); s().assignToStep(s2, b);
    s().moveStep(s2, -1);
    s().moveStep(s2, -1);
    expect(layout().flows.map((f) => [f.fromMachineId, f.toMachineId])).toEqual([[b, a]]);
    s().removeStep(s1);
    expect(layout().flows).toEqual([]);
  });

  test('apply template auto-assigns, save template stores the step list', () => {
    twoMachines();
    s().applyWorkflowTemplate('white-part');
    expect(layout().workflow).toHaveLength(13);
    expect(layout().workflow.find((x) => x.typeId === 'bandsaw')!.machineIds).toHaveLength(1);
    s().saveWorkflowTemplate('Mine');
    expect(s().project.workflowTemplates).toHaveLength(1);
    expect(s().project.workflowTemplates[0].steps[0]).toEqual({ name: 'Raw timber storage rack', typeId: 'raw-timber-rack' });
  });

  test('one undo reverts a step edit including flows', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('A'), s2 = s().addStep('B');
    s().assignToStep(s1, a); s().assignToStep(s2, b);
    s().removeStep(s1);
    undo();
    expect(layout().workflow).toHaveLength(2);
    expect(layout().flows).toHaveLength(1);
  });

  test('duplicating a layout keeps a working workflow', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('A'), s2 = s().addStep('B');
    s().assignToStep(s1, a); s().assignToStep(s2, b);
    s().duplicateLayout(s().project.activeLayoutId);
    expect(layout().workflow.map((x) => x.machineIds)).toEqual([[a], [b]]);
    expect(layout().machines.map((m) => m.id)).toEqual([a, b]);
  });
});
```
(Duplicated layouts keep machine ids — see the existing 'layouts' test — so workflow ids stay valid without remapping.)

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/store/projectStore.test.ts`
Expected: FAIL, `addStep` is not a function.

- [ ] **Step 3: Implement project store**

In `src/store/projectStore.ts`:

Imports:
```ts
import { createMachine, findType, newId } from '../domain/catalogue';
import { createLayout, createProject } from '../domain/projectFile';
import { allWorkflowTemplates, createWhitePartLayout } from '../domain/templates';
import type { Factory, FactoryItemKind, Layout, Machine, MachineType, Project, WorkflowStep } from '../domain/types';
import { applyTemplate, deriveFlows, removeMachineFromWorkflow } from '../domain/workflow';
```
Add to `interface ProjectState` (after `setTypeModel`):
```ts
  addStep(name?: string): string;
  updateStep(id: string, patch: Partial<Pick<WorkflowStep, 'name' | 'machineIds'>>): void;
  moveStep(id: string, dir: -1 | 1): void;
  removeStep(id: string): void;
  assignToStep(stepId: string, machineId: string): void;
  applyWorkflowTemplate(templateId: string): void;
  saveWorkflowTemplate(name: string): void;
```
After `const setFactory = ...` add:
```ts
      /** Every workflow change goes through here so flows stay derived from steps. */
      const setWorkflow = (fn: (w: WorkflowStep[], l: Layout) => WorkflowStep[]) =>
        setLayout((l) => {
          const workflow = fn(l.workflow, l);
          return { ...l, workflow, flows: deriveFlows(workflow) };
        });
```
Replace `deleteMachines` (machines and workflow change together, so it uses `setLayout` directly; never mutate the previous layout object):
```ts
        deleteMachines: (ids) =>
          setLayout((l) => {
            const workflow = removeMachineFromWorkflow(l.workflow, ids);
            return { ...l, machines: l.machines.filter((m) => !ids.includes(m.id)), workflow, flows: deriveFlows(workflow) };
          }),
```
Add after `setTypeModel`:
```ts
        addStep(name) {
          const id = newId();
          setWorkflow((w) => [...w, { id, name: name ?? `Step ${w.length + 1}`, machineIds: [] }]);
          return id;
        },
        updateStep: (id, patch) => setWorkflow((w) => w.map((s) => (s.id === id ? { ...s, ...patch } : s))),
        moveStep: (id, dir) =>
          setWorkflow((w) => {
            const i = w.findIndex((s) => s.id === id), j = i + dir;
            if (i < 0 || j < 0 || j >= w.length) return w;
            const next = [...w];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
          }),
        removeStep: (id) => setWorkflow((w) => w.filter((s) => s.id !== id)),
        assignToStep: (stepId, machineId) =>
          setWorkflow((w, l) => {
            const m = l.machines.find((x) => x.id === machineId);
            if (!m) return w;
            return w.map((s) =>
              s.id !== stepId || s.machineIds.includes(machineId) ? s : { ...s, typeId: s.typeId ?? m.typeId, machineIds: [...s.machineIds, machineId] },
            );
          }),
        applyWorkflowTemplate(templateId) {
          const t = allWorkflowTemplates(get().project).find((x) => x.id === templateId);
          if (t) setWorkflow((_, l) => applyTemplate(t, l.machines));
        },
        saveWorkflowTemplate: (name) =>
          setProj((p) => ({
            ...p,
            workflowTemplates: [
              ...p.workflowTemplates,
              { id: newId(), name, steps: activeLayout(p).workflow.map((s) => ({ name: s.name, typeId: s.typeId })) },
            ],
          })),
```

- [ ] **Step 4: Implement UI store fields**

In `src/store/uiStore.ts`:
```ts
type ToggleKey = 'showWalls' | 'showLabels' | 'showGrid' | 'showModelsIn2d' | 'showFlows';
```
Add to `UiState` (after `showModelsIn2d: boolean;`):
```ts
  showFlows: boolean;
  leftTab: 'library' | 'workflow';
  setLeftTab(t: 'library' | 'workflow'): void;
```
Add to the store (after `showModelsIn2d: false,`):
```ts
  showFlows: true,
  leftTab: 'library',
  setLeftTab: (leftTab) => set({ leftTab }),
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/store/projectStore.test.ts`
Expected: all passed.

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/store
git commit -m "feat(store): add workflow step actions with derived flows"
```

---

### Task 8: Workflow tab

**Files:**
- Create: `src/ui/LeftPanel.tsx`, `src/ui/WorkflowPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: store actions (Task 7), `stepTransitions`, `totalMovement` (Task 4), `allWorkflowTemplates` (Task 2), `useUiStore` `leftTab`, `setLeftTab`, `selectedId`, `focus`.
- Produces: `<LeftPanel />` used in `App.tsx` in place of `<LeftLibrary />`.

- [ ] **Step 1: LeftPanel**

`src/ui/LeftPanel.tsx`:
```tsx
import { useUiStore } from '../store/uiStore';
import { LeftLibrary } from './LeftLibrary';
import { WorkflowPanel } from './WorkflowPanel';

const tab = (on: boolean) =>
  `flex-1 py-1.5 text-xs ${on ? 'border-b-2 border-sky-500 text-sky-200' : 'border-b border-slate-700 text-slate-400 hover:text-slate-200'}`;

export function LeftPanel() {
  const { leftTab, setLeftTab } = useUiStore();
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900">
      <div className="flex border-r border-slate-700">
        <button className={tab(leftTab === 'library')} onClick={() => setLeftTab('library')}>Library</button>
        <button className={tab(leftTab === 'workflow')} onClick={() => setLeftTab('workflow')}>Workflow</button>
      </div>
      <div className="min-h-0 flex-1">{leftTab === 'library' ? <LeftLibrary /> : <WorkflowPanel />}</div>
    </div>
  );
}
```

- [ ] **Step 2: WorkflowPanel**

`src/ui/WorkflowPanel.tsx`:
```tsx
import { Fragment, useMemo } from 'react';
import { stepTransitions, totalMovement } from '../domain/analysis';
import { allWorkflowTemplates } from '../domain/templates';
import type { Machine } from '../domain/types';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { btn, input } from './Dialog';

const f2 = (n: number) => n.toFixed(2);

export function WorkflowPanel() {
  const project = useProjectStore((s) => s.project);
  const { addStep, updateStep, moveStep, removeStep, assignToStep, applyWorkflowTemplate, saveWorkflowTemplate } = useProjectStore();
  const { selectedId, focus } = useUiStore();
  const layout = activeLayout(project);
  const byId = useMemo(() => new Map(layout.machines.map((m) => [m.id, m])), [layout.machines]);
  const transitions = useMemo(() => stepTransitions(layout), [layout]);
  const total = useMemo(() => totalMovement(layout), [layout]);
  const into = new Map(transitions.map((t) => [t.toStepId, t]));

  const load = (id: string) => {
    if (!id) return;
    if (layout.workflow.length && !confirm('Replace the current workflow steps?')) return;
    applyWorkflowTemplate(id);
  };
  const save = () => {
    const name = prompt('Template name', `${layout.name} workflow`)?.trim();
    if (name) saveWorkflowTemplate(name);
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-700 bg-slate-900 text-slate-200">
      <div className="space-y-1.5 border-b border-slate-700 p-2">
        <select className={`${input} w-full py-1`} value="" onChange={(e) => load(e.target.value)} aria-label="Load template">
          <option value="">Load template…</option>
          {allWorkflowTemplates(project).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1">
          <button className={btn} onClick={() => addStep()}>+ Add step</button>
          <button className={btn} onClick={save} disabled={!layout.workflow.length}>Save as template</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!layout.workflow.length && <p className="text-xs text-slate-500">No steps yet. Load a template or add steps, then assign machines.</p>}
        {layout.workflow.map((s, i) => {
          const t = into.get(s.id);
          const machines = s.machineIds.map((id) => byId.get(id)).filter((m): m is Machine => !!m);
          return (
            <Fragment key={s.id}>
              {t && (
                <div className="px-2 pb-1 text-[11px] text-orange-300" title={t.links > 1 ? `Mean of ${t.links} links` : undefined}>
                  → {f2(t.manhattan)} m <span className="text-slate-500">(straight {f2(t.straight)} m)</span>
                </div>
              )}
              <div className={`mb-1 rounded border px-2 py-1.5 ${machines.length ? 'border-slate-700 bg-slate-800/60' : 'border-amber-700 bg-amber-950/40'}`}>
                <div className="flex items-center gap-1">
                  <button className="w-5 text-xs text-slate-400 hover:text-sky-300" onClick={() => machines[0] && focus(machines[0].id)} title="Show this step's first machine">{i + 1}</button>
                  <input
                    key={s.id + s.name}
                    className={`${input} min-w-0 flex-1`}
                    defaultValue={s.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && updateStep(s.id, { name: e.target.value.trim() })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    aria-label={`Step ${i + 1} name`}
                  />
                  <button className={`${btn} px-1.5`} disabled={i === 0} onClick={() => moveStep(s.id, -1)} title="Move up">↑</button>
                  <button className={`${btn} px-1.5`} disabled={i === layout.workflow.length - 1} onClick={() => moveStep(s.id, 1)} title="Move down">↓</button>
                  <button className={`${btn} px-1.5 text-red-300`} onClick={() => removeStep(s.id)} title="Delete step">×</button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {machines.map((m) => (
                    <span key={m.id} className="flex items-center rounded bg-slate-700 text-[11px]">
                      <button className="px-1.5 hover:text-sky-300" onClick={() => focus(m.id)}>{m.name}</button>
                      <button className="px-1 text-slate-400 hover:text-red-300" onClick={() => updateStep(s.id, { machineIds: s.machineIds.filter((x) => x !== m.id) })} title="Remove from step">×</button>
                    </span>
                  ))}
                  {!machines.length && <span className="text-[11px] text-amber-300">no machine</span>}
                  <button
                    className={`${btn} py-0 text-[11px]`}
                    disabled={!selectedId || s.machineIds.includes(selectedId)}
                    onClick={() => selectedId && assignToStep(s.id, selectedId)}
                    title="Add the selected machine to this step"
                  >
                    + selected
                  </button>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="border-t border-slate-700 p-2 text-xs">
        <span className="text-slate-400">Total movement </span>
        {total ? <>{f2(total.manhattan)} m <span className="text-slate-500">(straight {f2(total.straight)} m)</span></> : '—'}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Use LeftPanel in App**

`src/App.tsx`: replace `import { LeftLibrary } from './ui/LeftLibrary';` with `import { LeftPanel } from './ui/LeftPanel';` and `<LeftLibrary />` with `<LeftPanel />`.

- [ ] **Step 4: Typecheck and tests**

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 5: Browser check**

Start the dev server (`npm run dev`) and open it.
- Library | Workflow tabs switch; Library tab looks and works as before (drag, double-click, white-part button).
- "+ White-part production line" → Workflow tab lists 13 steps, each with one chip; distances between rows; total at the bottom.
- Select a machine in the scene, "+ selected" on another step adds a chip; arrows update.
- ↑ ↓ reorder changes arrows and distances; × deletes a step; × on a chip removes the machine.
- Remove all machines from a step → amber "no machine"; warning appears in the status list.
- Load "Full chair" on a layout missing the finishing machines → those steps amber.
- "Save as template" → appears in "Load template…" list; survives reload.
- Ctrl+Z reverts each step edit once.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/App.tsx
git commit -m "feat(ui): add Workflow tab with step editing, templates and distances"
```

---

### Task 9: Status bar breakdown and inspector checks

**Files:**
- Modify: `src/ui/BottomStatus.tsx`, `src/ui/RightInspector.tsx`

**Interfaces:**
- Consumes: `areaBreakdown`, `totalMovement` (Tasks 4–5); `CATEGORY_LABELS`; `useUiStore` `setLeftTab`, `focus`.

- [ ] **Step 1: BottomStatus**

In `src/ui/BottomStatus.tsx`:

Imports:
```tsx
import { useMemo } from 'react';
import { areaBreakdown, totalMovement, type AreaPart } from '../domain/analysis';
import { CATEGORY_LABELS, findType } from '../domain/catalogue';
import type { MachineCategory } from '../domain/types';
import { validateLayout } from '../domain/validation';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
```
Add above the component:
```tsx
const PARTS: { key: AreaPart; label: string; color: string }[] = [
  { key: 'footprint', label: 'Machine footprint', color: 'bg-sky-500' },
  { key: 'operator', label: 'Operator areas', color: 'bg-green-500' },
  { key: 'clearance', label: 'Clearance', color: 'bg-blue-800' },
  { key: 'keepClear', label: 'Door keep-clear', color: 'bg-amber-500' },
  { key: 'free', label: 'Free', color: 'bg-slate-700' },
];
```
Replace the component body from `const project = ...` to the end of the `stats` memo with:
```tsx
  const project = useProjectStore((s) => s.project);
  const { focus, setLeftTab } = useUiStore();
  const layout = activeLayout(project);
  const { factory: f, machines } = layout;

  const warnings = useMemo(() => validateLayout(layout), [layout]);
  const area = useMemo(() => areaBreakdown(layout, project), [layout, project]);
  const movement = useMemo(() => totalMovement(layout), [layout]);
  const pct = (v: number) => (area.usable ? (v / area.usable) * 100 : 0);
  const areaTitle = [
    `Usable floor ${f2(area.usable)} m² (excluding pillars, restricted zones, internal walls)`,
    ...PARTS.map((p) => `${p.label}: ${f2(area.parts[p.key])} m² (${f2(pct(area.parts[p.key]))} %)`),
    '',
    'Footprint by category:',
    ...Object.entries(area.footprintByCategory).map(([c, v]) => `  ${CATEGORY_LABELS[c as MachineCategory]}: ${f2(v!)} m²`),
  ].join('\n');
```
Replace the `catTitle` line with (per-category machine counts, as before):
```tsx
  const byCat: Record<string, number> = {};
  for (const m of machines) {
    const cat = CATEGORY_LABELS[findType(project, m.typeId)?.category ?? 'custom'];
    byCat[cat] = (byCat[cat] ?? 0) + 1;
  }
  const catTitle = Object.entries(byCat).map(([k, v]) => `${k}: ${v}`).join('\n') || 'No machines';
```
Replace the six `<Stat ... />` lines with (Machine footprint and the old utilisation % move into the bar and its tooltip):
```tsx
        <Stat label="Factory" value={`${f2(f.length)} × ${f2(f.width)} m`} />
        <Stat label="Floor area" value={`${f2(f.length * f.width)} m²`} />
        <Stat label="Ceiling" value={`${f2(f.ceilingHeight)} m`} />
        <Stat label="Machines" value={String(machines.length)} title={catTitle} />
        <div className="col-span-2" title={areaTitle}>
          <div className="text-slate-500">Space utilisation · footprint {f2(pct(area.parts.footprint))} %</div>
          <div className="mt-1 flex h-2 w-56 overflow-hidden rounded bg-slate-800">
            {PARTS.map((p) => <div key={p.key} className={p.color} style={{ width: `${pct(area.parts[p.key])}%` }} />)}
          </div>
        </div>
        <button className="text-left" onClick={() => setLeftTab('workflow')} title="Manhattan distance along the workflow; click to open the Workflow tab">
          <div className="text-slate-500">Material movement</div>
          <div className="whitespace-nowrap text-slate-100">{movement ? `${f2(movement.manhattan)} m` : '—'}</div>
        </button>
```
Change the warning click handler:
```tsx
                onClick={() => (w.machineIds[0] ? focus(w.machineIds[0]) : setLeftTab('workflow'))}
```
The grid stays `grid-cols-3`: row 1 Factory / Floor area / Ceiling, row 2 Machines / utilisation bar (2 columns), row 3 Material movement.

- [ ] **Step 2: RightInspector**

In `src/ui/RightInspector.tsx`, replace the `{warnings.length > 0 && ( ... Problems ... )}` block with:
```tsx
      <Section title="Checks">
        {warnings.length
          ? warnings.map((w) => <p key={w.id} className={`text-xs ${w.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>{w.message}</p>)
          : <p className="text-xs text-green-300">All clear</p>}
      </Section>

      <Section title="Workflow">
        {steps.length
          ? steps.map((s) => <p key={s.id} className="text-xs text-slate-300">Step {s.no} ({s.name})</p>)
          : <p className="text-xs text-slate-500">Not in the workflow</p>}
      </Section>
```
Before `if (!m) {`, add:
```tsx
  const steps = layout.workflow.flatMap((s, i) => (m && s.machineIds.includes(m.id) ? [{ id: s.id, name: s.name, no: i + 1 }] : []));
```

- [ ] **Step 3: Typecheck and tests**

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 4: Browser check**

- Status bar shows a stacked bar; hover lists all five parts with m² and %, and footprint per category.
- Empty layout: bar all grey (free); Material movement "—".
- White-part layout: Material movement shows a value; clicking it opens the Workflow tab and matches its total.
- Clicking a `STEP_NO_MACHINE` warning opens the Workflow tab; other warnings still focus their machine.
- Inspector: "Checks · All clear" on a clean machine; move a machine so its operator area hits a pillar → red message appears there and in the status list.
- Inspector "Workflow" line names the machine's step(s).

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat(ui): add area breakdown, material movement and inspector checks"
```

---

### Task 10: Scene flow labels, Flows toggle, blocked operator areas

**Files:**
- Modify: `src/scene/FlowArrows.tsx`, `src/scene/FactoryCanvas.tsx`, `src/scene/MachineInstance.tsx`, `src/ui/TopToolbar.tsx`

**Interfaces:**
- Consumes: `linkDistance` (Task 4); `FlowLink.label` (Task 1); `showFlows` (Task 7); `OPERATOR_BLOCKED` warnings (Task 6).
- Produces: `MachineInstance` prop `operatorBlocked: boolean`.

- [ ] **Step 1: FlowArrows labels**

In `src/scene/FlowArrows.tsx`:
- Add import `import { linkDistance } from '../domain/analysis';`.
- Change the map callback signature from `(f, i)` to `(f)`.
- Replace the label content `{i + 1}` with:
```tsx
                {f.label ?? '•'} · {linkDistance(a, b).manhattan.toFixed(1)} m
```
- Change the `Html` element's class `px-1.5` to `whitespace-nowrap px-1.5`.
- Move the label to the link midpoint so parallel links from one machine don't stack:
```tsx
              <Html zIndexRange={[5, 0]} position={toThree((p.x + q.x) / 2, (p.y + q.y) / 2, Y + 0.3)} center className="pointer-events-none select-none whitespace-nowrap rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
```

- [ ] **Step 2: FactoryCanvas**

In `src/scene/FactoryCanvas.tsx`:
- Read `showFlows` from `useUiStore()` alongside the other fields.
- Replace the `status` memo with one that also collects blocked operator areas:
```tsx
  const { status, operatorBlocked } = useMemo(() => {
    const s = new Map<string, MachineStatus>();
    const blocked = new Set<string>();
    for (const w of validateLayout(layout)) {
      for (const id of w.machineIds) if (s.get(id) !== 'error') s.set(id, w.severity === 'error' ? 'error' : 'warning');
      if (w.code === 'OPERATOR_BLOCKED') blocked.add(w.machineIds[0]);
    }
    return { status: s, operatorBlocked: blocked };
  }, [layout]);
```
- Render arrows only when on:
```tsx
        {showFlows && <FlowArrows flows={layout.flows} machines={shownMachines} showNumbers={showLabels} />}
```
- Pass the new prop to `MachineInstance`:
```tsx
              operatorBlocked={operatorBlocked.has(m.id)}
```

- [ ] **Step 3: MachineInstance**

In `src/scene/MachineInstance.tsx`:
- Add `operatorBlocked: boolean;` to `Props` and to the destructured props.
- Replace `{selected && <WorldOverlays m={m} />}` with:
```tsx
      {(selected || operatorBlocked) && <WorldOverlays m={m} showClearance={selected} blocked={operatorBlocked} />}
```
- Replace `WorldOverlays`:
```tsx
function WorldOverlays({ m, showClearance, blocked }: { m: Machine; showClearance: boolean; blocked: boolean }) {
  const op = operatorRect(m);
  return (
    <>
      {showClearance && <FloorRect r={clearanceRect(m)} color="#3b82f6" opacity={0.08} dashed y={0.008} />}
      {op && <FloorRect r={op} color={blocked ? '#ef4444' : '#22c55e'} opacity={blocked ? 0.35 : 0.25} y={0.01} />}
    </>
  );
}
```

- [ ] **Step 4: Toolbar toggle**

In `src/ui/TopToolbar.tsx`, after the Grid button:
```tsx
      <button className={ui.showFlows ? btnOn : btn} onClick={() => ui.toggle('showFlows')}>Flows</button>
```

- [ ] **Step 5: Typecheck and tests**

Run: `npm test && npm run typecheck`
Expected: all passed, exit 0.

- [ ] **Step 6: Browser check**

- White-part layout: arrow labels read `1 · 4.3 m`, `2 · …`, at link midpoints; Labels toggle hides them.
- Flows toggle hides and shows arrows in 2D and 3D.
- A step with two machines shows two arrows with the same step number.
- Drag a machine so another sits in its operator area → operator area turns red without selecting it; move away → red overlay disappears.
- Selected machine still shows clearance outline and green operator area when clear.
- PNG export still works.

- [ ] **Step 7: Commit**

```bash
git add src/scene src/ui/TopToolbar.tsx
git commit -m "feat(scene): label flows with step and distance, add Flows toggle, mark blocked operator areas"
```

---

### Task 11: README and final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README**

Add a section after the existing features list:
```markdown
## Production flow and analysis (Phase 2)

- **Workflow tab** (left panel): ordered process steps per layout. Load the built-in "White part" or "Full chair" template (machines of matching type are assigned automatically), add, rename, reorder (↑ ↓) and delete steps, and assign the selected machine with "+ selected". Several machines in one step run in parallel. Save your own step list as a project template.
- Flow arrows are derived from the workflow, labelled with step number and Manhattan distance. Toggle them with **Flows**.
- **Distances**: between consecutive steps, from output point to input point, Manhattan with straight-line in brackets; parallel machines use the mean. **Total movement** appears in the Workflow tab and the status bar.
- **Space utilisation** bar: usable floor split into machine footprint, operator areas, clearance, door keep-clear and free space (hover for m², %, and footprint per category).
- **Checks**: operator area blocked (error), operator areas overlapping, clearance or operator area crossing a wall, operator area in a door access zone, workflow step without a machine. Listed in the status bar and per machine in the inspector; blocked operator areas show red in the scene.
- Projects from earlier versions open unchanged; flow links become one workflow step per machine.
```

- [ ] **Step 2: Full verification**

Run: `npm test`
Expected: all test files passed.

Run: `npm run build`
Expected: exit 0, `dist/` created.

Browser: run the checklists from Tasks 8, 9 and 10 once more in sequence on a fresh project, then:
- Export JSON, re-import: workflow, flows, templates come back identical.
- Import a Phase 1 export (no `workflow` field) → layout shows one step per linked machine; toast has no notice when the flows formed a chain.
- Reload the page: a project saved before this change in the browser opens with a workflow built from its flows.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: describe Phase 2 workflow, distances, utilisation and checks"
```
