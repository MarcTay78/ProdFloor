import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { createFactory } from './projectFile';
import { facing, partRoute, pathLength, positionAt, routeDuration, walkLoop, walkPose } from './simulation';
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

describe('worker walking loop', () => {
  // Start (0,0) -> (3,0) -> (3,4) -> back to (0,0): 3 + 4 + 5 = 12 m at 1.2 m/s.
  const w = { x: 0, y: 0, path: [{ x: 3, y: 0 }, { x: 3, y: 4 }] };

  test('no path, no loop', () => {
    expect(walkLoop({ x: 0, y: 0, path: [] })).toEqual([]);
    expect(pathLength({ x: 0, y: 0, path: [] })).toBe(0);
    expect(walkPose([], 3)).toBeNull();
  });

  test('loop returns to the start and has the right length', () => {
    const legs = walkLoop(w);
    expect(legs).toHaveLength(3);
    expect(legs[2].to).toEqual({ x: 0, y: 0 });
    expect(pathLength(w)).toBeCloseTo(12, 6);
  });

  test('speed can be set (forklifts drive faster)', () => {
    const legs = walkLoop(w, 2);
    expect(legs[0].duration).toBeCloseTo(1.5, 6); // 3 m at 2 m/s
  });

  test('pose moves along legs, faces travel direction and wraps', () => {
    const legs = walkLoop(w);
    const east = walkPose(legs, 1.5 / 1.2)!;
    expect(east.x).toBeCloseTo(1.5, 6);
    expect(east.y).toBeCloseTo(0, 6);
    expect(east.rotation).toBeCloseTo(90, 6);
    const north = walkPose(legs, 4 / 1.2)!; // 1 m into the second leg
    expect(north.y).toBeCloseTo(1, 6);
    expect(north.rotation).toBeCloseTo(180, 6);
    const again = walkPose(legs, 10 + 1.5 / 1.2)!; // one full loop is 10 s
    expect(again.x).toBeCloseTo(1.5, 6);
  });
});

describe('facing', () => {
  test('degrees in the worker rotation convention', () => {
    expect(facing(0, -1)).toBeCloseTo(0, 6); // south
    expect(facing(1, 0)).toBeCloseTo(90, 6); // east
    expect(facing(0, 1)).toBeCloseTo(180, 6); // north
    expect(facing(-1, 0)).toBeCloseTo(270, 6); // west
  });
});
