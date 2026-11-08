# Factory Layout Planner — Phase 3a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Compare dialog that puts layout metrics side by side, and a Suggestions tab that lists rule-based improvement hints for the active layout.

**Architecture:** Two pure domain modules (`compare.ts`, `recommend.ts`) built on the Phase 2 analysis and validation functions, unit-tested with Vitest. UI adds a `CompareDialog` (toolbar button) and a `SuggestionsPanel` (third left-panel tab). Results are cached per layout object in the UI; no store actions, no file-format change.

**Tech Stack:** Unchanged (React 18.3.1, TypeScript 5.6.3, Vite 5.4.10, zustand 4.5.5, Tailwind 3.4.14, Vitest 2.1.4). No new dependencies.

Spec: `docs/superpowers/specs/2026-11-08-factory-layout-planner-phase3a-design.md`

## Global Constraints

- All Phase 1 and Phase 2 global constraints still apply (metres, degrees, floor coordinates; `src/domain/` imports nothing from React/three/store/scene/ui).
- Project file stays `schemaVersion: 1`; no new fields on `Project` or `Layout`.
- Totals and savings use Manhattan distance from `totalMovement` / `stepTransitions` in `src/domain/analysis.ts`.
- Suggestions are text only; clicking one calls `useUiStore.focus(machineIds[0])`. No suggestion changes the layout.
- Nothing recomputes per drag frame: results are cached per layout object (layouts change only on drop).
- No new npm dependencies.
- Run `npm test` and `npm run typecheck` at the end of every task; both must pass.
- Work on branch `phase3a` (created in Task 1). Commit after every task; commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Plan conventions

Tasks 1–2 (domain) contain complete code and tests. Tasks 3–4 are React components; they give complete code and a browser checklist as the test. Task 5 is final verification.

## File map

```
src/domain/compare.ts           NEW layoutMetrics, METRIC_ROWS, bestIndexes
src/domain/compare.test.ts      NEW
src/domain/recommend.ts         NEW recommend (SWAP_SAVES, LONG_MOVE, FLOWS_CROSS, NOT_IN_WORKFLOW, CROWDED)
src/domain/recommend.test.ts    NEW
src/store/uiStore.ts            leftTab gains 'suggestions'; DialogName gains 'compare'
src/ui/SuggestionsPanel.tsx     NEW useSuggestions hook + panel
src/ui/LeftPanel.tsx            third tab with count
src/ui/CompareDialog.tsx        NEW
src/ui/TopToolbar.tsx           Compare button
src/App.tsx                     mount CompareDialog
README.md                       Phase 3a section
```

## Shared test fixtures (used in Tasks 1 and 2)

Catalogue `table-saw`: length 2.0, width 1.6, clearance 0.6 on all sides, operator area front (local +y) depth 0.9 width 2. `createMachine` puts input point at local (-1, 0) and output point at (1, 0). So a table saw at (x, y), rotation 0, has input (x−1, y) and output (x+1, y). `crosscut-saw` is length 4.0, width 1.0: input (x−2, y), output (x+2, y).

---

### Task 1: Layout metrics for comparison

**Files:**
- Create: `src/domain/compare.ts`
- Test: `src/domain/compare.test.ts`

**Interfaces:**
- Consumes: `stepTransitions`, `totalMovement`, `areaBreakdown`, `Distance` from `./analysis`; `validateLayout` from `./validation`; `Layout`, `Project` from `./types`.
- Produces:
  - `interface LayoutMetrics { machines: number; movement: Distance | null; longest: { from: string; to: string; manhattan: number } | null; steps: number; emptySteps: number; area: { footprint: number; operator: number; clearance: number; free: number }; errors: number; warnings: number }` (area values are % of usable floor)
  - `function layoutMetrics(layout: Layout, project: Pick<Project, 'customTypes'>): LayoutMetrics`
  - `interface MetricRow { key: string; label: string; value(m: LayoutMetrics): number | null; format(v: number): string; better: 'lower' | 'higher' | null }`
  - `const METRIC_ROWS: MetricRow[]`
  - `function bestIndexes(row: MetricRow, metrics: LayoutMetrics[]): number[]`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b phase3a
```

- [ ] **Step 2: Write the failing test**

`src/domain/compare.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { bestIndexes, layoutMetrics, METRIC_ROWS, type LayoutMetrics, type MetricRow } from './compare';
import { createFactory } from './projectFile';
import type { Layout, Machine, WorkflowStep } from './types';
import { deriveFlows } from './workflow';

const saw = (x: number, y: number): Machine => createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y);
const layoutOf = (machines: Machine[], groups: Machine[][]): Layout => {
  const workflow: WorkflowStep[] = groups.map((g, i) => ({ id: `s${i}`, name: `S${i}`, machineIds: g.map((m) => m.id) }));
  return { id: 'L', name: 'L', factory: { ...createFactory(), doors: [] }, machines, workflow, flows: deriveFlows(workflow) };
};
const P = { customTypes: [] };

