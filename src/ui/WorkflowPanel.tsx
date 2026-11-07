import { Fragment, useMemo } from 'react';
import { stepTransitions, totalMovement } from '../domain/analysis';
import { allWorkflowTemplates } from '../domain/templates';
import type { Machine } from '../domain/types';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { btn, input } from './Dialog';

const f2 = (n: number) => n.toFixed(2);

export function WorkflowPanel() {
  const project = useProjectStore((s) => s.project);
  const { addStep, updateStep, moveStep, removeStep, assignToStep, applyWorkflowTemplate, saveWorkflowTemplate } = useProjectStore();
  const { selectedId, focus } = useUiStore();
  const layout = activeLayout(project);
  const byId = useMemo(() => new Map(layout.machines.map((m) => [m.id, m])), [layout.machines]);
  const transitions = useMemo(() => stepTransitions(layout), [layout]);
  const total = useMemo(() => totalMovement(layout), [layout]);
  const into = new Map(transitions.map((t) => [t.toStepId, t]));

  const load = (id: string) => {
    if (!id) return;
    if (layout.workflow.length && !confirm('Replace the current workflow steps?')) return;
    applyWorkflowTemplate(id);
  };
  const save = () => {
    const name = prompt('Template name', `${layout.name} workflow`)?.trim();
    if (name) saveWorkflowTemplate(name);
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-700 bg-slate-900 text-slate-200">
      <div className="space-y-1.5 border-b border-slate-700 p-2">
        <select className={`${input} w-full py-1`} value="" onChange={(e) => load(e.target.value)} aria-label="Load template">
          <option value="">Load template…</option>
          {allWorkflowTemplates(project).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1">
          <button className={btn} onClick={() => addStep()}>+ Add step</button>
          <button className={btn} onClick={save} disabled={!layout.workflow.length}>Save as template</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!layout.workflow.length && <p className="text-xs text-slate-500">No steps yet. Load a template or add steps, then assign machines.</p>}
        {layout.workflow.map((s, i) => {
          const t = into.get(s.id);
          const machines = s.machineIds.map((id) => byId.get(id)).filter((m): m is Machine => !!m);
          return (
            <Fragment key={s.id}>
              {t && (
                <div className="px-2 pb-1 text-[11px] text-orange-300" title={t.links > 1 ? `Mean of ${t.links} links` : undefined}>
                  → {f2(t.manhattan)} m <span className="text-slate-500">(straight {f2(t.straight)} m)</span>
                </div>
              )}
              <div className={`mb-1 rounded border px-2 py-1.5 ${machines.length ? 'border-slate-700 bg-slate-800/60' : 'border-amber-700 bg-amber-950/40'}`}>
                <div className="flex items-center gap-1">
                  <button className="w-5 text-xs text-slate-400 hover:text-sky-300" onClick={() => machines[0] && focus(machines[0].id)} title="Show this step's first machine">{i + 1}</button>
                  <input
                    key={s.id + s.name}
                    className={`${input} min-w-0 flex-1`}
                    defaultValue={s.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && updateStep(s.id, { name: e.target.value.trim() })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    aria-label={`Step ${i + 1} name`}
                  />
                  <button className={`${btn} px-1.5`} disabled={i === 0} onClick={() => moveStep(s.id, -1)} title="Move up">↑</button>
                  <button className={`${btn} px-1.5`} disabled={i === layout.workflow.length - 1} onClick={() => moveStep(s.id, 1)} title="Move down">↓</button>
                  <button className={`${btn} px-1.5 text-red-300`} onClick={() => removeStep(s.id)} title="Delete step">×</button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {machines.map((m) => (
                    <span key={m.id} className="flex items-center rounded bg-slate-700 text-[11px]">
                      <button className="px-1.5 hover:text-sky-300" onClick={() => focus(m.id)}>{m.name}</button>
                      <button className="px-1 text-slate-400 hover:text-red-300" onClick={() => updateStep(s.id, { machineIds: s.machineIds.filter((x) => x !== m.id) })} title="Remove from step">×</button>
                    </span>
                  ))}
                  {!machines.length && <span className="text-[11px] text-amber-300">no machine</span>}
                  <button
                    className={`${btn} py-0 text-[11px]`}
                    disabled={!selectedId || s.machineIds.includes(selectedId)}
                    onClick={() => selectedId && assignToStep(s.id, selectedId)}
                    title="Add the selected machine to this step"
                  >
                    + selected
                  </button>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="border-t border-slate-700 p-2 text-xs">
        <span className="text-slate-400">Total movement </span>
        {total ? <>{f2(total.manhattan)} m <span className="text-slate-500">(straight {f2(total.straight)} m)</span></> : '—'}
      </div>
    </div>
  );
}
