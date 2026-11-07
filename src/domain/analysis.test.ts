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