describe('layoutMetrics', () => {
  // a out (6,10) -> b in (7,10): 1 m; b out (9,10) -> c in (29,10): 20 m.
  const a = saw(5, 10), b = saw(8, 10), c = saw(30, 10);

  test('counts, movement and longest move', () => {
    const m = layoutMetrics(layoutOf([a, b, c], [[a], [b], [], [c]]), P);
    expect(m.machines).toBe(3);
    expect(m.steps).toBe(4);
    expect(m.emptySteps).toBe(1);
    expect(m.movement!.manhattan).toBeCloseTo(21, 6);
    expect(m.longest).toEqual({ from: 'S1', to: 'S3', manhattan: expect.closeTo(20, 6) });
    expect(m.errors).toBe(0);
  });

  test('area percentages cover the usable floor (no doors, so no keep-clear)', () => {
    const { area } = layoutMetrics(layoutOf([a, b, c], [[a], [b], [c]]), P);
    expect(area.footprint).toBeGreaterThan(0);
    expect(area.footprint + area.operator + area.clearance + area.free).toBeCloseTo(100, 1);
  });

  test('null movement and longest with fewer than two non-empty steps', () => {
    const m = layoutMetrics(layoutOf([a], [[a]]), P);
    expect(m.movement).toBeNull();
    expect(m.longest).toBeNull();
  });

  test('every row value is a number or null', () => {
    const m = layoutMetrics(layoutOf([], []), P);
    for (const row of METRIC_ROWS) {
      const v = row.value(m);
      expect(v === null || typeof v === 'number').toBe(true);
    }
  });
});

