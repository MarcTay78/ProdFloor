import { useMemo } from 'react';
import { areaBreakdown, totalMovement, type AreaPart } from '../domain/analysis';
import { CATEGORY_LABELS, findType } from '../domain/catalogue';
import type { MachineCategory } from '../domain/types';
import { validateLayout } from '../domain/validation';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

const f2 = (n: number) => n.toFixed(2);

const PARTS: { key: AreaPart; label: string; color: string }[] = [
  { key: 'footprint', label: 'Machine footprint', color: 'bg-sky-500' },
  { key: 'operator', label: 'Operator areas', color: 'bg-green-500' },
  { key: 'clearance', label: 'Clearance', color: 'bg-blue-800' },
  { key: 'keepClear', label: 'Door keep-clear', color: 'bg-amber-500' },
  { key: 'free', label: 'Free', color: 'bg-slate-700' },
];

export function BottomStatus() {
  const project = useProjectStore((s) => s.project);
  const { focus, setLeftTab } = useUiStore();
  const layout = activeLayout(project);
  const { factory: f, machines } = layout;

  const warnings = useMemo(() => validateLayout(layout), [layout]);
  const area = useMemo(() => areaBreakdown(layout, project), [layout, project]);
  const movement = useMemo(() => totalMovement(layout), [layout]);
  const pct = (v: number) => (area.usable ? (v / area.usable) * 100 : 0);
  const areaTitle = [
    `Usable floor ${f2(area.usable)} m² (excluding pillars, restricted zones, internal walls)`,
    ...PARTS.map((p) => `${p.label}: ${f2(area.parts[p.key])} m² (${f2(pct(area.parts[p.key]))} %)`),
    '',
    'Footprint by category:',
    ...Object.entries(area.footprintByCategory).map(([c, v]) => `  ${CATEGORY_LABELS[c as MachineCategory]}: ${f2(v!)} m²`),
  ].join('\n');

  const byCat: Record<string, number> = {};
  for (const m of machines) {
    const cat = CATEGORY_LABELS[findType(project, m.typeId)?.category ?? 'custom'];
    byCat[cat] = (byCat[cat] ?? 0) + 1;
  }
  const catTitle = Object.entries(byCat).map(([k, v]) => `${k}: ${v}`).join('\n') || 'No machines';

  const errors = warnings.filter((w) => w.severity === 'error').length;

  return (
    <div className="grid h-full grid-cols-[auto_1fr] gap-4 border-t border-slate-700 bg-slate-900 px-4 py-2 text-slate-200">
      <div className="grid grid-cols-3 content-start gap-x-6 gap-y-1 text-xs">
        <Stat label="Factory" value={`${f2(f.length)} × ${f2(f.width)} m`} />
        <Stat label="Floor area" value={`${f2(f.length * f.width)} m²`} />
        <Stat label="Ceiling" value={`${f2(f.ceilingHeight)} m`} />
        <Stat label="Machines" value={String(machines.length)} title={catTitle} />
        <div className="col-span-2" title={areaTitle}>
          <div className="text-slate-500">Space utilisation · footprint {f2(pct(area.parts.footprint))} %</div>
          <div className="mt-1 flex h-2 w-56 overflow-hidden rounded bg-slate-800">
            {PARTS.map((p) => <div key={p.key} className={p.color} style={{ width: `${pct(area.parts[p.key])}%` }} />)}
          </div>
        </div>
        <button className="text-left" onClick={() => setLeftTab('workflow')} title="Manhattan distance along the workflow; click to open the Workflow tab">
          <div className="text-slate-500">Material movement</div>
          <div className="whitespace-nowrap text-slate-100">{movement ? `${f2(movement.manhattan)} m` : '—'}</div>
        </button>
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
                onClick={() => (w.machineIds[0] ? focus(w.machineIds[0]) : setLeftTab('workflow'))}
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
