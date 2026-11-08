import { describe, expect, test } from 'vitest';
import { AREA_COLORS, areaBounds, nextAreaColor } from './areas';
import { CATALOGUE, createMachine } from './catalogue';
import { createLayout, migrateProject, createProject } from './projectFile';
import type { Machine } from './types';

// table-saw: 2.0 x 1.6 m.
const saw = (x: number, y: number, areaId?: string, rotation = 0): Machine => ({ ...createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y), rotation, areaId });

describe('areaBounds', () => {
  const layout = { ...createLayout(), areas: [{ id: 'cut', name: 'Cutting', color: '#f00' }, { id: 'empty', name: 'Empty', color: '#0f0' }] };

  test('box around member footprints plus padding; empty areas skipped', () => {
    const l = { ...layout, machines: [saw(5, 5, 'cut'), saw(10, 8, 'cut'), saw(20, 10)] };
    const [b, ...rest] = areaBounds(l, 0.5);
    expect(rest).toEqual([]);
    expect(b.area.name).toBe('Cutting');
    expect(b.count).toBe(2);
    // x 4..11, y 4.2..8.8, padded 0.5.
    expect(b.minX).toBeCloseTo(3.5, 6);
    expect(b.maxX).toBeCloseTo(11.5, 6);
    expect(b.minY).toBeCloseTo(3.7, 6);
    expect(b.maxY).toBeCloseTo(9.3, 6);
  });

  test('rotation is taken into account', () => {
    const [b] = areaBounds({ ...layout, machines: [saw(5, 5, 'cut', 90)] }, 0);
    expect(b.maxX - b.minX).toBeCloseTo(1.6, 6);
    expect(b.maxY - b.minY).toBeCloseTo(2.0, 6);
  });
});

test('nextAreaColor cycles through the palette', () => {
  expect(nextAreaColor([])).toBe(AREA_COLORS[0]);
  expect(nextAreaColor([{ id: 'a', name: 'A', color: AREA_COLORS[0] }])).toBe(AREA_COLORS[1]);
});

describe('migration', () => {
  test('missing areas filled; unknown areaId unassigned with a notice', () => {
    const p: any = createProject('T');
    delete p.layouts[0].areas;
    p.layouts[0].machines = [{ ...saw(5, 5), areaId: 'ghost' }];
    const { project, notices } = migrateProject(p);
    expect(project.layouts[0].areas).toEqual([]);
    expect(project.layouts[0].machines[0].areaId).toBeUndefined();
    expect(notices.join()).toMatch(/missing process area/);
  });
});
