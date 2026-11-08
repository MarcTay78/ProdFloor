import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { createFactory } from './projectFile';
import { autoArrange, recommend } from './recommend';
import { totalMovement } from './analysis';
import { validateLayout } from './validation';
import type { Factory, Layout, Machine, WorkflowStep } from './types';
import { deriveFlows } from './workflow';

const make = (typeId: string, x: number, y: number): Machine => createMachine(CATALOGUE.find((t) => t.id === typeId)!, x, y);
const saw = (x: number, y: number) => make('table-saw', x, y);
const factory = (over: Partial<Factory> = {}): Factory => ({ ...createFactory(), doors: [], ...over });
const layoutOf = (machines: Machine[], groups: Machine[][], f = factory()): Layout => {
  const workflow: WorkflowStep[] = groups.map((g, i) => ({ id: `s${i}`, name: `S${i}`, machineIds: g.map((m) => m.id) }));
  return { id: 'L', name: 'L', factory: f, machines, workflow, flows: deriveFlows(workflow), areas: [] };
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

describe('autoArrange', () => {
  test('applies the best swap and stops when nothing else helps', () => {
    // Same fixture as SWAP_SAVES: swapping b and c saves 14 m, after which no swap saves >= 1 m.
    const a = saw(5, 10), b = saw(20, 10), c = saw(10, 10);
    const l = layoutOf([a, b, c], [[a], [b], [c]]);
    const r = autoArrange(l);
    expect(r.swaps).toBe(1);
    expect(r.saved).toBeCloseTo(14, 6);
    expect(r.layout.machines.find((m) => m.id === b.id)).toMatchObject({ x: 10, y: 10 });
    expect(l.machines.find((m) => m.id === b.id)).toMatchObject({ x: 20, y: 10 });
  });

  test('scrambled chain improves and gains no errors', () => {
    // Six saws in a row, workflow order scrambled against the positions.
    const ms = [5, 10, 15, 20, 25, 30].map((x) => saw(x, 10));
    const order = [3, 0, 5, 1, 4, 2].map((i) => ms[i]);
    const l = layoutOf(ms, order.map((m) => [m]));
    const r = autoArrange(l);
    expect(r.swaps).toBeGreaterThan(0);
    expect(totalMovement(r.layout)!.manhattan).toBeCloseTo(totalMovement(l)!.manhattan - r.saved, 6);
    expect(validateLayout(r.layout).filter((w) => w.severity === 'error')).toEqual([]);
  });

  test('no workflow: unchanged, zero swaps', () => {
    const l = layoutOf([saw(5, 10)], []);
    expect(autoArrange(l)).toEqual({ layout: l, swaps: 0, saved: 0 });
  });
});
