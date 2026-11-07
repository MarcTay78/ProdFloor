import { beforeEach, describe, expect, test } from 'vitest';
import { createProject } from '../domain/projectFile';
import { activeLayout, canUndo, openProject, redo, undo, useProjectStore } from './projectStore';

const s = () => useProjectStore.getState();
const layout = () => activeLayout(s().project);

beforeEach(() => openProject(createProject('T')));

describe('machines', () => {
  test('addMachine uses type defaults', () => {
    const id = s().addMachine('bandsaw', 3, 4)!;
    expect(layout().machines).toHaveLength(1);
    expect(layout().machines[0]).toMatchObject({ id, x: 3, y: 4, length: 1.2 });
  });
  test('unknown type returns null', () => expect(s().addMachine('nope', 0, 0)).toBeNull());
  test('updateMachine patches one machine', () => {
    const id = s().addMachine('bandsaw', 3, 4)!;
    s().updateMachine(id, { rotation: 90, length: 1.5 });
    expect(layout().machines[0]).toMatchObject({ rotation: 90, length: 1.5, x: 3 });
  });
  test('duplicateMachine offsets by 1 m', () => {
    const id = s().addMachine('bandsaw', 3, 4)!;
    const copy = s().duplicateMachine(id)!;
    expect(copy).not.toBe(id);
    expect(layout().machines.find((m) => m.id === copy)).toMatchObject({ x: 4, y: 4, name: 'Bandsaw' });
  });
  test('deleteMachines', () => {
    const a = s().addMachine('bandsaw', 3, 4)!;
    s().addMachine('bandsaw', 8, 4);
    s().deleteMachines([a]);
    expect(layout().machines).toHaveLength(1);
  });
});

describe('white part template', () => {
  test('adds and activates a linked layout; deleting a machine empties its step and the chain continues', () => {
    s().addWhitePartLayout();
    expect(s().project.layouts).toHaveLength(2);
    expect(layout().name).toBe('White part production');
    const before = layout().flows.length;
    s().deleteMachines([layout().machines[1].id]);
    expect(layout().workflow[1].machineIds).toEqual([]);
    expect(layout().flows).toHaveLength(before - 1);
  });
});

describe('workflow', () => {
  const twoMachines = () => [s().addMachine('bandsaw', 3, 4)!, s().addMachine('mortiser', 8, 4)!];

  test('add, assign, rename: flows follow the steps', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('Saw');
    const s2 = s().addStep();
    s().assignToStep(s1, a);
    s().assignToStep(s1, a);
    s().assignToStep(s2, b);
    s().updateStep(s2, { name: 'Mortise' });
    expect(layout().workflow.map((x) => [x.name, x.typeId, x.machineIds])).toEqual([['Saw', 'bandsaw', [a]], ['Mortise', 'mortiser', [b]]]);
    expect(layout().flows.map((f) => [f.fromMachineId, f.toMachineId])).toEqual([[a, b]]);
  });

  test('default step name is numbered', () => {
    s().addStep();
    expect(layout().workflow[0].name).toBe('Step 1');
  });

  test('move and remove re-derive flows', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('A'), s2 = s().addStep('B');
    s().assignToStep(s1, a); s().assignToStep(s2, b);
    s().moveStep(s2, -1);
    s().moveStep(s2, -1);
    expect(layout().flows.map((f) => [f.fromMachineId, f.toMachineId])).toEqual([[b, a]]);
    s().removeStep(s1);
    expect(layout().flows).toEqual([]);
  });

  test('apply template auto-assigns, save template stores the step list', () => {
    twoMachines();
    s().applyWorkflowTemplate('white-part');
    expect(layout().workflow).toHaveLength(13);
    expect(layout().workflow.find((x) => x.typeId === 'bandsaw')!.machineIds).toHaveLength(1);
    s().saveWorkflowTemplate('Mine');
    expect(s().project.workflowTemplates).toHaveLength(1);
    expect(s().project.workflowTemplates[0].steps[0]).toEqual({ name: 'Raw timber storage rack', typeId: 'raw-timber-rack' });
  });

  test('one undo reverts a step edit including flows', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('A'), s2 = s().addStep('B');
    s().assignToStep(s1, a); s().assignToStep(s2, b);
    s().removeStep(s1);
    undo();
    expect(layout().workflow).toHaveLength(2);
    expect(layout().flows).toHaveLength(1);
  });

  test('duplicating a layout keeps a working workflow', () => {
    const [a, b] = twoMachines();
    const s1 = s().addStep('A'), s2 = s().addStep('B');
    s().assignToStep(s1, a); s().assignToStep(s2, b);
    s().duplicateLayout(s().project.activeLayoutId);
    expect(layout().workflow.map((x) => x.machineIds)).toEqual([[a], [b]]);
    expect(layout().machines.map((m) => m.id)).toEqual([a, b]);
  });
});

describe('factory', () => {
  test('updateFactory and items', () => {
    s().updateFactory({ length: 55 });
    s().upsertFactoryItem('pillars', { id: 'p', x: 1, y: 1, sizeX: 0.4, sizeY: 0.4 });
    s().upsertFactoryItem('pillars', { id: 'p', x: 2, y: 1, sizeX: 0.4, sizeY: 0.4 });
    expect(layout().factory.length).toBe(55);
    expect(layout().factory.pillars).toEqual([{ id: 'p', x: 2, y: 1, sizeX: 0.4, sizeY: 0.4 }]);
    s().removeFactoryItem('pillars', 'p');
    expect(layout().factory.pillars).toEqual([]);
  });
});

describe('layouts', () => {
  test('add, duplicate, switch, cannot delete last', () => {
    s().addMachine('bandsaw', 3, 4);
    const first = s().project.activeLayoutId;
    s().duplicateLayout(first);
    expect(s().project.layouts).toHaveLength(2);
    expect(s().project.layouts[1].machines).toHaveLength(1);
    expect(s().project.layouts[1].machines[0].id).toBe(s().project.layouts[0].machines[0].id);
    s().addLayout('Empty');
    expect(layout().name).toBe('Empty');
    expect(layout().machines).toHaveLength(0);
    s().deleteLayout(layout().id);
    expect(s().project.layouts).toHaveLength(2);
    expect(s().project.activeLayoutId).toBe(first);
    s().deleteLayout(s().project.layouts[1].id);
    s().deleteLayout(first);
    expect(s().project.layouts).toHaveLength(1);
  });
});

describe('undo / redo', () => {
  test('openProject clears history; undo/redo machine add', () => {
    expect(canUndo()).toBe(false);
    s().addMachine('bandsaw', 3, 4);
    expect(canUndo()).toBe(true);
    undo();
    expect(layout().machines).toHaveLength(0);
    redo();
    expect(layout().machines).toHaveLength(1);
  });
});
