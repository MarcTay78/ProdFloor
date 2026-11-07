import { describe, expect, test } from 'vitest';
import { createFactory } from './projectFile';
import { WHITE_PART_STEPS, WHITE_PART_SUPPORT, createWhitePartLayout } from './templates';
import { validateLayout } from './validation';

describe('white part template', () => {
  test('default factory: every machine placed, no warnings at all', () => {
    const l = createWhitePartLayout(createFactory(), { customTypes: [] });
    expect(l.machines.map((m) => m.typeId)).toEqual([...WHITE_PART_STEPS, ...WHITE_PART_SUPPORT]);
    expect(validateLayout(l)).toEqual([]);
  });

  test('flows chain the line in order', () => {
    const l = createWhitePartLayout(createFactory(), { customTypes: [] });
    expect(l.flows).toHaveLength(WHITE_PART_STEPS.length - 1);
    l.flows.forEach((f, i) => {
      expect(f.fromMachineId).toBe(l.machines[i].id);
      expect(f.toMachineId).toBe(l.machines[i + 1].id);
    });
  });

  test('wraps into a U: second lane runs back west at rotation 180', () => {
    const l = createWhitePartLayout(createFactory(), { customTypes: [] });
    const lane2 = l.machines.slice(0, WHITE_PART_STEPS.length).filter((m) => m.rotation === 180);
    expect(lane2.length).toBeGreaterThan(0);
    const xs = lane2.map((m) => m.x);
    expect([...xs].sort((a, b) => b - a)).toEqual(xs);
  });

  test('bigger building fits more per lane', () => {
    const f = { ...createFactory(), length: 80, width: 30 };
    const l = createWhitePartLayout(f, { customTypes: [] });
    expect(l.machines.every((m) => m.rotation === 0)).toBe(true);
    expect(validateLayout(l)).toEqual([]);
  });
});
