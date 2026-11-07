import { asNewProject, parseProjectFile, serializeProject } from '../domain/projectFile';
import type { EmbeddedModel, ModelFormat } from '../domain/types';
import { loadModel, saveModel, saveNow, saveProject } from '../store/persistence';
import { activeLayout, openProject, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { base64ToBuffer, bufferToBase64, downloadDataUrl, downloadText, pickFile, safeFilename } from './fileIO';

function usedModelKeys(): string[] {
  const p = useProjectStore.getState().project;
  const keys = new Set<string>(Object.values(p.typeModels));
  for (const l of p.layouts) for (const m of l.machines) if (m.modelOverride) keys.add(m.modelOverride);
  return [...keys];
}

export async function exportProjectJson(): Promise<void> {
  const project = useProjectStore.getState().project;
  const keys = usedModelKeys();
  let models: Record<string, EmbeddedModel> | undefined;
  if (keys.length && confirm(`Include the ${keys.length} imported 3D model file(s) in the export? The file will be bigger.`)) {
    models = {};
    for (const k of keys) {
      const m = await loadModel(k);
      if (m) models[k] = { name: m.name, format: m.format, fitMode: m.fitMode, dataBase64: bufferToBase64(m.data) };
    }
  }
  downloadText(`${safeFilename(project.name)}.prodfloor.json`, serializeProject(project, models));
}

export async function importProjectJson(): Promise<void> {
  const file = await pickFile('.json,application/json');
  if (!file) return;
  const result = parseProjectFile(await file.text());
  if (!result.ok) {
    alert(`This file can't be imported:\n\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? `\n…and ${result.errors.length - 5} more` : ''}`);
    return;
  }
  for (const [key, m] of Object.entries(result.file.models ?? {})) {
    await saveModel(key, { name: m.name, format: m.format, fitMode: m.fitMode, data: base64ToBuffer(m.dataBase64) });
  }
  await saveNow();
  const project = asNewProject(result.file.project);
  await saveProject(project);
  openProject(project);
  useUiStore.getState().select(null);
  useUiStore.getState().showToast(`Imported "${project.name}" as a new project`);
}

export function exportPng(): void {
  const el = useUiStore.getState().canvasEl;
  if (!el) return;
  const p = useProjectStore.getState().project;
  downloadDataUrl(`${safeFilename(p.name)}-${safeFilename(activeLayout(p).name)}.png`, el.toDataURL('image/png'));
}

const FORMATS: ModelFormat[] = ['glb', 'gltf', 'obj', 'stl', 'fbx'];

/** Ask for a model file, store it, and return its key (or null if cancelled / unsupported). */
export async function importModelFile(fitMode: 'stretch' | 'contain'): Promise<string | null> {
  const file = await pickFile(FORMATS.map((f) => `.${f}`).join(','));
  if (!file) return null;
  const format = file.name.split('.').pop()?.toLowerCase() as ModelFormat;
  if (!FORMATS.includes(format)) {
    useUiStore.getState().showToast(`Unsupported model format: ${file.name}`);
    return null;
  }
  const key = crypto.randomUUID();
  await saveModel(key, { name: file.name, format, fitMode, data: await file.arrayBuffer() });
  return key;
}
