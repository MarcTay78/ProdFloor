import { useState } from 'react';
import { CATEGORIES, CATEGORY_LABELS, findType, newId } from '../domain/catalogue';
import type { MachineCategory } from '../domain/types';
import { MODEL_LABELS } from '../scene/models';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Dialog, btn, input } from './Dialog';
import { NumberField } from './NumberField';

export function CustomTypeDialog() {
  const project = useProjectStore((s) => s.project);
  const addCustomType = useProjectStore((s) => s.addCustomType);
  const selectedId = useUiStore((s) => s.selectedId);
  const close = () => useUiStore.getState().openDialog(null);

  // Pre-fill from the selected machine when there is one.
  const src = activeLayout(project).machines.find((m) => m.id === selectedId);
  const srcType = src && findType(project, src.typeId);
  const [name, setName] = useState(src ? `${src.name} (custom)` : '');
  const [category, setCategory] = useState<MachineCategory>(srcType?.category ?? 'custom');
  const [model, setModel] = useState(srcType?.model ?? 'generic');
  const [dims, setDims] = useState({ length: src?.length ?? 1.5, width: src?.width ?? 1, height: src?.height ?? 1.2 });
  const [clearance, setClearance] = useState(src?.clearance.front ?? 0.6);
  const [opDepth, setOpDepth] = useState(src?.operatorArea.depth ?? 0.9);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) { setError('Enter a name'); return; }
    addCustomType({
      id: `custom-${newId()}`, name: name.trim(), category, model,
      defaults: {
        ...dims,
        clearance: { front: clearance, back: clearance, left: clearance, right: clearance },
        operatorArea: { side: 'front', depth: opDepth, width: opDepth > 0 ? Math.min(dims.length, 2) : 0 },
      },
    });
    close();
  };

  return (
    <Dialog title="Custom machine type" onClose={close}>
      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Name
          <input className={`${input} mt-1 w-full py-1`} value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Chair back clamp jig" />
          {error && <span className="text-xs text-red-400">{error}</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">Category
            <select className={`${input} mt-1 w-full`} value={category} onChange={(e) => setCategory(e.target.value as MachineCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-400">3D model
            <select className={`${input} mt-1 w-full`} value={model} onChange={(e) => setModel(e.target.value)}>
              {Object.entries(MODEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <NumberField label="Length" value={dims.length} min={0.05} onCommit={(v) => setDims({ ...dims, length: v })} />
        <NumberField label="Width" value={dims.width} min={0.05} onCommit={(v) => setDims({ ...dims, width: v })} />
        <NumberField label="Height" value={dims.height} min={0.05} onCommit={(v) => setDims({ ...dims, height: v })} />
        <NumberField label="Clearance (all sides)" value={clearance} min={0} onCommit={setClearance} />
        <NumberField label="Operator area depth (0 = none)" value={opDepth} min={0} onCommit={setOpDepth} />
        <p className="text-[11px] text-slate-500">Import a GLB/OBJ/STL/FBX model for it from the inspector after placing one.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button className={btn} onClick={close}>Cancel</button>
          <button className={`${btn} border-sky-500 text-sky-200`} onClick={save}>Add to library</button>
        </div>
      </div>
    </Dialog>
  );
}
