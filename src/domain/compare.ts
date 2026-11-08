import { areaBreakdown, stepTransitions, totalMovement, type Distance } from './analysis';
import type { Layout, Project } from './types';
import { validateLayout } from './validation';

export interface LayoutMetrics {
  machines: number;
  movement: Distance | null;
  longest: { from: string; to: string; manhattan: number } | null;
  steps: number;
  emptySteps: number;
  /** % of usable floor. */
  area: { footprint: number; operator: number; clearance: number; free: number };
  errors: number;
  warnings: number;
}

export function layoutMetrics(layout: Layout, project: Pick<Project, 'customTypes'>): LayoutMetrics {
  const ts = stepTransitions(layout);
  const top = ts.reduce<(typeof ts)[number] | null>((m, t) => (!m || t.manhattan > m.manhattan ? t : m), null);
  const stepName = (id: string) => layout.workflow.find((s) => s.id === id)?.name ?? '';
  const area = areaBreakdown(layout, project);
  const pct = (v: number) => (area.usable ? (v / area.usable) * 100 : 0);
  const ws = validateLayout(layout);
  return {
    machines: layout.machines.length,
    movement: totalMovement(layout),
    longest: top ? { from: stepName(top.fromStepId), to: stepName(top.toStepId), manhattan: top.manhattan } : null,
    steps: layout.workflow.length,
    emptySteps: layout.workflow.filter((s) => !s.machineIds.length).length,
    area: { footprint: pct(area.parts.footprint), operator: pct(area.parts.operator), clearance: pct(area.parts.clearance), free: pct(area.parts.free) },
    errors: ws.filter((w) => w.severity === 'error').length,
    warnings: ws.filter((w) => w.severity === 'warning').length,
  };
}

export interface MetricRow {
  key: string;
  label: string;
  value(m: LayoutMetrics): number | null;
  format(v: number): string;
  /** null: never highlighted. */
  better: 'lower' | 'higher' | null;
}

const metres = (v: number) => `${v.toFixed(1)} m`;
const percent = (v: number) => `${v.toFixed(1)} %`;
const count = (v: number) => String(v);

export const METRIC_ROWS: MetricRow[] = [
  { key: 'movement', label: 'Material movement', value: (m) => m.movement?.manhattan ?? null, format: metres, better: 'lower' },
  { key: 'straight', label: 'Straight-line movement', value: (m) => m.movement?.straight ?? null, format: metres, better: 'lower' },
  { key: 'longest', label: 'Longest move', value: (m) => m.longest?.manhattan ?? null, format: metres, better: 'lower' },
  { key: 'machines', label: 'Machines', value: (m) => m.machines, format: count, better: null },
  { key: 'steps', label: 'Steps', value: (m) => m.steps, format: count, better: null },
  { key: 'emptySteps', label: 'Empty steps', value: (m) => m.emptySteps, format: count, better: 'lower' },
  { key: 'footprint', label: 'Machine footprint', value: (m) => m.area.footprint, format: percent, better: null },
  { key: 'operator', label: 'Operator areas', value: (m) => m.area.operator, format: percent, better: null },
  { key: 'clearance', label: 'Clearance', value: (m) => m.area.clearance, format: percent, better: null },
  { key: 'free', label: 'Free floor', value: (m) => m.area.free, format: percent, better: 'higher' },
  { key: 'errors', label: 'Errors', value: (m) => m.errors, format: count, better: 'lower' },
  { key: 'warnings', label: 'Warnings', value: (m) => m.warnings, format: count, better: 'lower' },
];

const EPS = 1e-9;

/** Indexes holding the best value; [] when nothing stands out (better=null, < 2 values, or all equal). */
export function bestIndexes(row: MetricRow, metrics: LayoutMetrics[]): number[] {
  if (!row.better) return [];
  const vals = metrics.map((m) => row.value(m));
  const present = vals.filter((v): v is number => v !== null);
  if (present.length < 2) return [];
  const best = row.better === 'lower' ? Math.min(...present) : Math.max(...present);
  if (present.every((v) => Math.abs(v - best) < EPS)) return [];
  return vals.flatMap((v, i) => (v !== null && Math.abs(v - best) < EPS ? [i] : []));
}
