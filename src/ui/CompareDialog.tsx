import { useState } from 'react';
import { bestIndexes, layoutMetrics, METRIC_ROWS, type LayoutMetrics } from '../domain/compare';
import type { Layout, Project } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Dialog, btn } from './Dialog';

// Metrics do not depend on custom-type categories, so the layout object alone is a safe key.
const cache = new WeakMap<Layout, LayoutMetrics>();
function metricsOf(layout: Layout, project: Pick<Project, 'customTypes'>): LayoutMetrics {
  let m = cache.get(layout);
  if (!m) cache.set(layout, (m = layoutMetrics(layout, project)));
  return m;
}

export function CompareDialog() {
  const project = useProjectStore((s) => s.project);
  const setActiveLayout = useProjectStore((s) => s.setActiveLayout);
  const close = () => useUiStore.getState().openDialog(null);
  const [ticked, setTicked] = useState(() => new Set(project.layouts.map((l) => l.id)));
  const shown = project.layouts.filter((l) => ticked.has(l.id));
  const metrics = shown.map((l) => metricsOf(l, project));
  const toggle = (id: string) =>
    setTicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Dialog title="Compare layouts" onClose={close} wide>
      <div className="mb-3 flex flex-wrap gap-3">
        {project.layouts.map((l) => (
          <label key={l.id} className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={ticked.has(l.id)} onChange={() => toggle(l.id)} />
            {l.name}
          </label>
        ))}
      </div>
      {shown.length < 2 ? (
        <p className="text-xs text-slate-400">Tick at least two layouts to compare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th />
                {shown.map((l) => (
                  <th key={l.id} className="px-2 py-1 text-left align-top font-medium">
                    <div className="mb-1">{l.name}</div>
                    {l.id === project.activeLayoutId ? (
                      <span className="text-sky-300">Active</span>
                    ) : (
                      <button className={btn} onClick={() => { setActiveLayout(l.id); close(); }}>Switch</button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => {
                const best = bestIndexes(row, metrics);
                return (
                  <tr key={row.key} className="border-t border-slate-800">
                    <td className="whitespace-nowrap py-1 pr-2 text-slate-400">{row.label}</td>
                    {metrics.map((m, i) => {
                      const v = row.value(m);
                      return (
                        <td key={shown[i].id} className={`px-2 py-1 ${best.includes(i) ? 'bg-green-900/50 text-green-200' : ''}`}>
                          {v === null ? '—' : row.format(v)}
                          {row.key === 'longest' && m.longest && (
                            <div className="text-[10px] text-slate-400">{m.longest.from} → {m.longest.to}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
