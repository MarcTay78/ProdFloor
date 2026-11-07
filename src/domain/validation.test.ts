import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import type { Factory, Layout, Machine } from './types';
import { doorKeepClearRect, validateLayout } from './validation';

const factory = (over: Partial<Factory> = {}): Factory => ({
  length: 20, width: 10, ceilingHeight: 6, wallThickness: 0.3,
  internalWalls: [], doors: [], windows: [], pillars: [], restrictedZones: [], ...over,
});

const box = (x: number, y: number, l = 2, w = 1, over: Partial<Machine> = {}): Machine => ({
  ...createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y),
  length: l, width: w, height: 1,
  clearance: { front: 0, back: 0, left: 0, right: 0 },
  ...over,
});

const layout = (machines: Machine[], f: Factory = factory()): Layout => ({ id: 'L', name: 'L', factory: f, machines, workflow: [], flows: [] });
const codes = (l: Layout) => validateLayout(l).map((w) => w.code).sort();

describe('validateLayout', () => {
  test('clean layout has no warnings', () => {
    expect(validateLayout(layout([box(5, 5), box(10, 5)]))).toEqual([]);
  });

  test('machine crossing the outer wall', () => {
    const w = validateLayout(layout([box(19.5, 5)]));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'OUTSIDE_BUILDING', severity: 'error' });
  });

  test('machine taller than ceiling', () => {
    expect(codes(layout([box(5, 5, 2, 1, { height: 7 })]))).toEqual(['TOO_TALL']);
  });

  test('two overlapping machines produce one pair warning', () => {
    const a = box(5, 5), b = box(6, 5);
    const w = validateLayout(layout([a, b]));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'MACHINE_OVERLAP', severity: 'error' });
    expect(w[0].machineIds.sort()).toEqual([a.id, b.id].sort());
  });

  test('machines touching edge to edge are fine', () => {
    expect(validateLayout(layout([box(5, 5), box(7, 5)]))).toEqual([]);
  });

  test('overlap with pillar, internal wall and restricted zone', () => {
    const f = factory({
      pillars: [{ id: 'p1', x: 5, y: 5, sizeX: 0.4, sizeY: 0.4 }],
      internalWalls: [{ id: 'w1', x1: 10, y1: 0, x2: 10, y2: 6, thickness: 0.2, height: 3 }],
      restrictedZones: [{ id: 'z1', name: 'Electrical', x: 14, y: 4, length: 2, width: 2 }],
    });
    const w = validateLayout(layout([box(5, 5), box(10, 3), box(15, 5)], f));
    expect(w.map((x) => [x.code, x.targetId])).toEqual([
      ['OBSTACLE_OVERLAP', 'p1'], ['OBSTACLE_OVERLAP', 'w1'], ['OBSTACLE_OVERLAP', 'z1'],
    ]);
  });

  test('machine in door keep-clear zone', () => {
    const f = factory({
      doors: [{ id: 'd1', name: 'Loading', wall: 'south', offset: 5, width: 4, height: 4, kind: 'loading', keepClear: 4 }],
    });
    const w = validateLayout(layout([box(5, 2)], f));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'DOOR_BLOCKED', severity: 'warning', targetId: 'd1' });
  });

  test('neighbour inside operating clearance (but not overlapping footprint)', () => {
    const a = box(5, 5, 2, 1, { clearance: { front: 1, back: 0, left: 0, right: 0 } });
    const b = box(5, 6.4);
    const w = validateLayout(layout([a, b]));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'CLEARANCE_INTRUSION', severity: 'warning', machineIds: [a.id, b.id] });
  });
});

describe('doorKeepClearRect', () => {
  const f = factory();
  const d = { id: 'd', name: 'D', offset: 4, width: 2, height: 2, keepClear: 1.5 };
  test('south', () => expect(doorKeepClearRect(f, { ...d, wall: 'south' })).toMatchObject({ cx: 4, cy: 0.75, length: 2, width: 1.5 }));
  test('north', () => expect(doorKeepClearRect(f, { ...d, wall: 'north' })).toMatchObject({ cx: 4, cy: 9.25 }));
  test('west', () => expect(doorKeepClearRect(f, { ...d, wall: 'west' })).toMatchObject({ cx: 0.75, cy: 4, length: 1.5, width: 2 }));
  test('east', () => expect(doorKeepClearRect(f, { ...d, wall: 'east' })).toMatchObject({ cx: 19.25, cy: 4 }));
});
