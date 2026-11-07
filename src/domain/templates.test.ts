import { describe, expect, test } from 'vitest';
import { CATALOGUE } from './catalogue';
import { createFactory } from './projectFile';
import { FULL_CHAIR_STEPS, WHITE_PART_STEPS, WHITE_PART_SUPPORT, WORKFLOW_TEMPLATES, allWorkflowTemplates, createWhitePartLayout } from './templates';
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

describe('workflow templates', () => {
  test('built-ins reference real catalogue types', () => {
    const ids = new Set(CATALOGUE.map((t) => t.id));
    expect(WORKFLOW_TEMPLATES.map((t) => t.id)).toEqual(['white-part', 'full-chair']);
    for (const t of WORKFLOW_TEMPLATES) for (const s of t.steps) expect(ids.has(s.typeId!)).toBe(true);
    expect(FULL_CHAIR_STEPS.slice(0, WHITE_PART_STEPS.length)).toEqual(WHITE_PART_STEPS);
  });

  test('step names come from the catalogue', () => {
    expect(WORKFLOW_TEMPLATES[0].steps[1]).toEqual({ name: 'Rip saw', typeId: 'rip-saw' });
  });

  test('project templates are listed after built-ins', () => {
    const mine = { id: 'm', name: 'Mine', steps: [] };
    expect(allWorkflowTemplates({ workflowTemplates: [mine] }).map((t) => t.id)).toEqual(['white-part', 'full-chair', 'm']);
  });

  test('white-part layout has one step per line machine and numbered flows', () => {
    const l = createWhitePartLayout(createFactory(), { customTypes: [] });
    expect(l.workflow).toHaveLength(WHITE_PART_STEPS.length);
    l.workflow.forEach((s, i) => expect(s.machineIds).toEqual([l.machines[i].id]));
    expect(l.flows.map((f) => f.label)).toEqual(WHITE_PART_STEPS.slice(1).map((_, i) => String(i + 1)));
  });
});
