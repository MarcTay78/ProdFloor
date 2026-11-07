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
