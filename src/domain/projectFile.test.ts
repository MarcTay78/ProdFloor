import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { asNewProject, createProject, parseProjectFile, serializeProject } from './projectFile';

const sample = () => {
  const p = createProject('Test factory');
  p.layouts[0].machines.push(createMachine(CATALOGUE[3], 5, 5));
  return p;
};

describe('createProject', () => {
  test('has one active layout with default factory', () => {
    const p = createProject('A');
    expect(p.layouts).toHaveLength(1);
    expect(p.activeLayoutId).toBe(p.layouts[0].id);
    expect(p.layouts[0].factory).toMatchObject({ length: 40, width: 20, ceilingHeight: 6 });
    expect(p.layouts[0].factory.doors).toHaveLength(2);
    expect(p.typeModels).toEqual({});
  });
});

describe('serialize / parse', () => {
  test('round trip', () => {
    const p = sample();
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.project).toEqual(p);
  });

  test('rejects non-JSON', () => {
    expect(parseProjectFile('nope')).toEqual({ ok: false, errors: ['File is not valid JSON'] });
  });

  test('rejects unknown schema version', () => {
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 99, project: sample() }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/schemaVersion/);
  });

  test('lists field problems', () => {
    const p = sample();
    p.layouts[0].factory.length = -1;
    p.layouts[0].machines[0].width = 0.01;
    p.layouts[0].machines.push({ ...p.layouts[0].machines[0] });
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('factory.length'))).toBe(true);
      expect(r.errors.some((e) => e.includes('width'))).toBe(true);
      expect(r.errors.some((e) => e.includes('duplicate machine id'))).toBe(true);
    }
  });

  test('fills missing optional collections from older files', () => {
    const p: any = sample();
    delete p.typeModels;
    delete p.layouts[0].flows;
    delete p.layouts[0].factory.windows;
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 1, project: p }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.project.typeModels).toEqual({});
      expect(r.file.project.layouts[0].flows).toEqual([]);
      expect(r.file.project.layouts[0].factory.windows).toEqual([]);
    }
  });
});

describe('asNewProject', () => {
  test('new id, keeps content', () => {
    const p = sample();
    const c = asNewProject(p, 'Copy');
    expect(c.id).not.toBe(p.id);
    expect(c.name).toBe('Copy');
    expect(c.layouts).toEqual(p.layouts);
    expect(c.layouts).not.toBe(p.layouts);
  });
});
