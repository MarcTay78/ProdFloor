import { useEffect, useMemo, useState } from 'react';
import { allTypes, findType } from '../domain/catalogue';
import { normDeg } from '../domain/geometry';
import type { Machine, Side } from '../domain/types';
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
  const { updateMachine, deleteMachines, duplicateMachine, setTypeModel } = useProjectStore();
  const { selectedId, select, openDialog } = useUiStore();
  const layout = activeLayout(project);
  const m = layout.machines.find((x) => x.id === selectedId);
  const warnings = useMemo(() => validateLayout(layout).filter((w) => m && w.machineIds.includes(m.id)), [layout, m]);

  if (!m) {
    return (
      <Panel>
        <h3 className="text-sm font-medium">{layout.name}</h3>
        <p className="mt-1 text-xs text-slate-400">{layout.machines.length} machines placed.</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Click a machine to edit it. Drag to move (hold Alt to skip snapping). Drag the ring to rotate (Shift for 1° steps).
          Shortcuts: R rotate 90°, Ctrl+D duplicate, Delete remove, Ctrl+Z / Ctrl+Y undo / redo, Esc deselect.
        </p>
      </Panel>
    );
  }

  const type = findType(project, m.typeId);
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
      <button className={`${btn} mt-1 w-full`} onClick={resetToType}>Reset to type defaults</button>

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

      {warnings.length > 0 && (
        <Section title="Problems">
          {warnings.map((w) => <p key={w.id} className={`text-xs ${w.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>{w.message}</p>)}
        </Section>
      )}

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

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-y-auto border-l border-slate-700 bg-slate-900 p-3 text-slate-200">{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 space-y-1.5">
      <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </div>
  );
}
