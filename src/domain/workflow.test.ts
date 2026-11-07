import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import type { WorkflowStep } from './types';
import { applyTemplate, deriveFlows, removeMachineFromWorkflow, workflowFromFlows } from './workflow';

const step = (name: string, machineIds: string[]): WorkflowStep => ({ id: name, name, machineIds });
const pairs = (w: WorkflowStep[]) => deriveFlows(w).map((f) => `${f.fromMachineId}>${f.toMachineId}:${f.label}`);
const type = (id: string) => CATALOGUE.find((t) => t.id === id)!;

describe('deriveFlows', () => {
  test('linear chain, labels are source step numbers', () => {
    expect(pairs([step('A', ['a']), step('B', ['b']), step('C', ['c'])])).toEqual(['a>b:1', 'b>c:2']);
  });
  test('parallel step links every pair (split and merge)', () => {
    expect(pairs([step('A', ['a']), step('B', ['b1', 'b2']), step('C', ['c'])])).toEqual(['a>b1:1', 'a>b2:1', 'b1>c:2', 'b2>c:2']);
  });
  test('empty step is skipped, chain continues', () => {
    expect(pairs([step('A', ['a']), step('B', []), step('C', ['c'])])).toEqual(['a>c:1']);
  });
  test('same machine in consecutive steps makes no self link', () => {
    expect(pairs([step('A', ['a']), step('B', ['a', 'b'])])).toEqual(['a>b:1']);
  });
  test('each link gets its own id', () => {
    const f = deriveFlows([step('A', ['a']), step('B', ['b1', 'b2'])]);
    expect(new Set(f.map((x) => x.id)).size).toBe(2);
  });
});

describe('applyTemplate', () => {
  test('assigns every placed machine of the matching type; unmatched steps stay empty', () => {
    const s1 = createMachine(type('bandsaw'), 1, 1);
    const s2 = createMachine(type('bandsaw'), 4, 1);
    const w = applyTemplate(
      { id: 't', name: 'T', steps: [{ name: 'Saw', typeId: 'bandsaw' }, { name: 'Drill', typeId: 'drill-press' }, { name: 'Check' }] },
      [s1, s2],
    );
    expect(w.map((s) => [s.name, s.typeId, s.machineIds])).toEqual([
      ['Saw', 'bandsaw', [s1.id, s2.id]], ['Drill', 'drill-press', []], ['Check', undefined, []],
    ]);
    expect(new Set(w.map((s) => s.id)).size).toBe(3);
  });
});

describe('removeMachineFromWorkflow', () => {
  test('removes ids from every step and keeps empty steps', () => {
    const w = removeMachineFromWorkflow([step('A', ['a', 'b']), step('B', ['b'])], ['b']);
    expect(w.map((s) => s.machineIds)).toEqual([['a'], []]);
  });
});

describe('workflowFromFlows', () => {
  const ms = ['bandsaw', 'mortiser', 'tenoner', 'drill-press'].map((id, i) => createMachine(type(id), i * 3, 1));
  const [a, b, c, d] = ms;
  const link = (x: string, y: string) => ({ id: `${x}${y}`, fromMachineId: x, toMachineId: y });

  test('single chain: one step per machine in flow order, nothing dropped', () => {
    const r = workflowFromFlows(ms, [link(c.id, b.id), link(a.id, c.id)]);
    expect(r.workflow.map((s) => s.machineIds[0])).toEqual([a.id, c.id, b.id]);
    expect(r.workflow[0]).toMatchObject({ name: 'Bandsaw', typeId: 'bandsaw' });
    expect(r.dropped).toBe(0);
  });
  test('branching input: topological order, extra links counted as dropped', () => {
    const r = workflowFromFlows(ms, [link(a.id, b.id), link(a.id, c.id)]);
    expect(r.workflow.map((s) => s.machineIds[0])).toEqual([a.id, b.id, c.id]);
    expect(r.dropped).toBe(1);
  });
  test('machines without flows are left out; no flows gives empty workflow', () => {
    expect(workflowFromFlows(ms, [link(a.id, b.id)]).workflow).toHaveLength(2);
    expect(workflowFromFlows([d], []).workflow).toEqual([]);
  });
});
