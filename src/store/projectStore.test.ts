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

  test('updateStep drops unknown and duplicate machine ids', () => {
    const [a] = twoMachines();
    const id = s().addStep('A');
    s().updateStep(id, { machineIds: [a, 'ghost', a] });
    expect(layout().workflow[0].machineIds).toEqual([a]);
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

describe('autoArrangeLayout', () => {
  test('adds an active auto-arranged copy; original untouched; undo removes it', () => {
    // a -> b -> c with b and c in each other's places: swapping them saves 14 m.
    const a = s().addMachine('table-saw', 5, 10)!;
    const b = s().addMachine('table-saw', 20, 10)!;
    const c = s().addMachine('table-saw', 10, 10)!;
    for (const id of [a, b, c]) s().updateStep(s().addStep(), { machineIds: [id] });
    const original = s().project.activeLayoutId;
    const r = s().autoArrangeLayout();
    expect(r.swaps).toBe(1);
    expect(r.saved).toBeCloseTo(14, 6);
    expect(s().project.layouts).toHaveLength(2);
    expect(layout().id).not.toBe(original);
    expect(layout().name).toMatch(/\(auto-arranged\)$/);
    expect(layout().machines.find((m) => m.id === b)).toMatchObject({ x: 10 });
    expect(s().project.layouts[0].machines.find((m) => m.id === b)).toMatchObject({ x: 20 });
    undo();
    expect(s().project.layouts).toHaveLength(1);
  });

  test('nothing to improve: no new layout', () => {
    s().addMachine('table-saw', 5, 10);
    expect(s().autoArrangeLayout()).toEqual({ swaps: 0, saved: 0 });
    expect(s().project.layouts).toHaveLength(1);
  });
});

describe('process areas', () => {
  test('add, assign, rename, remove (unassigns machines; one undo restores both)', () => {
    const m = s().addMachine('bandsaw', 3, 4)!;
    const a = s().addArea('Cutting');
    s().updateMachine(m, { areaId: a });
    s().updateArea(a, { name: 'Saws', color: '#123456' });
    expect(layout().areas).toEqual([{ id: a, name: 'Saws', color: '#123456' }]);
    expect(layout().machines[0].areaId).toBe(a);
    s().removeArea(a);
    expect(layout().areas).toEqual([]);
    expect(layout().machines[0].areaId).toBeUndefined();
    undo();
    expect(layout().areas).toHaveLength(1);
    expect(layout().machines[0].areaId).toBe(a);
  });
  test('areas use the palette in order', () => {
    s().addArea('A');
    s().addArea('B');
    expect(layout().areas[0].color).not.toBe(layout().areas[1].color);
  });
});

describe('workers', () => {
  test('addWorker names in order and lands in the active layout', () => {
    const a = s().addWorker({ x: 2, y: 3 });
    s().addWorker({ x: 4, y: 3 });
    expect(layout().workers.map((w) => w.name)).toEqual(['Worker 1', 'Worker 2']);
    expect(layout().workers[0]).toEqual({ id: a, name: 'Worker 1', x: 2, y: 3, machineIds: [], rotation: 0, path: [], role: 'operator' });
  });
  test('updateWorker keeps only known machines, once each', () => {
    const m = s().addMachine('bandsaw', 3, 4)!;
    const w = s().addWorker({ x: 1, y: 1 });
    s().updateWorker(w, { machineIds: [m, m, 'ghost'], name: 'Ann' });
    expect(layout().workers[0]).toMatchObject({ name: 'Ann', machineIds: [m] });
  });
  test('deleteMachines strips the machine from workers', () => {
    const a = s().addMachine('bandsaw', 3, 4)!;
    const b = s().addMachine('bandsaw', 8, 4)!;
    const w = s().addWorker({ x: 1, y: 1 });
    s().updateWorker(w, { machineIds: [a, b] });
    s().deleteMachines([a]);
    expect(layout().workers[0].machineIds).toEqual([b]);
  });
  test('updateWorker saves rotation and path', () => {
    const w = s().addWorker({ x: 1, y: 1 });
    s().updateWorker(w, { rotation: 90, path: [{ x: 4, y: 1 }, { x: 4, y: 5 }] });
    expect(layout().workers[0]).toMatchObject({ rotation: 90, path: [{ x: 4, y: 1 }, { x: 4, y: 5 }] });
  });
  test('addWorker can add a forklift, numbered separately from workers', () => {
    s().addWorker({ x: 1, y: 1 });
    const f = s().addWorker({ x: 5, y: 5 }, 'forklift');
    s().addWorker({ x: 2, y: 2 });
    expect(layout().workers.find((w) => w.id === f)).toMatchObject({ name: 'Forklift 1', role: 'forklift' });
    expect(layout().workers.map((w) => w.name)).toEqual(['Worker 1', 'Forklift 1', 'Worker 2']);
  });
  test('removeWorker', () => {
    const w = s().addWorker({ x: 1, y: 1 });
    s().removeWorker(w);
    expect(layout().workers).toEqual([]);
  });
  test('undo reverts addWorker', () => {
    s().addWorker({ x: 1, y: 1 });
    expect(canUndo()).toBe(true);
    undo();
    expect(layout().workers).toEqual([]);
  });
  test('duplicateLayout keeps workers', () => {
    s().addWorker({ x: 1, y: 1 });
    s().duplicateLayout(layout().id);
    expect(layout().name).toMatch(/\(copy\)$/);
    expect(layout().workers.map((w) => w.name)).toEqual(['Worker 1']);
  });
});
