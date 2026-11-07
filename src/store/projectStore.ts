import { create } from 'zustand';
import { temporal } from 'zundo';
import { createMachine, findType, newId } from '../domain/catalogue';
import { createLayout, createProject } from '../domain/projectFile';
import { createWhitePartLayout } from '../domain/templates';
import type { Factory, FactoryItemKind, Layout, Machine, MachineType, Project } from '../domain/types';

export const activeLayout = (p: Project): Layout =>
  p.layouts.find((l) => l.id === p.activeLayoutId) ?? p.layouts[0];

interface ProjectState {
  project: Project;
  setProject(p: Project): void;
  renameProject(name: string): void;
  addMachine(typeId: string, x: number, y: number): string | null;
  updateMachine(id: string, patch: Partial<Machine>): void;
  deleteMachines(ids: string[]): void;
  duplicateMachine(id: string): string | null;
  updateFactory(patch: Partial<Factory>): void;
  upsertFactoryItem<K extends FactoryItemKind>(kind: K, item: Factory[K][number]): void;
  removeFactoryItem(kind: FactoryItemKind, id: string): void;
  addLayout(name?: string): void;
  /** New layout (current building) pre-filled with the white-part production line. */
  addWhitePartLayout(): void;
  duplicateLayout(id: string): void;
  renameLayout(id: string, name: string): void;
  deleteLayout(id: string): void;
  setActiveLayout(id: string): void;
  addCustomType(type: MachineType): void;
  setTypeModel(typeId: string, modelKey: string | null): void;
}

const touch = (p: Project): Project => ({ ...p, updatedAt: new Date().toISOString() });

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set, get) => {
      const setProj = (fn: (p: Project) => Project) => set((s) => ({ project: touch(fn(s.project)) }));
      const setLayout = (fn: (l: Layout) => Layout) =>
        setProj((p) => ({ ...p, layouts: p.layouts.map((l) => (l.id === activeLayout(p).id ? fn(l) : l)) }));
      const setMachines = (fn: (ms: Machine[]) => Machine[]) => setLayout((l) => ({ ...l, machines: fn(l.machines) }));
      const setFactory = (fn: (f: Factory) => Factory) => setLayout((l) => ({ ...l, factory: fn(l.factory) }));

      return {
        project: createProject('My Factory'),

        setProject: (p) => set({ project: p }),
        renameProject: (name) => setProj((p) => ({ ...p, name })),

        addMachine(typeId, x, y) {
          const type = findType(get().project, typeId);
          if (!type) return null;
          const m = createMachine(type, x, y);
          setMachines((ms) => [...ms, m]);
          return m.id;
        },
        updateMachine: (id, patch) => setMachines((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m))),
        deleteMachines: (ids) =>
          setLayout((l) => ({
            ...l,
            machines: l.machines.filter((m) => !ids.includes(m.id)),
            flows: l.flows.filter((f) => !ids.includes(f.fromMachineId) && !ids.includes(f.toMachineId)),
          })),
        duplicateMachine(id) {
          const src = activeLayout(get().project).machines.find((m) => m.id === id);
          if (!src) return null;
          const copy: Machine = { ...structuredClone(src), id: newId(), x: src.x + 1 };
          setMachines((ms) => [...ms, copy]);
          return copy.id;
        },

        updateFactory: (patch) => setFactory((f) => ({ ...f, ...patch })),
        upsertFactoryItem: (kind, item) =>
          setFactory((f) => {
            const list = f[kind] as { id: string }[];
            const next = list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
            return { ...f, [kind]: next };
          }),
        removeFactoryItem: (kind, id) =>
          setFactory((f) => ({ ...f, [kind]: (f[kind] as { id: string }[]).filter((x) => x.id !== id) })),

        addLayout(name) {
          const p = get().project;
          const l = createLayout(name ?? `Layout ${p.layouts.length + 1}`, structuredClone(activeLayout(p).factory));
          setProj((pp) => ({ ...pp, layouts: [...pp.layouts, l], activeLayoutId: l.id }));
        },
        addWhitePartLayout() {
          const p = get().project;
          const l = createWhitePartLayout(activeLayout(p).factory, p);
          setProj((pp) => ({ ...pp, layouts: [...pp.layouts, l], activeLayoutId: l.id }));
        },
        duplicateLayout(id) {
          const src = get().project.layouts.find((l) => l.id === id);
          if (!src) return;
          const l: Layout = { ...structuredClone(src), id: newId(), name: `${src.name} (copy)` };
          setProj((p) => ({ ...p, layouts: [...p.layouts, l], activeLayoutId: l.id }));
        },
        renameLayout: (id, name) => setProj((p) => ({ ...p, layouts: p.layouts.map((l) => (l.id === id ? { ...l, name } : l)) })),
        deleteLayout(id) {
          const p = get().project;
          if (p.layouts.length <= 1) return;
          const layouts = p.layouts.filter((l) => l.id !== id);
          setProj((pp) => ({ ...pp, layouts, activeLayoutId: pp.activeLayoutId === id ? layouts[0].id : pp.activeLayoutId }));
        },
        setActiveLayout: (id) => setProj((p) => ({ ...p, activeLayoutId: id })),

        addCustomType: (type) => setProj((p) => ({ ...p, customTypes: [...p.customTypes, type] })),
        setTypeModel: (typeId, modelKey) =>
          setProj((p) => {
            const typeModels = { ...p.typeModels };
            if (modelKey) typeModels[typeId] = modelKey;
            else delete typeModels[typeId];
            return { ...p, typeModels };
          }),
      };
    },
    { limit: 200, partialize: (s) => ({ project: s.project }) },
  ),
);

export function openProject(p: Project): void {
  useProjectStore.getState().setProject(p);
  useProjectStore.temporal.getState().clear();
}

export const undo = () => useProjectStore.temporal.getState().undo();
export const redo = () => useProjectStore.temporal.getState().redo();
export const canUndo = () => useProjectStore.temporal.getState().pastStates.length > 0;
export const canRedo = () => useProjectStore.temporal.getState().futureStates.length > 0;