describe('bestIndexes', () => {
  const base = layoutMetrics(layoutOf([], []), P);
  const withN = (machines: number): LayoutMetrics => ({ ...base, machines });
  const row = (better: MetricRow['better']): MetricRow => ({ key: 'x', label: 'x', value: (m) => (m.machines < 0 ? null : m.machines), format: String, better });

  test('lower and higher', () => {
    const ms = [withN(5), withN(2), withN(9)];
    expect(bestIndexes(row('lower'), ms)).toEqual([1]);
    expect(bestIndexes(row('higher'), ms)).toEqual([2]);
  });
  test('tie marks every best', () => {
    expect(bestIndexes(row('lower'), [withN(2), withN(5), withN(2)])).toEqual([0, 2]);
  });
  test('all equal, single non-null value, or better=null mark nothing', () => {
    expect(bestIndexes(row('lower'), [withN(3), withN(3)])).toEqual([]);
    expect(bestIndexes(row('lower'), [withN(3), withN(-1)])).toEqual([]);
    expect(bestIndexes(row(null), [withN(1), withN(2)])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/domain/compare.test.ts`
Expected: FAIL, cannot resolve `./compare`.

- [ ] **Step 4: Write the implementation**

`src/domain/compare.ts`:

```ts
import { areaBreakdown, stepTransitions, totalMovement, type Distance } from './analysis';
import type { Layout, Project } from './types';
import { validateLayout } from './validation';

export interface LayoutMetrics {
  machines: number;
  movement: Distance | null;
  longest: { from: string; to: string; manhattan: number } | null;
  steps: number;
  emptySteps: number;
  /** % of usable floor. */
  area: { footprint: number; operator: number; clearance: number; free: number };
  errors: number;
  warnings: number;
}

export function layoutMetrics(layout: Layout, project: Pick<Project, 'customTypes'>): LayoutMetrics {
  const ts = stepTransitions(layout);
  const top = ts.reduce<(typeof ts)[number] | null>((m, t) => (!m || t.manhattan > m.manhattan ? t : m), null);
  const stepName = (id: string) => layout.workflow.find((s) => s.id === id)?.name ?? '';
  const area = areaBreakdown(layout, project);
  const pct = (v: number) => (area.usable ? (v / area.usable) * 100 : 0);
  const ws = validateLayout(layout);
  return {
    machines: layout.machines.length,
    movement: totalMovement(layout),
    longest: top ? { from: stepName(top.fromStepId), to: stepName(top.toStepId), manhattan: top.manhattan } : null,
    steps: layout.workflow.length,
    emptySteps: layout.workflow.filter((s) => !s.machineIds.length).length,
    area: { footprint: pct(area.parts.footprint), operator: pct(area.parts.operator), clearance: pct(area.parts.clearance), free: pct(area.parts.free) },
    errors: ws.filter((w) => w.severity === 'error').length,
    warnings: ws.filter((w) => w.severity === 'warning').length,
  };
}

export interface MetricRow {
  key: string;
  label: string;
  value(m: LayoutMetrics): number | null;
  format(v: number): string;
  /** null: never highlighted. */
  better: 'lower' | 'higher' | null;
}

const metres = (v: number) => `${v.toFixed(1)} m`;
const percent = (v: number) => `${v.toFixed(1)} %`;
const count = (v: number) => String(v);

export const METRIC_ROWS: MetricRow[] = [
  { key: 'movement', label: 'Material movement', value: (m) => m.movement?.manhattan ?? null, format: metres, better: 'lower' },
  { key: 'straight', label: 'Straight-line movement', value: (m) => m.movement?.straight ?? null, format: metres, better: 'lower' },
  { key: 'longest', label: 'Longest move', value: (m) => m.longest?.manhattan ?? null, format: metres, better: 'lower' },
  { key: 'machines', label: 'Machines', value: (m) => m.machines, format: count, better: null },
  { key: 'steps', label: 'Steps', value: (m) => m.steps, format: count, better: null },
  { key: 'emptySteps', label: 'Empty steps', value: (m) => m.emptySteps, format: count, better: 'lower' },
  { key: 'footprint', label: 'Machine footprint', value: (m) => m.area.footprint, format: percent, better: null },
  { key: 'operator', label: 'Operator areas', value: (m) => m.area.operator, format: percent, better: null },
  { key: 'clearance', label: 'Clearance', value: (m) => m.area.clearance, format: percent, better: null },
  { key: 'free', label: 'Free floor', value: (m) => m.area.free, format: percent, better: 'higher' },
  { key: 'errors', label: 'Errors', value: (m) => m.errors, format: count, better: 'lower' },
  { key: 'warnings', label: 'Warnings', value: (m) => m.warnings, format: count, better: 'lower' },
];

const EPS = 1e-9;

/** Indexes holding the best value; [] when nothing stands out (better=null, < 2 values, or all equal). */
export function bestIndexes(row: MetricRow, metrics: LayoutMetrics[]): number[] {
  if (!row.better) return [];
  const vals = metrics.map((m) => row.value(m));
  const present = vals.filter((v): v is number => v !== null);
  if (present.length < 2) return [];
  const best = row.better === 'lower' ? Math.min(...present) : Math.max(...present);
  if (present.every((v) => Math.abs(v - best) < EPS)) return [];
  return vals.flatMap((v, i) => (v !== null && Math.abs(v - best) < EPS ? [i] : []));
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/domain/compare.test.ts` then `npm test` and `npm run typecheck`
Expected: all PASS, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/domain/compare.ts src/domain/compare.test.ts
git commit -m "feat(domain): add layout metrics and best-value rows for comparison

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rule-based suggestions

**Files:**
- Create: `src/domain/recommend.ts`
- Test: `src/domain/recommend.test.ts`

**Interfaces:**
- Consumes: `areaBreakdown`, `stepTransitions`, `totalMovement` from `./analysis`; `findType` from `./catalogue`; `localToWorld` from `./geometry`; `validateLayout`, `LayoutWarning` from `./validation`.
- Produces:
  - `type SuggestionCode = 'SWAP_SAVES' | 'LONG_MOVE' | 'FLOWS_CROSS' | 'NOT_IN_WORKFLOW' | 'CROWDED'`
  - `interface Suggestion { code: SuggestionCode; text: string; machineIds: string[]; savingM?: number }`
  - `function recommend(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[]`

Rules (from the spec), in output order:
1. `SWAP_SAVES`: swap `x`/`y` of two machines that are both in some workflow step (rotations kept). Keep if Manhattan total drops by ≥ 1 m and the swapped layout has no error that the current layout lacks (error key = code + sorted machine ids + target id). Sorted by saving, at most 3. Validation runs only on candidates, best first, stopping at 3 accepted (keeps it fast).
2. `LONG_MOVE`: ≥ 2 transitions; transition Manhattan > 1.5 × mean and > 5 m. Longest first, at most 3.
3. `FLOWS_CROSS`: two flow segments (source output point → target input point) that properly intersect; pairs sharing a machine skipped. At most 3.
4. `NOT_IN_WORKFLOW`: machine in no step whose category is not `storage` or `utilities`.
5. `CROWDED`: free floor < 15 % of usable.

- [ ] **Step 1: Write the failing test**

`src/domain/recommend.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { createFactory } from './projectFile';
import { recommend } from './recommend';
import type { Factory, Layout, Machine, WorkflowStep } from './types';
import { deriveFlows } from './workflow';

const make = (typeId: string, x: number, y: number): Machine => createMachine(CATALOGUE.find((t) => t.id === typeId)!, x, y);
const saw = (x: number, y: number) => make('table-saw', x, y);
const factory = (over: Partial<Factory> = {}): Factory => ({ ...createFactory(), doors: [], ...over });
const layoutOf = (machines: Machine[], groups: Machine[][], f = factory()): Layout => {
  const workflow: WorkflowStep[] = groups.map((g, i) => ({ id: `s${i}`, name: `S${i}`, machineIds: g.map((m) => m.id) }));
  return { id: 'L', name: 'L', factory: f, machines, workflow, flows: deriveFlows(workflow) };
};
const P = { customTypes: [] };
const codes = (l: Layout) => recommend(l, P).map((s) => s.code);

describe('SWAP_SAVES', () => {
  // Order a -> b -> c. Now: a out 6 -> b in 19 = 13, b out 21 -> c in 9 = 12, total 25.
  // Swap b,c: 3 + 8 = 11 (saves 14). Swap a,b: 17 + 3 = 20 (saves 5). Swap a,c: 25 (saves 0).
  const a = saw(5, 10), b = saw(20, 10), c = saw(10, 10);

  test('best swaps first, with saving', () => {
    const swaps = recommend(layoutOf([a, b, c], [[a], [b], [c]]), P).filter((s) => s.code === 'SWAP_SAVES');
    expect(swaps).toHaveLength(2);
    expect(new Set(swaps[0].machineIds)).toEqual(new Set([b.id, c.id]));
    expect(swaps[0].savingM).toBeCloseTo(14, 6);
    expect(swaps[0].text).toContain('saves 14.0 m');
    expect(new Set(swaps[1].machineIds)).toEqual(new Set([a.id, b.id]));
  });

  test('a swap that creates a new error is rejected', () => {
    // b is a 4 m crosscut saw. Moving it to (10,10) would overlap the pillar at x 11.8..12.8 (saves 16, rejected).
    const big = make('crosscut-saw', 20, 10);
    const f = factory({ pillars: [{ id: 'p', x: 12.3, y: 10, sizeX: 1, sizeY: 1 }] });
    const swaps = recommend(layoutOf([a, big, c], [[a], [big], [c]], f), P).filter((s) => s.code === 'SWAP_SAVES');
    expect(swaps).toHaveLength(1);
    expect(new Set(swaps[0].machineIds)).toEqual(new Set([a.id, big.id]));
  });

  test('no swaps without at least two non-empty steps', () => {
    expect(codes(layoutOf([a, b], [[a, b]]))).not.toContain('SWAP_SAVES');
  });
});

describe('LONG_MOVE', () => {
  test('flags a transition far above the mean', () => {
    // 1 m then 20 m: mean 10.5, threshold 15.75.
    const a = saw(5, 10), b = saw(8, 10), c = saw(30, 10);
    const long = recommend(layoutOf([a, b, c], [[a], [b], [c]]), P).filter((s) => s.code === 'LONG_MOVE');
    expect(long).toHaveLength(1);
    expect(long[0].text).toBe('Step 2 → 3 (S1 → S2) is 20.0 m: move them closer');
    expect(long[0].machineIds).toEqual([b.id, c.id]);
  });

  test('even spacing gives no long move', () => {
    const a = saw(5, 10), b = saw(10, 10), c = saw(15, 10);
    expect(codes(layoutOf([a, b, c], [[a], [b], [c]]))).not.toContain('LONG_MOVE');
  });
});

describe('FLOWS_CROSS', () => {
  test('crossing segments are reported once', () => {
    // a->b runs (6,5)-(10,15); c->d runs (6,15)-(10,5); they cross at (8,10).
    const a = saw(5, 5), b = saw(11, 15), c = saw(5, 15), d = saw(11, 5);
    const cross = recommend(layoutOf([a, b, c, d], [[a], [b], [c], [d]]), P).filter((s) => s.code === 'FLOWS_CROSS');
    expect(cross).toHaveLength(1);
    expect(cross[0].machineIds).toEqual([a.id, c.id]);
    expect(cross[0].text).toContain('step 1');
    expect(cross[0].text).toContain('step 3');
  });

  test('a straight chain has no crossing', () => {
    const a = saw(5, 10), b = saw(10, 10), c = saw(15, 10);
    expect(codes(layoutOf([a, b, c], [[a], [b], [c]]))).not.toContain('FLOWS_CROSS');
  });
});

describe('NOT_IN_WORKFLOW', () => {
  test('production machine outside the workflow is listed; utilities are not', () => {
    const bandsaw = make('bandsaw', 5, 5), dust = make('dust-collector', 20, 5);
    const list = recommend(layoutOf([bandsaw, dust], []), P);
    expect(list).toEqual([{ code: 'NOT_IN_WORKFLOW', text: 'Bandsaw is not in the workflow', machineIds: [bandsaw.id] }]);
  });
});

describe('CROWDED', () => {
  test('free floor under 15 %', () => {
    // 3 x 2 floor; the saw's 0.6 m clearance covers it all.
    expect(codes(layoutOf([saw(1.5, 1)], [], factory({ length: 3, width: 2 })))).toContain('CROWDED');
  });
  test('roomy floor is not crowded', () => {
    expect(codes(layoutOf([saw(5, 10)], []))).not.toContain('CROWDED');
  });
});

describe('ordering', () => {
  test('swaps (by saving) before other suggestions', () => {
    const a = saw(5, 10), b = saw(20, 10), c = saw(10, 10), spare = make('bandsaw', 30, 5);
    expect(codes(layoutOf([a, b, c, spare], [[a], [b], [c]]))).toEqual(['SWAP_SAVES', 'SWAP_SAVES', 'NOT_IN_WORKFLOW']);
  });
  test('empty layout has no suggestions', () => {
    expect(recommend(layoutOf([], []), P)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/recommend.test.ts`
Expected: FAIL, cannot resolve `./recommend`.

- [ ] **Step 3: Write the implementation**

`src/domain/recommend.ts`:

```ts
import { areaBreakdown, stepTransitions, totalMovement } from './analysis';
import { findType } from './catalogue';
import { localToWorld } from './geometry';
import type { Layout, Machine, Point2, Project } from './types';
import { validateLayout, type LayoutWarning } from './validation';

export type SuggestionCode = 'SWAP_SAVES' | 'LONG_MOVE' | 'FLOWS_CROSS' | 'NOT_IN_WORKFLOW' | 'CROWDED';

export interface Suggestion {
  code: SuggestionCode;
  text: string;
  /** First id is selected on click; [] for CROWDED. */
  machineIds: string[];
  /** Manhattan metres saved (SWAP_SAVES only). */
  savingM?: number;
}

const LIMIT = 3;
const MIN_SWAP_SAVING = 1;
const LONG_FACTOR = 1.5;
const LONG_MIN = 5;
const CROWDED_PCT = 15;

const errorKeys = (ws: LayoutWarning[]) =>
  new Set(ws.filter((w) => w.severity === 'error').map((w) => `${w.code}|${[...w.machineIds].sort().join(',')}|${w.targetId ?? ''}`));

/**
 * ponytail: tries every pair of workflow machines (~435 layouts for 30 machines, each a totalMovement);
 * validation only runs on savers, best first. Pruned search if this gets measurably slow.
 */
function swaps(layout: Layout, base: number): Suggestion[] {
  const used = new Set(layout.workflow.flatMap((s) => s.machineIds));
  const ms = layout.machines.filter((m) => used.has(m.id));
  const cands: { a: Machine; b: Machine; saving: number; swapped: Layout }[] = [];
  for (let i = 0; i < ms.length; i++) {
    for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j];
      if (a.x === b.x && a.y === b.y) continue;
      const swapped: Layout = {
        ...layout,
        machines: layout.machines.map((m) => (m.id === a.id ? { ...m, x: b.x, y: b.y } : m.id === b.id ? { ...m, x: a.x, y: a.y } : m)),
      };
      const t = totalMovement(swapped);
      if (t && base - t.manhattan >= MIN_SWAP_SAVING) cands.push({ a, b, saving: base - t.manhattan, swapped });
    }
  }
  cands.sort((p, q) => q.saving - p.saving);
  const before = errorKeys(validateLayout(layout));
  const out: Suggestion[] = [];
  for (const c of cands) {
    if (out.length === LIMIT) break;
    if ([...errorKeys(validateLayout(c.swapped))].some((k) => !before.has(k))) continue;
    out.push({
      code: 'SWAP_SAVES',
      text: `Swap ${c.a.name} and ${c.b.name}: saves ${c.saving.toFixed(1)} m`,
      machineIds: [c.a.id, c.b.id],
      savingM: c.saving,
    });
  }
  return out;
}

function longMoves(layout: Layout): Suggestion[] {
  const ts = stepTransitions(layout);
  if (ts.length < 2) return [];
  const mean = ts.reduce((s, t) => s + t.manhattan, 0) / ts.length;
  const index = new Map(layout.workflow.map((s, i) => [s.id, i]));
  const placed = new Set(layout.machines.map((m) => m.id));
  return ts
    .filter((t) => t.manhattan > LONG_FACTOR * mean && t.manhattan > LONG_MIN)
    .sort((p, q) => q.manhattan - p.manhattan)
    .slice(0, LIMIT)
    .map((t) => {
      const i = index.get(t.fromStepId)!, j = index.get(t.toStepId)!;
      const from = layout.workflow[i], to = layout.workflow[j];
      return {
        code: 'LONG_MOVE' as const,
        text: `Step ${i + 1} → ${j + 1} (${from.name} → ${to.name}) is ${t.manhattan.toFixed(1)} m: move them closer`,
        machineIds: [...new Set([...from.machineIds, ...to.machineIds])].filter((id) => placed.has(id)),
      };
    });
}

const orient = (o: Point2, a: Point2, b: Point2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
/** Proper intersection only: touching or collinear segments do not count. */
const segmentsCross = (p1: Point2, p2: Point2, q1: Point2, q2: Point2) =>
  orient(q1, q2, p1) * orient(q1, q2, p2) < 0 && orient(p1, p2, q1) * orient(p1, p2, q2) < 0;

function crossings(layout: Layout): Suggestion[] {
  const byId = new Map(layout.machines.map((m) => [m.id, m]));
  const segs = layout.flows.flatMap((f) => {
    const a = byId.get(f.fromMachineId), b = byId.get(f.toMachineId);
    return a && b ? [{ step: f.label ?? '?', a, b, p: localToWorld(a, a.outputPoint), q: localToWorld(b, b.inputPoint) }] : [];
  });
  const out: Suggestion[] = [];
  for (let i = 0; i < segs.length && out.length < LIMIT; i++) {
    for (let j = i + 1; j < segs.length && out.length < LIMIT; j++) {
      const s = segs[i], t = segs[j];
      const ids = [s.a.id, s.b.id];
      if (ids.includes(t.a.id) || ids.includes(t.b.id)) continue;
      if (!segmentsCross(s.p, s.q, t.p, t.q)) continue;
      out.push({
        code: 'FLOWS_CROSS',
        text: `Flow from step ${s.step} (${s.a.name} → ${s.b.name}) crosses flow from step ${t.step} (${t.a.name} → ${t.b.name})`,
        machineIds: [s.a.id, t.a.id],
      });
    }
  }
  return out;
}

function notInWorkflow(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[] {
  const used = new Set(layout.workflow.flatMap((s) => s.machineIds));
  return layout.machines
    .filter((m) => !used.has(m.id))
    .filter((m) => {
      const cat = findType(project, m.typeId)?.category;
      return cat !== 'storage' && cat !== 'utilities';
    })
    .map((m) => ({ code: 'NOT_IN_WORKFLOW' as const, text: `${m.name} is not in the workflow`, machineIds: [m.id] }));
}

function crowded(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[] {
  if (!layout.machines.length) return [];
  const area = areaBreakdown(layout, project);
  const pct = area.usable ? (area.parts.free / area.usable) * 100 : 100;
  return pct < CROWDED_PCT ? [{ code: 'CROWDED', text: `Only ${Math.round(pct)}% of the floor is free`, machineIds: [] }] : [];
}

/** Text-only improvement hints for one layout; swaps (by saving) first, then rule order. */
export function recommend(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[] {
  const total = totalMovement(layout);
  return [
    ...(total ? swaps(layout, total.manhattan) : []),
    ...longMoves(layout),
    ...crossings(layout),
    ...notInWorkflow(layout, project),
    ...crowded(layout, project),
  ];
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/domain/recommend.test.ts` then `npm test` and `npm run typecheck`
Expected: all PASS, typecheck clean. If a fixture number is off, recheck it against the comments in the test (input = x − length/2, output = x + length/2) before changing the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/domain/recommend.ts src/domain/recommend.test.ts
git commit -m "feat(domain): add rule-based layout suggestions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Suggestions tab

**Files:**
- Modify: `src/store/uiStore.ts` (leftTab type)
- Create: `src/ui/SuggestionsPanel.tsx`
- Modify: `src/ui/LeftPanel.tsx`

**Interfaces:**
- Consumes: `recommend`, `Suggestion` (Task 2); `activeLayout`, `useProjectStore` from `../store/projectStore`; `useUiStore.focus`.
- Produces: `useSuggestions(): Suggestion[]`, `SuggestionsPanel` component; `LeftTab = 'library' | 'workflow' | 'suggestions'`.

- [ ] **Step 1: Widen the left tab type**

In `src/store/uiStore.ts`, after the `DialogName` line add:

```ts
export type LeftTab = 'library' | 'workflow' | 'suggestions';
```

and replace

```ts
  leftTab: 'library' | 'workflow';
  setLeftTab(t: 'library' | 'workflow'): void;
```

with

```ts
  leftTab: LeftTab;
  setLeftTab(t: LeftTab): void;
```

- [ ] **Step 2: Create the panel**

`src/ui/SuggestionsPanel.tsx`:

```tsx
import { recommend, type Suggestion } from '../domain/recommend';
import type { Layout, MachineType } from '../domain/types';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

const cache = new WeakMap<Layout, { types: MachineType[]; list: Suggestion[] }>();

/** recommend() for the active layout, cached per layout object so the tab badge and the panel share one run. */
export function useSuggestions(): Suggestion[] {
  const project = useProjectStore((s) => s.project);
  const layout = activeLayout(project);
  const hit = cache.get(layout);
  if (hit && hit.types === project.customTypes) return hit.list;
  const list = recommend(layout, project);
  cache.set(layout, { types: project.customTypes, list });
  return list;
}

export function SuggestionsPanel() {
  const list = useSuggestions();
  const focus = useUiStore((s) => s.focus);
  return (
    <div className="h-full overflow-y-auto border-r border-slate-700 bg-slate-900 p-2 text-slate-200">
      {list.length === 0 ? (
        <p className="p-2 text-xs text-slate-400">No suggestions</p>
      ) : (
        <ul className="space-y-1">
          {list.map((s, i) => (
            <li key={i}>
              <button
                className="w-full rounded border border-slate-700 px-2 py-1.5 text-left text-xs hover:bg-slate-800 disabled:cursor-default disabled:hover:bg-transparent"
                disabled={!s.machineIds.length}
                onClick={() => focus(s.machineIds[0])}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add the tab**

Replace `src/ui/LeftPanel.tsx` with:

```tsx
import { useUiStore } from '../store/uiStore';
import { LeftLibrary } from './LeftLibrary';
import { SuggestionsPanel, useSuggestions } from './SuggestionsPanel';
import { WorkflowPanel } from './WorkflowPanel';

const tab = (on: boolean) =>
  `flex-1 py-1.5 text-xs ${on ? 'border-b-2 border-sky-500 text-sky-200' : 'border-b border-slate-700 text-slate-400 hover:text-slate-200'}`;

export function LeftPanel() {
  const { leftTab, setLeftTab } = useUiStore();
  const count = useSuggestions().length;
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900">
      <div className="flex border-r border-slate-700">
        <button className={tab(leftTab === 'library')} aria-pressed={leftTab === 'library'} onClick={() => setLeftTab('library')}>Library</button>
        <button className={tab(leftTab === 'workflow')} aria-pressed={leftTab === 'workflow'} onClick={() => setLeftTab('workflow')}>Workflow</button>
        <button className={tab(leftTab === 'suggestions')} aria-pressed={leftTab === 'suggestions'} onClick={() => setLeftTab('suggestions')}>
          Suggestions{count ? ` (${count})` : ''}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {leftTab === 'library' ? <LeftLibrary /> : leftTab === 'workflow' ? <WorkflowPanel /> : <SuggestionsPanel />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck and tests**

Run: `npm run typecheck` and `npm test`
Expected: clean, all PASS.

- [ ] **Step 5: Browser checklist** (`npm run dev`)

- Load the "White part" layout template. Suggestions tab shows a count; opening it lists hints.
- Click a swap hint: the first machine is selected and the camera focuses it.
- Move a machine far away and drop it: list updates after the drop, not during the drag.
- Place a Bandsaw not in the workflow: "Bandsaw is not in the workflow" appears.
- Empty layout: tab label "Suggestions", panel "No suggestions".
- The tab bar still fits at the narrowest left-panel width (three tabs, no overflow).

- [ ] **Step 6: Commit**

```bash
git add src/store/uiStore.ts src/ui/SuggestionsPanel.tsx src/ui/LeftPanel.tsx
git commit -m "feat(ui): add Suggestions tab with layout hints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Compare dialog and README

**Files:**
- Modify: `src/store/uiStore.ts` (DialogName)
- Create: `src/ui/CompareDialog.tsx`
- Modify: `src/ui/TopToolbar.tsx`, `src/App.tsx`, `README.md`

**Interfaces:**
- Consumes: `layoutMetrics`, `METRIC_ROWS`, `bestIndexes`, `LayoutMetrics` (Task 1); `Dialog`, `btn` from `./Dialog`; `useProjectStore.setActiveLayout`.
- Produces: `CompareDialog` component; `DialogName` includes `'compare'`.

- [ ] **Step 1: Add the dialog name**

In `src/store/uiStore.ts` replace

```ts
export type DialogName = 'factory' | 'projects' | 'customType';
```

with

```ts
export type DialogName = 'factory' | 'projects' | 'customType' | 'compare';
```

- [ ] **Step 2: Create the dialog**

`src/ui/CompareDialog.tsx`:

```tsx
import { useState } from 'react';
import { bestIndexes, layoutMetrics, METRIC_ROWS, type LayoutMetrics } from '../domain/compare';
import type { Layout, Project } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Dialog, btn } from './Dialog';

// Metrics do not depend on custom-type categories, so the layout object alone is a safe key.
const cache = new WeakMap<Layout, LayoutMetrics>();
function metricsOf(layout: Layout, project: Pick<Project, 'customTypes'>): LayoutMetrics {
  let m = cache.get(layout);
  if (!m) cache.set(layout, (m = layoutMetrics(layout, project)));
  return m;
}

export function CompareDialog() {
  const project = useProjectStore((s) => s.project);
  const setActiveLayout = useProjectStore((s) => s.setActiveLayout);
  const close = () => useUiStore.getState().openDialog(null);
  const [ticked, setTicked] = useState(() => new Set(project.layouts.map((l) => l.id)));
  const shown = project.layouts.filter((l) => ticked.has(l.id));
  const metrics = shown.map((l) => metricsOf(l, project));
  const toggle = (id: string) =>
    setTicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Dialog title="Compare layouts" onClose={close} wide>
      <div className="mb-3 flex flex-wrap gap-3">
        {project.layouts.map((l) => (
          <label key={l.id} className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={ticked.has(l.id)} onChange={() => toggle(l.id)} />
            {l.name}
          </label>
        ))}
      </div>
      {shown.length < 2 ? (
        <p className="text-xs text-slate-400">Tick at least two layouts to compare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th />
                {shown.map((l) => (
                  <th key={l.id} className="px-2 py-1 text-left align-top font-medium">
                    <div className="mb-1">{l.name}</div>
                    {l.id === project.activeLayoutId ? (
                      <span className="text-sky-300">Active</span>
                    ) : (
                      <button className={btn} onClick={() => { setActiveLayout(l.id); close(); }}>Switch</button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => {
                const best = bestIndexes(row, metrics);
                return (
                  <tr key={row.key} className="border-t border-slate-800">
                    <td className="whitespace-nowrap py-1 pr-2 text-slate-400">{row.label}</td>
                    {metrics.map((m, i) => {
                      const v = row.value(m);
                      return (
                        <td key={shown[i].id} className={`px-2 py-1 ${best.includes(i) ? 'bg-green-900/50 text-green-200' : ''}`}>
                          {v === null ? '—' : row.format(v)}
                          {row.key === 'longest' && m.longest && (
                            <div className="text-[10px] text-slate-400">{m.longest.from} → {m.longest.to}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 3: Toolbar button**

In `src/ui/TopToolbar.tsx`, after the line

```tsx
      <button className={btn} onClick={() => ui.openDialog('projects')}>Projects</button>
```

add

```tsx
      <button
        className={btn}
        onClick={() => ui.openDialog('compare')}
        disabled={project.layouts.length < 2}
        title={project.layouts.length < 2 ? 'Add a second layout to compare' : 'Compare layouts side by side'}
      >
        Compare
      </button>
```

- [ ] **Step 4: Mount the dialog**

In `src/App.tsx` add the import next to the other dialog imports:

```tsx
import { CompareDialog } from './ui/CompareDialog';
```

and after `{dialog === 'customType' && <CustomTypeDialog />}` add:

```tsx
      {dialog === 'compare' && <CompareDialog />}
```

- [ ] **Step 5: README**

In `README.md`, insert directly before `## Run locally`:

```markdown
## Layout comparison and suggestions (Phase 3a)

- **Compare** (toolbar, needs two or more layouts): tick layouts to put side by side. Rows: material movement (Manhattan and straight-line), longest move with its steps, machines, steps, empty steps, footprint / operator / clearance / free floor %, errors and warnings. The best value per row is green; **Switch** makes a layout active.
- **Suggestions tab** (left panel): hints for the active layout. Machine swaps that cut material movement by 1 m or more without creating new errors (top 3, with the saving), unusually long moves between steps, crossing flows, production machines not in the workflow, and a crowded floor (under 15 % free). Click a hint to select its machine; nothing is moved for you.

```

- [ ] **Step 6: Typecheck and tests**

Run: `npm run typecheck` and `npm test`
Expected: clean, all PASS.

- [ ] **Step 7: Browser checklist** (`npm run dev`)

- Project with one layout: Compare is disabled, tooltip says to add a second layout.
- Duplicate the layout, move one machine far away in the copy. Compare shows both columns; the original wins Material movement (green); the active column says "Active", the other has Switch.
- Untick one layout: table replaced by "Tick at least two layouts to compare."
- Switch closes the dialog and the toolbar layout select shows the new layout.
- Layout with an empty workflow shows "—" for movement and longest move, and those cells are never green.
- Dialog scrolls horizontally with 5+ layouts rather than overflowing the window.

- [ ] **Step 8: Commit**

```bash
git add src/store/uiStore.ts src/ui/CompareDialog.tsx src/ui/TopToolbar.tsx src/App.tsx README.md
git commit -m "feat(ui): add layout Compare dialog; document Phase 3a

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Final verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Full checks**

Run: `npm test`, `npm run typecheck`, `npm run build`
Expected: all tests pass (108 from Phase 2 plus the new compare and recommend tests), typecheck clean, build succeeds.

- [ ] **Step 2: Performance spot check**

In the dev server, load the "Full chair" template layout (largest built-in), open the Suggestions tab, drag and drop a machine. The drop must feel instant (no visible stall). If it stalls, record the time from `console.time` around `recommend` and report it; do not optimise beyond the spec without asking.

- [ ] **Step 3: Diff review**

Run: `git diff main --stat`
Expected: only the files in the file map above.

- [ ] **Step 4: Report**

Write a short report: commands run with results, checklist items verified, anything skipped.
