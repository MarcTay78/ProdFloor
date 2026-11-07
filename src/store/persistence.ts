import { del, get, set } from 'idb-keyval';
import type { ModelFormat, Project } from '../domain/types';
import { useProjectStore } from './projectStore';
import { useUiStore } from './uiStore';

export interface ProjectIndexEntry { id: string; name: string; updatedAt: string }
export interface StoredModel { name: string; format: ModelFormat; data: ArrayBuffer; fitMode?: 'stretch' | 'contain' }

const INDEX = 'projects-index';
const LAST = 'last-project-id';

async function readIndex(): Promise<ProjectIndexEntry[]> {
  return (await get<ProjectIndexEntry[]>(INDEX)) ?? [];
}

export async function listProjects(): Promise<ProjectIndexEntry[]> {
  return (await readIndex()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const loadProject = (id: string) => get<Project>(`project:${id}`);
export const lastProjectId = () => get<string>(LAST);

export async function saveProject(p: Project): Promise<void> {
  await set(`project:${p.id}`, p);
  const index = (await readIndex()).filter((e) => e.id !== p.id);
  await set(INDEX, [...index, { id: p.id, name: p.name, updatedAt: p.updatedAt }]);
  await set(LAST, p.id);
}

export async function deleteProject(id: string): Promise<void> {
  await del(`project:${id}`);
  await set(INDEX, (await readIndex()).filter((e) => e.id !== id));
  if ((await lastProjectId()) === id) await del(LAST);
}

export const saveModel = (key: string, m: StoredModel) => set(`model:${key}`, m);
export const loadModel = (key: string) => get<StoredModel>(`model:${key}`);

export async function saveNow(): Promise<void> {
  try {
    await saveProject(useProjectStore.getState().project);
    useUiStore.getState().setSaveStatus({ savedAt: new Date().toISOString(), saveError: null });
  } catch (e) {
    useUiStore.getState().setSaveStatus({ saveError: `Could not save in this browser (${(e as Error).message}). Export JSON to keep your work.` });
  }
}

export function startAutosave(delayMs = 1000): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useProjectStore.subscribe((s, prev) => {
    if (s.project === prev.project) return;
    clearTimeout(timer);
    timer = setTimeout(saveNow, delayMs);
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}
