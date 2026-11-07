import { useState } from 'react';
import { newId } from '../domain/catalogue';
import type { Factory, FactoryItemKind, WallSide } from '../domain/types';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Dialog, btn, btnOn, input } from './Dialog';
import { NumberField } from './NumberField';

type Field = { key: string; label: string; kind: 'num' | 'text' | 'wall' | 'doorKind'; min?: number };

const TABS: { kind: FactoryItemKind; label: string; fields: Field[]; make(f: Factory): any }[] = [
  {
    kind: 'doors', label: 'Doors',
    fields: [
      { key: 'name', label: 'Name', kind: 'text' }, { key: 'wall', label: 'Wall', kind: 'wall' }, { key: 'kind', label: 'Type', kind: 'doorKind' },
      { key: 'offset', label: 'Offset', kind: 'num', min: 0 }, { key: 'width', label: 'Width', kind: 'num', min: 0.1 },
      { key: 'height', label: 'Height', kind: 'num', min: 0.1 }, { key: 'keepClear', label: 'Keep clear', kind: 'num', min: 0 },
    ],
    make: () => ({ id: newId(), name: 'Door', wall: 'south', offset: 2, width: 1, height: 2.1, kind: 'personnel', keepClear: 1.5 }),
  },
  {
    kind: 'windows', label: 'Windows',
    fields: [
      { key: 'name', label: 'Name', kind: 'text' }, { key: 'wall', label: 'Wall', kind: 'wall' },
      { key: 'offset', label: 'Offset', kind: 'num', min: 0 }, { key: 'width', label: 'Width', kind: 'num', min: 0.1 },
      { key: 'height', label: 'Height', kind: 'num', min: 0.1 }, { key: 'sill', label: 'Sill', kind: 'num', min: 0 },
    ],
    make: () => ({ id: newId(), name: 'Window', wall: 'north', offset: 2, width: 2, height: 1.2, sill: 1.2, keepClear: 0 }),
  },
  {
    kind: 'pillars', label: 'Pillars',
    fields: [
      { key: 'x', label: 'X', kind: 'num' }, { key: 'y', label: 'Y', kind: 'num' },
      { key: 'sizeX', label: 'Size X', kind: 'num', min: 0.05 }, { key: 'sizeY', label: 'Size Y', kind: 'num', min: 0.05 },
    ],
    make: (f) => ({ id: newId(), x: f.length / 2, y: f.width / 2, sizeX: 0.4, sizeY: 0.4 }),
  },
  {
    kind: 'internalWalls', label: 'Internal walls',
    fields: [
      { key: 'x1', label: 'X1', kind: 'num' }, { key: 'y1', label: 'Y1', kind: 'num' },
      { key: 'x2', label: 'X2', kind: 'num' }, { key: 'y2', label: 'Y2', kind: 'num' },
      { key: 'thickness', label: 'Thick', kind: 'num', min: 0.02 }, { key: 'height', label: 'Height', kind: 'num', min: 0.1 },
    ],
    make: (f) => ({ id: newId(), x1: f.length / 2, y1: 0, x2: f.length / 2, y2: f.width / 2, thickness: 0.2, height: 3 }),
  },
  {
    kind: 'restrictedZones', label: 'Restricted zones',
    fields: [
      { key: 'name', label: 'Name', kind: 'text' }, { key: 'x', label: 'X', kind: 'num' }, { key: 'y', label: 'Y', kind: 'num' },
      { key: 'length', label: 'Length', kind: 'num', min: 0.1 }, { key: 'width', label: 'Width', kind: 'num', min: 0.1 },
    ],
    make: () => ({ id: newId(), name: 'Restricted', x: 1, y: 1, length: 2, width: 2 }),
  },
];

const WALLS: WallSide[] = ['north', 'south', 'east', 'west'];

export function FactoryConfigDialog() {
  const factory = activeLayout(useProjectStore((s) => s.project)).factory;
  const { updateFactory, upsertFactoryItem, removeFactoryItem } = useProjectStore();
  const close = () => useUiStore.getState().openDialog(null);
  const [tab, setTab] = useState(0);
  const t = TABS[tab];
  const items = factory[t.kind] as any[];

  return (
    <Dialog title="Factory configuration" onClose={close} wide>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Building (inside dimensions)</h3>
      <div className="grid grid-cols-4 gap-x-6 gap-y-1">
        <NumberField label="Length (X)" value={factory.length} min={1} onCommit={(v) => updateFactory({ length: v })} />
        <NumberField label="Width (Y)" value={factory.width} min={1} onCommit={(v) => updateFactory({ width: v })} />
        <NumberField label="Ceiling" value={factory.ceilingHeight} min={1} onCommit={(v) => updateFactory({ ceilingHeight: v })} />
        <NumberField label="Wall thick." value={factory.wallThickness} min={0.05} onCommit={(v) => updateFactory({ wallThickness: v })} />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Origin is the south-west inside corner. Door and window offsets are measured to their centre: along north/south walls from the west end, along east/west walls from the south end.
      </p>

      <div className="mt-4 flex gap-1 border-b border-slate-700 pb-2">
        {TABS.map((x, i) => (
          <button key={x.kind} className={i === tab ? btnOn : btn} onClick={() => setTab(i)}>
            {x.label} ({(factory[x.kind] as unknown[]).length})
          </button>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-slate-700 p-2">
            {t.fields.map((f) => (
              <FieldEditor key={f.key} field={f} value={item[f.key]} onChange={(v) => upsertFactoryItem(t.kind, { ...item, [f.key]: v })} />
            ))}
            <button className={`${btn} ml-auto text-red-300`} onClick={() => removeFactoryItem(t.kind, item.id)}>Delete</button>
          </div>
        ))}
        {!items.length && <p className="text-xs text-slate-500">None yet.</p>}
        <button className={btn} onClick={() => upsertFactoryItem(t.kind, t.make(factory))}>+ Add {t.label.toLowerCase().replace(/s$/, '')}</button>
      </div>
    </Dialog>
  );
}

function FieldEditor({ field, value, onChange }: { field: Field; value: any; onChange(v: any): void }) {
  if (field.kind === 'num') {
    return <div className="w-44"><NumberField label={field.label} value={value ?? 0} min={field.min} onCommit={onChange} /></div>;
  }
  const label = <span className="text-xs text-slate-400">{field.label}</span>;
  if (field.kind === 'text') {
    return (
      <label className="flex items-center gap-1">{label}
        <input key={value} className={`${input} w-32`} defaultValue={value} onBlur={(e) => e.target.value !== value && onChange(e.target.value)} />
      </label>
    );
  }
  const options = field.kind === 'wall' ? WALLS : ['personnel', 'loading'];
  return (
    <label className="flex items-center gap-1">{label}
      <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
