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
  operatorArea: { side: 'front', depth: 0, width: 0 },
  ...over,
});

const layout = (machines: Machine[], f: Factory = factory()): Layout => ({ id: 'L', name: 'L', factory: f, machines, workflow: [], flows: [], areas: [], workers: [] });
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

  test('a roller conveyor links machines: touching or overlapping them is not a problem', () => {
    // Saw at x 4..6 with clearance and an operator area; conveyor x 5.8..7.3 overlaps its end and its zones.
    const saw = box(5, 5, 2, 1, { clearance: { front: 0.6, back: 0.6, left: 0.6, right: 0.6 }, operatorArea: { side: 'right', depth: 0.9, width: 1 } });
    const conveyor = { ...createMachine(CATALOGUE.find((t) => t.id === 'roller-conveyor')!, 6.55, 5), length: 1.5, width: 1 };
    expect(validateLayout(layout([saw, conveyor]))).toEqual([]);
    // Same spot with an ordinary machine is still an error.
    const other = box(6.55, 5, 1.5, 1);
    expect(codes(layout([saw, other]))).toContain('MACHINE_OVERLAP');
  });

  test('a conveyor still has to stay inside the building', () => {
    const conveyor = createMachine(CATALOGUE.find((t) => t.id === 'roller-conveyor')!, 19.6, 5);
    expect(codes(layout([conveyor]))).toEqual(['OUTSIDE_BUILDING']);
  });

  test('an overhead conveyor passes over machines, pillars and door access areas', () => {
    const f = factory({
      pillars: [{ id: 'p', x: 8, y: 5, sizeX: 0.4, sizeY: 0.4 }],
      doors: [{ id: 'd', name: 'Door', wall: 'south', offset: 8, width: 2, height: 2.2, keepClear: 6 }],
    });
    const line = { ...createMachine(CATALOGUE.find((t) => t.id === 'overhead-conveyor')!, 7, 5), length: 6 };
    expect(validateLayout(layout([box(6, 5), line], f))).toEqual([]);
  });

  test('an overhead slope with a set drop height warns only when its top is above the ceiling', () => {
    const drop = createMachine(CATALOGUE.find((t) => t.id === 'overhead-conveyor-down')!, 7, 5);
    expect(codes(layout([{ ...drop, rise: 1.5 }]))).toEqual([]);
    expect(codes(layout([{ ...drop, rise: 3.5 }]))).toEqual(['TOO_TALL']);
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

  test('zone crossing ignores internal walls the footprint itself overlaps', () => {
    const f = factory({ internalWalls: [{ id: 'w1', x1: 5, y1: 0, x2: 5, y2: 10, thickness: 0.2, height: 3 }] });
    const w = validateLayout(layout([box(5, 5)], f));
    expect(w.map((x) => [x.code, x.targetId])).toEqual([['OBSTACLE_OVERLAP', 'w1']]);
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
