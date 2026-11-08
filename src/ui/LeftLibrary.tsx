import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_LABELS, allTypes } from '../domain/catalogue';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { btn, input } from './Dialog';

export const MACHINE_TYPE_MIME = 'application/x-machine-type';
export const WORKER_MIME = 'application/x-worker';

export function LeftLibrary() {
  const project = useProjectStore((s) => s.project);
  const addMachine = useProjectStore((s) => s.addMachine);
  const addWhitePartLayout = useProjectStore((s) => s.addWhitePartLayout);
  const { select, openDialog, openCategories, toggleCategory } = useUiStore();
  const [query, setQuery] = useState('');

  const layout = activeLayout(project);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of layout.machines) c[m.typeId] = (c[m.typeId] ?? 0) + 1;
    return c;
  }, [layout.machines]);
  const q = query.trim().toLowerCase();
  const types = allTypes(project).filter((t) => !q || t.name.toLowerCase().includes(q));
  const customIds = new Set(project.customTypes.map((t) => t.id));

  const addAtCentre = (typeId: string) => {
    const id = addMachine(typeId, layout.factory.length / 2, layout.factory.width / 2);
    if (id) select(id);
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-700 bg-slate-900 text-slate-200">
      <div className="space-y-2 border-b border-slate-700 p-2">
        <input className={`${input} w-full py-1`} placeholder="Search machines" value={query} onChange={(e) => setQuery(e.target.value)} />
        <p className="text-[11px] leading-tight text-slate-500">Drag onto the floor, or double-click to add at the centre.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {CATEGORIES.map((cat) => {
          const list = types.filter((t) => t.category === cat);
          if (!list.length) return null;
          const isClosed = !openCategories[cat] && !q; // searching shows every match
          return (
            <div key={cat} className="mb-2">
              <button
                className="flex w-full items-center justify-between py-1 text-left text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
                onClick={() => toggleCategory(cat)}
                aria-expanded={!isClosed}
              >
                <span>{CATEGORY_LABELS[cat]} <span className="normal-case text-slate-500">({list.length})</span></span>
                <span>{isClosed ? '▸' : '▾'}</span>
              </button>
              {!isClosed && list.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData(MACHINE_TYPE_MIME, t.id); e.dataTransfer.effectAllowed = 'copy'; }}
                  onDoubleClick={() => addAtCentre(t.id)}
                  className="mb-1 cursor-grab rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5 hover:border-sky-600 active:cursor-grabbing"
                  title="Drag onto the factory floor"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{t.name}{customIds.has(t.id) && <span className="ml-1 rounded bg-violet-900 px-1 text-[10px] text-violet-200">custom</span>}</span>
                    <span className="rounded bg-slate-700 px-1.5 text-[11px] text-slate-300" title="Placed in this layout">{counts[t.id] ?? 0}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t.defaults.length} × {t.defaults.width} × {t.defaults.height} m
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {!types.length && <p className="text-xs text-slate-500">No machines match "{query}".</p>}
      </div>
      <div className="space-y-1.5 border-t border-slate-700 p-2">
        <button
          className={`${btn} w-full`}
          onClick={() => { addWhitePartLayout(); select(null); }}
          title="Adds a new layout in this building with timber storage → cutting → planing → joinery → drilling → shaping → sanding → inspection → WIP, linked in order"
        >
          + White-part production line
        </button>
        <button className={`${btn} w-full`} onClick={() => openDialog('customType')}>+ Custom machine type</button>
      </div>
    </div>
  );
}
