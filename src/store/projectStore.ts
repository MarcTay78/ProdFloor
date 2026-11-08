import { create } from 'zustand';
import { temporal } from 'zundo';
import { createMachine, findType, newId } from '../domain/catalogue';
import { createLayout, createProject } from '../domain/projectFile';
import { autoArrange } from '../domain/recommend';
import { allWorkflowTemplates, createWhitePartLayout } from '../domain/templates';
import type { Factory, FactoryItemKind, Layout, Machine, MachineType, Point2, ProcessArea, Project, Worker, WorkflowStep } from '../domain/types';
import { nextAreaColor } from '../domain/areas';
import { applyTemplate, deriveFlows, removeMachineFromWorkflow } from '../domain/workflow';

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
  /** Copy of the active layout rearranged by best-swap hill-climbing; added and made active only when it improves. */
  autoArrangeLayout(): { swaps: number; saved: number };
  renameLayout(id: string, name: string): void;
  deleteLayout(id: string): void;
  setActiveLayout(id: string): void;
  addCustomType(type: MachineType): void;
  setTypeModel(typeId: string, modelKey: string | null): void;
  addStep(name?: string): string;
  updateStep(id: string, patch: Partial<Pick<WorkflowStep, 'name' | 'machineIds'>>): void;
  moveStep(id: string, dir: -1 | 1): void;
  removeStep(id: string): void;
  assignToStep(stepId: string, machineId: string): void;
  applyWorkflowTemplate(templateId: string): void;
  saveWorkflowTemplate(name: string): void;
  /** New process area in the active layout (next palette colour); returns its id. Assign machines with updateMachine(id, { areaId }). */
  addArea(name: string): string;
  updateArea(id: string, patch: Partial<Pick<ProcessArea, 'name' | 'color'>>): void;
  /** Removes the area and unassigns its machines (one undo step). */
  removeArea(id: string): void;
  /** New worker on the active layout's floor ("Worker N"); returns its id. */
  addWorker(at: Point2): string;
  /** machineIds are deduped and limited to machines of the active layout. */
  updateWorker(id: string, patch: Partial<Omit<Worker, 'id'>>): void;
  removeWorker(id: string): void;
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
      /** Every workflow change goes through here so flows stay derived from steps. */
      const setWorkflow = (fn: (w: WorkflowStep[], l: Layout) => WorkflowStep[]) =>
        setLayout((l) => {
          const workflow = fn(l.workflow, l);
          return { ...l, workflow, flows: deriveFlows(workflow) };
        });

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
        addArea(name) {
          const id = newId();
          setLayout((l) => ({ ...l, areas: [...l.areas, { id, name, color: nextAreaColor(l.areas) }] }));
          return id;
        },
        updateArea: (id, patch) => setLayout((l) => ({ ...l, areas: l.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
        removeArea: (id) =>
          setLayout((l) => ({
            ...l,
            areas: l.areas.filter((a) => a.id !== id),
            machines: l.machines.map((m) => (m.areaId === id ? { ...m, areaId: undefined } : m)),
          })),
        addWorker(at) {
          const id = newId();
          setLayout((l) => ({ ...l, workers: [...l.workers, { id, name: `Worker ${l.workers.length + 1}`, x: at.x, y: at.y, machineIds: [] }] }));
          return id;
        },
        updateWorker: (id, patch) =>
          setLayout((l) => {
            if (patch.machineIds) {
              const known = new Set(l.machines.map((m) => m.id));
              patch = { ...patch, machineIds: [...new Set(patch.machineIds)].filter((x) => known.has(x)) };
            }
            return { ...l, workers: l.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) };
          }),
        removeWorker: (id) => setLayout((l) => ({ ...l, workers: l.workers.filter((w) => w.id !== id) })),
        deleteMachines: (ids) =>
          setLayout((l) => {
            const workflow = removeMachineFromWorkflow(l.workflow, ids);
            return {
              ...l,
              machines: l.machines.filter((m) => !ids.includes(m.id)),
              workflow,
              flows: deriveFlows(workflow),
              workers: l.workers.map((w) => ({ ...w, machineIds: w.machineIds.filter((x) => !ids.includes(x)) })),
            };
          }),
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
        autoArrangeLayout() {
          const src = activeLayout(get().project);
          const r = autoArrange(src);
          if (!r.swaps) return { swaps: 0, saved: 0 };
          const l: Layout = { ...structuredClone(r.layout), id: newId(), name: `${src.name} (auto-arranged)` };
          setProj((p) => ({ ...p, layouts: [...p.layouts, l], activeLayoutId: l.id }));
          return { swaps: r.swaps, saved: r.saved };
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
        addStep(name) {
          const id = newId();
          setWorkflow((w) => [...w, { id, name: name ?? `Step ${w.length + 1}`, machineIds: [] }]);
          return id;
        },
        updateStep: (id, patch) =>
          setWorkflow((w, l) => {
            if (patch.machineIds) {
              const known = new Set(l.machines.map((m) => m.id));
              patch = { ...patch, machineIds: [...new Set(patch.machineIds)].filter((x) => known.has(x)) };
            }
            return w.map((s) => (s.id === id ? { ...s, ...patch } : s));
          }),
        moveStep: (id, dir) =>
          setWorkflow((w) => {
            const i = w.findIndex((s) => s.id === id), j = i + dir;
            if (i < 0 || j < 0 || j >= w.length) return w;
            const next = [...w];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
          }),
        removeStep: (id) => setWorkflow((w) => w.filter((s) => s.id !== id)),
        assignToStep: (stepId, machineId) =>
          setWorkflow((w, l) => {
            const m = l.machines.find((x) => x.id === machineId);
            if (!m) return w;
            return w.map((s) =>
              s.id !== stepId || s.machineIds.includes(machineId) ? s : { ...s, typeId: s.typeId ?? m.typeId, machineIds: [...s.machineIds, machineId] },
            );
          }),
        applyWorkflowTemplate(templateId) {
          const t = allWorkflowTemplates(get().project).find((x) => x.id === templateId);
          if (t) setWorkflow((_, l) => applyTemplate(t, l.machines));
        },
        saveWorkflowTemplate: (name) =>
          setProj((p) => ({
            ...p,
            workflowTemplates: [
              ...p.workflowTemplates,
              { id: newId(), name, steps: activeLayout(p).workflow.map((s) => ({ name: s.name, typeId: s.typeId })) },
            ],
          })),
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
