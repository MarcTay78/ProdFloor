import { useMemo } from 'react';
import { CATEGORY_LABELS, findType } from '../domain/catalogue';
import { validateLayout } from '../domain/validation';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

const f2 = (n: number) => n.toFixed(2);

export function BottomStatus() {
  const project = useProjectStore((s) => s.project);
  const focus = useUiStore((s) => s.focus);
  const layout = activeLayout(project);
  const { factory: f, machines } = layout;

  const warnings = useMemo(() => validateLayout(layout), [layout]);
  const stats = useMemo(() => {
    const floor = f.length * f.width;
    const blocked = f.pillars.reduce((a, p) => a + p.sizeX * p.sizeY, 0) + f.restrictedZones.reduce((a, z) => a + z.length * z.width, 0);
    const footprint = machines.reduce((a, m) => a + m.length * m.width, 0);
    const usable = Math.max(floor - blocked, 0);
    const byCat: Record<string, number> = {};
    for (const m of machines) {
      const cat = CATEGORY_LABELS[findType(project, m.typeId)?.category ?? 'custom'];
      byCat[cat] = (byCat[cat] ?? 0) + 1;
    }
    return { floor, usable, footprint, util: usable ? (footprint / usable) * 100 : 0, byCat };
  }, [f, machines, project]);

  const errors = warnings.filter((w) => w.severity === 'error').length;
  const catTitle = Object.entries(stats.byCat).map(([k, v]) => `${k}: ${v}`).join('\n') || 'No machines';

  return (
    <div className="grid h-full grid-cols-[auto_1fr] gap-4 border-t border-slate-700 bg-slate-900 px-4 py-2 text-slate-200">
      <div className="grid grid-cols-3 content-start gap-x-6 gap-y-1 text-xs">
        <Stat label="Factory" value={`${f2(f.length)} × ${f2(f.width)} m`} />
        <Stat label="Floor area" value={`${f2(stats.floor)} m²`} />
        <Stat label="Ceiling" value={`${f2(f.ceilingHeight)} m`} />
        <Stat label="Machines" value={String(machines.length)} title={catTitle} />
        <Stat label="Machine footprint" value={`${f2(stats.footprint)} m²`} />
        <Stat label="Space utilisation" value={`${f2(stats.util)} %`} title={`Footprint ÷ usable floor (${f2(stats.usable)} m², excluding pillars and restricted zones)`} />
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="mb-1 text-xs text-slate-400">
          Layout warnings: <span className={errors ? 'text-red-400' : 'text-slate-300'}>{errors} errors</span>,{' '}
          <span className={warnings.length - errors ? 'text-amber-400' : 'text-slate-300'}>{warnings.length - errors} warnings</span>
        </div>
        <ul className="flex-1 overflow-y-auto text-xs">
          {warnings.map((w) => (
            <li key={w.id}>
              <button
                className={`w-full truncate rounded px-1 text-left hover:bg-slate-800 ${w.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}
                onClick={() => focus(w.machineIds[0])}
                title={w.message}
              >
                {w.severity === 'error' ? '⛔' : '⚠'} {w.message}
              </button>
            </li>
          ))}
          {!warnings.length && <li className="text-slate-500">No problems found.</li>}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <div className="text-slate-500">{label}</div>
      <div className="whitespace-nowrap text-slate-100">{value}</div>
    </div>
  );
}
