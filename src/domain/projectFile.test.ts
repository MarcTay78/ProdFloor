import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { asNewProject, createProject, migrateProject, parseProjectFile, serializeProject } from './projectFile';

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

  test('old file without workflow: built from the flow chain, no notice', () => {
    const p: any = sample();
    const l = p.layouts[0];
    l.machines.push(createMachine(CATALOGUE[4], 9, 5));
    l.flows = [{ id: 'f', fromMachineId: l.machines[0].id, toMachineId: l.machines[1].id }];
    delete l.workflow;
    delete p.workflowTemplates;
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 1, project: p }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const out = r.file.project.layouts[0];
      expect(out.workflow.map((s) => s.machineIds)).toEqual([[l.machines[0].id], [l.machines[1].id]]);
      expect(out.flows).toHaveLength(1);
      expect(r.file.project.workflowTemplates).toEqual([]);
      expect(r.notices).toEqual([]);
    }
  });

  test('unknown machine ids in steps are stripped with a notice', () => {
    const p = sample();
    const m = p.layouts[0].machines[0];
    p.layouts[0].workflow = [{ id: 's1', name: 'Saw', machineIds: [m.id, 'ghost'] }];
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.project.layouts[0].workflow[0].machineIds).toEqual([m.id]);
      expect(r.notices[0]).toMatch(/1 unknown machine/);
    }
  });

  test('duplicate step ids are rejected', () => {
    const p = sample();
    p.layouts[0].workflow = [{ id: 's', name: 'A', machineIds: [] }, { id: 's', name: 'B', machineIds: [] }];
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes('duplicate step id'))).toBe(true);
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

describe('migrateProject', () => {
  test('a current project passes through unchanged', () => {
    const p = sample();
    const before = structuredClone(p);
    expect(migrateProject(p)).toEqual({ project: before, notices: [] });
  });
});
