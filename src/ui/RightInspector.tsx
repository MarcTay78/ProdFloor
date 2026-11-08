import { useEffect, useMemo, useState } from 'react';
import { allTypes, findType } from '../domain/catalogue';
import { normDeg } from '../domain/geometry';
import { facing, pathLength } from '../domain/simulation';
import type { Machine, Side, Worker, WorkerRole } from '../domain/types';
import { validateLayout } from '../domain/validation';
import { loadModel } from '../store/persistence';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { btn, input } from './Dialog';
import { NumberField } from './NumberField';
import { importModelFile } from './projectIO';

const SIDES: Side[] = ['front', 'back', 'left', 'right'];

export function RightInspector() {
  const project = useProjectStore((s) => s.project);
  const { updateMachine, deleteMachines, duplicateMachine, setTypeModel, addArea } = useProjectStore();
  const { selectedId, select, openDialog } = useUiStore();
  const layout = activeLayout(project);
  const m = layout.machines.find((x) => x.id === selectedId);
  const warnings = useMemo(() => validateLayout(layout).filter((w) => m && w.machineIds.includes(m.id)), [layout, m]);

  const steps = layout.workflow.flatMap((s, i) => (m && s.machineIds.includes(m.id) ? [{ id: s.id, name: s.name, no: i + 1 }] : []));
  const w = m ? undefined : layout.workers.find((x) => x.id === selectedId);
  if (w) return <WorkerPanel w={w} />;

  if (!m) {
    return (
      <Panel>
        <h3 className="text-sm font-medium">{layout.name}</h3>
        <p className="mt-1 text-xs text-slate-400">{layout.machines.length} machines placed.</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Click a machine to edit it. Drag to move (hold Alt to skip snapping). Drag the ring to rotate (Shift for 1° steps).
          Shortcuts: R rotate 90°, Ctrl+D duplicate, Delete remove, Ctrl+Z / Ctrl+Y undo / redo, Esc deselect.
        </p>
        <AreaManager />
      </Panel>
    );
  }

  const type = findType(project, m.typeId);
  const crew = layout.workers.filter((x) => x.machineIds.includes(m.id)).map((x) => x.name);
  const set = (patch: Partial<Machine>) => updateMachine(m.id, patch);
  const resetToType = () => {
    if (!type) return;
    const d = type.defaults;
    set({ length: d.length, width: d.width, height: d.height, clearance: { ...d.clearance }, operatorArea: { ...d.operatorArea } });
  };

  return (
    <Panel>
      <input
        key={m.id + m.name}
        className={`${input} w-full py-1 text-sm`}
        defaultValue={m.name}
        onBlur={(e) => e.target.value.trim() && e.target.value !== m.name && set({ name: e.target.value.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label="Machine name"
      />
      <label className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
        Type
        <select className={`${input} max-w-[170px]`} value={m.typeId} onChange={(e) => set({ typeId: e.target.value })}>
          {allTypes(project).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
        Process area
        <select
          className={`${input} max-w-[170px]`}
          value={m.areaId ?? ''}
          onChange={(e) => {
            if (e.target.value !== NEW_AREA) return set({ areaId: e.target.value || undefined });
            const name = prompt('New process area name', 'Sanding')?.trim();
            if (name) set({ areaId: addArea(name) });
          }}
        >
          <option value="">None</option>
          {layout.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          <option value={NEW_AREA}>+ New area…</option>
        </select>
      </label>
      <button className={`${btn} mt-1 w-full`} onClick={resetToType}>Reset to type defaults</button>
      <p className="mt-1 text-xs text-slate-400">Workers: <span className="text-slate-200">{crew.length ? crew.join(', ') : 'none'}</span></p>

      <Section title="Dimensions">
        <NumberField label="Length" value={m.length} min={0.05} onCommit={(v) => set({ length: v })} />
        <NumberField label="Width" value={m.width} min={0.05} onCommit={(v) => set({ width: v })} />
        <NumberField label="Height" value={m.height} min={0.05} onCommit={(v) => set({ height: v })} />
        <p className="text-right text-[11px] text-slate-500">Footprint {(m.length * m.width).toFixed(2)} m²</p>
      </Section>

      <Section title="Position">
        <NumberField label="X (from west wall)" value={m.x} onCommit={(v) => set({ x: v })} />
        <NumberField label="Y (from south wall)" value={m.y} onCommit={(v) => set({ y: v })} />
        <NumberField label="Rotation" unit="°" digits={1} value={m.rotation} onCommit={(v) => set({ rotation: normDeg(v) })} />
      </Section>

      <Section title="Operating clearance">
        {SIDES.map((s) => (
          <NumberField key={s} label={cap(s)} value={m.clearance[s]} min={0} onCommit={(v) => set({ clearance: { ...m.clearance, [s]: v } })} />
        ))}
      </Section>

      <Section title="Operator working area">
        <label className="flex items-center justify-between text-xs text-slate-400">
          Side
          <select className={input} value={m.operatorArea.side} onChange={(e) => set({ operatorArea: { ...m.operatorArea, side: e.target.value as Side } })}>
            {SIDES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
        </label>
        <NumberField label="Depth" value={m.operatorArea.depth} min={0} onCommit={(v) => set({ operatorArea: { ...m.operatorArea, depth: v } })} />
        <NumberField label="Width" value={m.operatorArea.width} min={0} onCommit={(v) => set({ operatorArea: { ...m.operatorArea, width: v } })} />
      </Section>

      <Section title="Material input / output (from machine centre)">
        <NumberField label="Input X" value={m.inputPoint.x} onCommit={(v) => set({ inputPoint: { ...m.inputPoint, x: v } })} />
        <NumberField label="Input Y" value={m.inputPoint.y} onCommit={(v) => set({ inputPoint: { ...m.inputPoint, y: v } })} />
        <NumberField label="Output X" value={m.outputPoint.x} onCommit={(v) => set({ outputPoint: { ...m.outputPoint, x: v } })} />
        <NumberField label="Output Y" value={m.outputPoint.y} onCommit={(v) => set({ outputPoint: { ...m.outputPoint, y: v } })} />
      </Section>

      <Section title="Appearance">
        <label className="flex items-center justify-between text-xs text-slate-400">
          Paint colour
          <span className="flex items-center gap-1">
            <input type="color" value={m.color ?? '#3f6f4f'} onChange={(e) => set({ color: e.target.value })} />
            {m.color && <button className={btn} onClick={() => set({ color: undefined })}>Default</button>}
          </span>
        </label>
        <ModelSection m={m} typeName={type?.name ?? 'this type'} typeModel={project.typeModels[m.typeId]} onSetMachine={(k) => set({ modelOverride: k })} onSetType={(k) => setTypeModel(m.typeId, k)} />
      </Section>

      <Section title="Checks">
        {warnings.length
          ? warnings.map((w) => <p key={w.id} className={`text-xs ${w.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>{w.message}</p>)
          : <p className="text-xs text-green-300">All clear</p>}
      </Section>

      <Section title="Workflow">
        {steps.length
          ? steps.map((s) => <p key={s.id} className="text-xs text-slate-300">Step {s.no} ({s.name})</p>)
          : <p className="text-xs text-slate-500">Not in the workflow</p>}
      </Section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className={btn} onClick={() => { const id = duplicateMachine(m.id); if (id) select(id); }}>Duplicate</button>
        <button className={`${btn} text-red-300`} onClick={() => { deleteMachines([m.id]); select(null); }}>Delete</button>
        <button className={`${btn} col-span-2`} onClick={() => openDialog('customType')}>Save as custom type</button>
      </div>
    </Panel>
  );
}

function ModelSection({ m, typeName, typeModel, onSetMachine, onSetType }: {
  m: Machine; typeName: string; typeModel?: string;
  onSetMachine(k: string | undefined): void; onSetType(k: string | null): void;
}) {
  const [forType, setForType] = useState(false);
  const [keep, setKeep] = useState(true);
  const activeKey = m.modelOverride ?? typeModel;
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (activeKey) loadModel(activeKey).then((r) => live && setName(r?.name ?? '(missing file)'));
    else setName(null);
    return () => { live = false; };
  }, [activeKey]);

  const doImport = async () => {
    const key = await importModelFile(keep ? 'contain' : 'stretch');
    if (!key) return;
    if (forType) onSetType(key);
    else onSetMachine(key);
  };

  return (
    <div className="mt-2 space-y-1 text-xs text-slate-400">
      <div>Model: <span className="text-slate-200">{name ?? 'Built-in'}</span>{!m.modelOverride && typeModel && <span className="text-slate-500"> (type)</span>}</div>
      <label className="flex items-center gap-1"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Keep proportions</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={forType} onChange={(e) => setForType(e.target.checked)} /> Use for all {typeName} machines</label>
      <div className="flex gap-1">
        <button className={btn} onClick={doImport}>Import GLB / OBJ / STL / FBX…</button>
        {m.modelOverride && <button className={btn} onClick={() => onSetMachine(undefined)}>Use built-in</button>}
        {!m.modelOverride && typeModel && <button className={btn} onClick={() => onSetType(null)}>Clear type model</button>}
      </div>
    </div>
  );
}

const ROLES: { id: WorkerRole; label: string; hint: string }[] = [
  { id: 'operator', label: 'Operator', hint: 'Machine operator: stands at the machine and works when you press Play.' },
  { id: 'handler', label: 'Handler', hint: 'Material handler: walks its path moving material when you press Play.' },
  { id: 'forklift', label: 'Forklift', hint: 'Forklift driver: drives along its path when you press Play.' },
];

/** Selected worker: role, name, position, walking path (handlers), machines they run, delete. */
function WorkerPanel({ w }: { w: Worker }) {
  const project = useProjectStore((s) => s.project);
  const { updateWorker, removeWorker } = useProjectStore();
  const select = useUiStore((s) => s.select);
  const editing = useUiStore((s) => s.pathEditId === w.id);
  const setPathEdit = useUiStore((s) => s.setPathEdit);
  const layout = activeLayout(project);
  const toggle = (id: string) =>
    updateWorker(w.id, { machineIds: w.machineIds.includes(id) ? w.machineIds.filter((x) => x !== id) : [...w.machineIds, id] });
  const faceTo = layout.machines.find((m) => w.machineIds.includes(m.id));
  return (
    <Panel>
      <input
        key={w.id + w.name}
        className={`${input} w-full py-1 text-sm`}
        defaultValue={w.name}
        onBlur={(e) => e.target.value.trim() && e.target.value !== w.name && updateWorker(w.id, { name: e.target.value.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label="Worker name"
      />
      <div className="mt-2 grid grid-cols-3 gap-1" role="radiogroup" aria-label="Worker role">
        {ROLES.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={w.role === r.id}
            className={w.role === r.id ? `${btn} border-sky-500 text-sky-300` : btn}
            title={r.hint}
            onClick={() => { setPathEdit(null); updateWorker(w.id, { role: r.id }); }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{ROLES.find((r) => r.id === w.role)?.hint}</p>
      <div className="mt-2 space-y-1.5">
        <NumberField label="X (from west wall)" value={w.x} onCommit={(v) => updateWorker(w.id, { x: v })} />
        <NumberField label="Y (from south wall)" value={w.y} onCommit={(v) => updateWorker(w.id, { y: v })} />
        <NumberField label="Rotation" unit="°" digits={1} value={w.rotation} onCommit={(v) => updateWorker(w.id, { rotation: normDeg(v) })} />
        {w.role === 'operator' && faceTo && (
          <button className={`${btn} w-full`} onClick={() => updateWorker(w.id, { rotation: facing(faceTo.x - w.x, faceTo.y - w.y) })}>
            Face {faceTo.name}
          </button>
        )}
      </div>
      {w.role !== 'operator' && <div className="mt-3 border-t border-slate-800 pt-2">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Walking path</div>
        <p className="text-xs text-slate-400">
          {w.path.length
            ? <>{w.path.length} point{w.path.length > 1 ? 's' : ''} · loop {pathLength(w).toFixed(1)} m</>
            : 'No path. Edit path, then click the floor to add points; the worker walks the loop when you press Play.'}
        </p>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          <button className={editing ? `${btn} border-sky-500 text-sky-300` : btn} onClick={() => setPathEdit(editing ? null : w.id)}>
            {editing ? 'Done' : 'Edit path'}
          </button>
          <button className={btn} disabled={!w.path.length} onClick={() => updateWorker(w.id, { path: w.path.slice(0, -1) })}>Undo point</button>
          <button className={btn} disabled={!w.path.length} onClick={() => updateWorker(w.id, { path: [] })}>Clear</button>
        </div>
      </div>}
      <div className="mt-3 border-t border-slate-800 pt-2">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Runs machines ({w.machineIds.length})</div>
        {!layout.machines.length && <p className="text-xs text-slate-500">No machines placed yet.</p>}
        {layout.machines.map((m) => (
          <label key={m.id} className="flex items-center gap-1.5 text-xs text-slate-300">
            <input type="checkbox" checked={w.machineIds.includes(m.id)} onChange={() => toggle(m.id)} />
            {m.name}
          </label>
        ))}
      </div>
      <button className={`${btn} mt-4 w-full text-red-300`} onClick={() => { removeWorker(w.id); select(null); }}>Delete worker</button>
    </Panel>
  );
}

const NEW_AREA = '__new__';

/** Process areas of the active layout: add, rename (blur/Enter), recolour, delete; shows machine count. */
function AreaManager() {
  const project = useProjectStore((s) => s.project);
  const { addArea, updateArea, removeArea } = useProjectStore();
  const layout = activeLayout(project);
  const add = () => {
    const name = prompt('New process area name', `Area ${layout.areas.length + 1}`)?.trim();
    if (name) addArea(name);
  };
  return (
    <Section title="Process areas">
      {!layout.areas.length && (
        <p className="text-xs text-slate-500">Group machines by process stage. Add an area, then pick it under "Process area" for each machine.</p>
      )}
      {layout.areas.map((a) => {
        const n = layout.machines.filter((m) => m.areaId === a.id).length;
        return (
          <div key={a.id} className="flex items-center gap-1">
            <input type="color" className="h-6 w-7 shrink-0" value={a.color} onChange={(e) => updateArea(a.id, { color: e.target.value })} aria-label={`Colour of ${a.name}`} />
            <input
              key={a.id + a.name}
              className={`${input} min-w-0 flex-1`}
              defaultValue={a.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== a.name && updateArea(a.id, { name: e.target.value.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              aria-label="Area name"
            />
            <span className="w-6 text-right text-[11px] text-slate-400" title="Machines in this area">{n}</span>
            <button
              className="px-1 text-slate-400 hover:text-red-300"
              onClick={() => (!n || confirm(`Delete "${a.name}"? Its ${n} machine(s) will be unassigned.`)) && removeArea(a.id)}
              aria-label={`Delete ${a.name}`}
            >×</button>
          </div>
        );
      })}
      <button className={`${btn} w-full`} onClick={add}>+ Add area</button>
    </Section>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-y-auto border-l border-slate-700 bg-slate-900 p-3 text-slate-200">{children}</div>;
}

/** Collapsible group; open state is kept per title in the UI store, so it survives selecting another machine. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const open = useUiStore((s) => !!s.openSections[title]);
  const toggle = useUiStore((s) => s.toggleSection);
  return (
    <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-2">
      <button
        className="flex w-full items-center justify-between text-left text-[11px] font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
        onClick={() => toggle(title)}
        aria-expanded={open}
      >
        {title}
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  );
}
