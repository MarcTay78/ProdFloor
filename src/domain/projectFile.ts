import { newId } from './catalogue';
import type { Factory, Layout, Project, ProjectFile } from './types';

export const SCHEMA_VERSION = 1;
const MIN_DIM = 0.05;

export function createFactory(): Factory {
  return {
    length: 40, width: 20, ceilingHeight: 6, wallThickness: 0.3,
    internalWalls: [],
    doors: [
      { id: newId(), name: 'Loading door', wall: 'south', offset: 6, width: 4, height: 4.5, kind: 'loading', keepClear: 4 },
      { id: newId(), name: 'Staff entrance', wall: 'west', offset: 3, width: 1, height: 2.1, kind: 'personnel', keepClear: 1.5 },
    ],
    windows: [],
    pillars: [],
    restrictedZones: [],
  };
}

export function createLayout(name = 'Layout 1', factory: Factory = createFactory()): Layout {
  return { id: newId(), name, factory, machines: [], flows: [] };
}

export function createProject(name: string): Project {
  const layout = createLayout();
  const now = new Date().toISOString();
  return { id: newId(), name, createdAt: now, updatedAt: now, customTypes: [], typeModels: {}, layouts: [layout], activeLayoutId: layout.id };
}

export function asNewProject(project: Project, name = project.name): Project {
  const now = new Date().toISOString();
  return { ...structuredClone(project), id: newId(), name, createdAt: now, updatedAt: now };
}

export function serializeProject(project: Project, models?: ProjectFile['models']): string {
  const file: ProjectFile = { schemaVersion: SCHEMA_VERSION, project, ...(models ? { models } : {}) };
  return JSON.stringify(file, null, 2);
}

export type ParseResult = { ok: true; file: ProjectFile } | { ok: false; errors: string[] };

/** Fill collections added after a file was written. Bump SCHEMA_VERSION and add steps here for breaking changes. */
function migrate(raw: any): any {
  const p = raw.project;
  p.customTypes ??= [];
  p.typeModels ??= {};
  for (const l of p.layouts ?? []) {
    l.flows ??= [];
    l.machines ??= [];
    const f = l.factory ?? {};
    for (const k of ['internalWalls', 'doors', 'windows', 'pillars', 'restrictedZones']) f[k] ??= [];
  }
  return raw;
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function validateProject(p: any): string[] {
  const errors: string[] = [];
  if (typeof p?.id !== 'string' || typeof p?.name !== 'string') errors.push('project.id and project.name must be text');
  if (!Array.isArray(p?.layouts) || p.layouts.length === 0) return [...errors, 'project.layouts must contain at least one layout'];
  if (!p.layouts.some((l: any) => l.id === p.activeLayoutId)) errors.push('project.activeLayoutId does not match any layout');
  p.layouts.forEach((l: any, li: number) => {
    const at = `layouts[${li}]`;
    const f = l.factory;
    for (const k of ['length', 'width', 'ceilingHeight'] as const) {
      if (!num(f?.[k]) || f[k] <= 0) errors.push(`${at}.factory.${k} must be a positive number`);
    }
    const ids = new Set<string>();
    (l.machines as any[]).forEach((m, mi) => {
      const mat = `${at}.machines[${mi}]`;
      if (typeof m.id !== 'string') errors.push(`${mat}.id missing`);
      else if (ids.has(m.id)) errors.push(`${mat}: duplicate machine id ${m.id}`);
      else ids.add(m.id);
      for (const k of ['x', 'y', 'rotation'] as const) if (!num(m[k])) errors.push(`${mat}.${k} must be a number`);
      for (const k of ['length', 'width', 'height'] as const) {
        if (!num(m[k]) || m[k] < MIN_DIM) errors.push(`${mat}.${k} must be at least ${MIN_DIM} m`);
      }
    });
  });
  return errors;
}

export function parseProjectFile(text: string): ParseResult {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['File is not valid JSON'] };
  }
  if (raw?.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported schemaVersion ${raw?.schemaVersion}; this app reads version ${SCHEMA_VERSION}`] };
  }
  if (typeof raw.project !== 'object' || raw.project === null) return { ok: false, errors: ['File has no project'] };
  const errors = validateProject(migrate(raw).project);
  return errors.length ? { ok: false, errors } : { ok: true, file: raw as ProjectFile };
}
