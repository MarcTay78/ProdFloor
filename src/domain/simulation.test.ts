import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { createFactory } from './projectFile';
import { partRoute, positionAt, routeDuration } from './simulation';
import type { Layout, Machine, WorkflowStep } from './types';
import { deriveFlows } from './workflow';

// table-saw: input (x-1, y), output (x+1, y).
const saw = (x: number, y: number): Machine => createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y);
const layoutOf = (machines: Machine[], groups: Machine[][]): Layout => {
  const workflow: WorkflowStep[] = groups.map((g, i) => ({ id: `s${i}`, name: `S${i}`, machineIds: g.map((m) => m.id) }));
  return { id: 'L', name: 'L', factory: createFactory(), machines, workflow, flows: deriveFlows(workflow), areas: [], workers: [] };
};

describe('partRoute', () => {
  const a = saw(5, 10), b = saw(10, 10), c1 = saw(15, 5), c2 = saw(15, 15);

  test('dwell at each machine centre, move straight centre to centre', () => {
    // a: dwell at (5,10); move (5,10)->(10,10) 5 m; b: dwell at (10,10).
    const r = partRoute(layoutOf([a, b], [[a], [b]]), 0, 1, 1);
    expect(r.map((l) => l.kind)).toEqual(['dwell', 'move', 'dwell']);
    expect(r[1]).toMatchObject({ from: { x: 5, y: 10 }, to: { x: 10, y: 10 }, duration: 5 });
    expect(routeDuration(r)).toBeCloseTo(7, 6);
  });

  test('parallel machines take turns by part number; empty steps skipped', () => {
    const l = layoutOf([a, c1, c2], [[a], [], [c1, c2]]);
    expect(partRoute(l, 0, 1, 1)[1].to).toEqual({ x: 15, y: 5 });
    expect(partRoute(l, 1, 1, 1)[1].to).toEqual({ x: 15, y: 15 });
    expect(partRoute(l, 2, 1, 1)[1].to).toEqual({ x: 15, y: 5 });
  });

  test('same machine in consecutive steps: no move between', () => {
    expect(partRoute(layoutOf([a], [[a], [a]]), 0, 1, 1).map((l) => l.kind)).toEqual(['dwell', 'dwell']);
  });

  test('speed scales move time', () => {
    expect(partRoute(layoutOf([a, b], [[a], [b]]), 0, 2, 1)[1].duration).toBeCloseTo(2.5, 6);
  });

  test('no workflow: empty route', () => {
    expect(partRoute(layoutOf([a], []), 0)).toEqual([]);
  });
});

describe('positionAt', () => {
  const a = saw(5, 10), b = saw(10, 10);
  const r = partRoute(layoutOf([a, b], [[a], [b]]), 0, 1, 1);

  test('interpolates within legs', () => {
    expect(positionAt(r, 0)).toEqual({ x: 5, y: 10 });
    expect(positionAt(r, 0.5)!.x).toBeCloseTo(5, 6);
    expect(positionAt(r, 3.5)!.x).toBeCloseTo(7.5, 6);
  });
  test('null before start and after the end', () => {
    expect(positionAt(r, -0.1)).toBeNull();
    expect(positionAt(r, 7.01)).toBeNull();
  });
});
