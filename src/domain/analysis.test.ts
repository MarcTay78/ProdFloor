import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { areaBreakdown, flowDistances, linkDistance, stepTransitions, totalMovement } from './analysis';
import { createFactory } from './projectFile';
import type { Factory, Layout, Machine, WorkflowStep } from './types';
import { deriveFlows } from './workflow';

// table-saw: length 2.0, so input point (-1, 0) and output point (1, 0) in local coordinates.
const saw = (x: number, y: number, rotation = 0): Machine => ({ ...createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y), rotation });
const layoutOf = (machines: Machine[], groups: Machine[][]): Layout => {
  const workflow: WorkflowStep[] = groups.map((g, i) => ({ id: `s${i}`, name: `S${i}`, machineIds: g.map((m) => m.id) }));
  return { id: 'L', name: 'L', factory: createFactory(), machines, workflow, flows: deriveFlows(workflow), areas: [] };
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
    const r = areaBreakdown({ id: 'L', name: 'L', factory: f, machines: [m], workflow: [], flows: [], areas: [] }, { customTypes: [] });
    near(r.usable, 99);
    near(r.parts.footprint, 2);
    near(r.parts.operator, 1.8);
    near(r.parts.clearance, 3);
    near(r.parts.keepClear, 2);
    near(r.parts.free, 99 - 2 - 1.8 - 3 - 2);
    near(r.footprintByCategory.cutting!, 2);
  });

  test('empty floor is all free', () => {
    const r = areaBreakdown({ id: 'L', name: 'L', factory: { ...f, pillars: [], doors: [] }, machines: [], workflow: [], flows: [], areas: [] }, { customTypes: [] });
    near(r.usable, 100);
    near(r.parts.free, 100);
  });
});
