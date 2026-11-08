import { describe, expect, test } from 'vitest';
import { CATALOGUE, CATEGORIES, allTypes, createMachine, findType } from './catalogue';

describe('catalogue', () => {
  test('has 39 built-in types with unique ids', () => {
    expect(CATALOGUE).toHaveLength(39);
    expect(new Set(CATALOGUE.map((t) => t.id)).size).toBe(39);
  });

  test('every type has positive dimensions and a known category', () => {
    for (const t of CATALOGUE) {
      expect(t.defaults.length).toBeGreaterThan(0);
      expect(t.defaults.width).toBeGreaterThan(0);
      expect(t.defaults.height).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(t.category);
    }
  });

  test('spray booth uses 1.0 m clearance, dust collector has no operator area', () => {
    expect(findType({ customTypes: [] }, 'spray-booth')!.defaults.clearance.front).toBe(1.0);
    expect(findType({ customTypes: [] }, 'dust-collector')!.defaults.operatorArea.depth).toBe(0);
  });

  test('createMachine copies defaults, centres at x,y, and does not share objects', () => {
    const type = findType({ customTypes: [] }, 'bandsaw')!;
    const a = createMachine(type, 5, 3);
    const b = createMachine(type, 5, 3);
    expect(a).toMatchObject({ typeId: 'bandsaw', name: 'Bandsaw', x: 5, y: 3, rotation: 0, length: 1.2, width: 0.9, height: 2.1 });
    expect(a.inputPoint).toEqual({ x: -0.6, y: 0 });
    expect(a.outputPoint).toEqual({ x: 0.6, y: 0 });
    expect(a.id).not.toBe(b.id);
    a.clearance.front = 9;
    expect(type.defaults.clearance.front).toBe(0.6);
  });

  test('custom types are found after built-ins', () => {
    const custom = { ...CATALOGUE[0], id: 'my-saw', name: 'My saw', category: 'custom' as const };
    expect(allTypes({ customTypes: [custom] })).toHaveLength(40);
    expect(findType({ customTypes: [custom] }, 'my-saw')!.name).toBe('My saw');
  });
});
