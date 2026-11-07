import 'fake-indexeddb/auto';
import { describe, expect, test, vi } from 'vitest';
import { createProject } from '../domain/projectFile';
import { deleteProject, lastProjectId, listProjects, loadModel, loadProject, saveModel, saveProject, startAutosave } from './persistence';
import { openProject, useProjectStore } from './projectStore';
import { useUiStore } from './uiStore';

describe('persistence', () => {
  test('save, list, load, delete', async () => {
    const a = createProject('A');
    const b = { ...createProject('B'), updatedAt: '2099-01-01T00:00:00.000Z' };
    await saveProject(a);
    await saveProject(b);
    expect((await listProjects()).map((e) => e.name)).toEqual(['B', 'A']);
    expect(await loadProject(a.id)).toEqual(a);
    expect(await lastProjectId()).toBe(b.id);
    await saveProject({ ...a, name: 'A2' });
    expect((await listProjects()).filter((e) => e.id === a.id)).toHaveLength(1);
    await deleteProject(a.id);
    expect(await loadProject(a.id)).toBeUndefined();
    expect((await listProjects()).map((e) => e.name)).toEqual(['B']);
  });

  test('models stored as array buffers', async () => {
    await saveModel('k1', { name: 'saw.glb', format: 'glb', data: new TextEncoder().encode('abc').buffer as ArrayBuffer });
    const m = await loadModel('k1');
    expect(m?.name).toBe('saw.glb');
    expect(new TextDecoder().decode(m!.data)).toBe('abc');
  });

  test('autosave debounces and records savedAt', async () => {
    openProject(createProject('Auto'));
    const stop = startAutosave(50);
    useProjectStore.getState().addMachine('bandsaw', 1, 1);
    useProjectStore.getState().addMachine('bandsaw', 5, 1);
    await vi.waitFor(() => expect(useUiStore.getState().savedAt).not.toBeNull(), { timeout: 2000 });
    const saved = await loadProject(useProjectStore.getState().project.id);
    expect(saved?.layouts[0].machines).toHaveLength(2);
    stop();
  });
});
