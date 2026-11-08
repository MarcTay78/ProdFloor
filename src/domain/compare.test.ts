import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { bestIndexes, layoutMetrics, METRIC_ROWS, type LayoutMetrics, type MetricRow } from './compare';
import { createFactory } from './projectFile';
import type { Layout, Machine, WorkflowStep } from './types';
import { deriveFlows } from './workflow';

const saw = (x: number, y: number): Machine => createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y);
const layoutOf = (machines: Machine[], groups: Machine[][]): Layout => {
  const workflow: WorkflowStep[] = groups.map((g, i) => ({ id: `s${i}`, name: `S${i}`, machineIds: g.map((m) => m.id) }));
  return { id: 'L', name: 'L', factory: { ...createFactory(), doors: [] }, machines, workflow, flows: deriveFlows(workflow), areas: [], workers: [] };
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
