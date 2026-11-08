import { areaBreakdown, stepTransitions, totalMovement } from './analysis';
import { findType } from './catalogue';
import { localToWorld } from './geometry';
import type { Layout, Machine, Point2, Project } from './types';
import { validateLayout, type LayoutWarning } from './validation';

export type SuggestionCode = 'SWAP_SAVES' | 'LONG_MOVE' | 'FLOWS_CROSS' | 'NOT_IN_WORKFLOW' | 'CROWDED';

export interface Suggestion {
  code: SuggestionCode;
  text: string;
  /** First id is selected on click; [] for CROWDED. */
  machineIds: string[];
  /** Manhattan metres saved (SWAP_SAVES only). */
  savingM?: number;
}

const LIMIT = 3;
const MIN_SWAP_SAVING = 1;
const LONG_FACTOR = 1.5;
const LONG_MIN = 5;
const CROWDED_PCT = 15;

const errorKeys = (ws: LayoutWarning[]) =>
  new Set(ws.filter((w) => w.severity === 'error').map((w) => `${w.code}|${[...w.machineIds].sort().join(',')}|${w.targetId ?? ''}`));

/**
 * ponytail: tries every pair of workflow machines (~435 layouts for 30 machines, each a totalMovement);
 * validation only runs on savers, best first. Pruned search if this gets measurably slow.
 */
function swaps(layout: Layout, base: number): Suggestion[] {
  const used = new Set(layout.workflow.flatMap((s) => s.machineIds));
  const ms = layout.machines.filter((m) => used.has(m.id));
  const cands: { a: Machine; b: Machine; saving: number; swapped: Layout }[] = [];
  for (let i = 0; i < ms.length; i++) {
    for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j];
      if (a.x === b.x && a.y === b.y) continue;
      const swapped: Layout = {
        ...layout,
        machines: layout.machines.map((m) => (m.id === a.id ? { ...m, x: b.x, y: b.y } : m.id === b.id ? { ...m, x: a.x, y: a.y } : m)),
      };
      const t = totalMovement(swapped);
      if (t && base - t.manhattan >= MIN_SWAP_SAVING) cands.push({ a, b, saving: base - t.manhattan, swapped });
    }
  }
  cands.sort((p, q) => q.saving - p.saving);
  const before = errorKeys(validateLayout(layout));
  const out: Suggestion[] = [];
  for (const c of cands) {
    if (out.length === LIMIT) break;
    if ([...errorKeys(validateLayout(c.swapped))].some((k) => !before.has(k))) continue;
    out.push({
      code: 'SWAP_SAVES',
      text: `Swap ${c.a.name} and ${c.b.name}: saves ${c.saving.toFixed(1)} m`,
      machineIds: [c.a.id, c.b.id],
      savingM: c.saving,
    });
  }
  return out;
}

function longMoves(layout: Layout): Suggestion[] {
  const ts = stepTransitions(layout);
  if (ts.length < 2) return [];
  const mean = ts.reduce((s, t) => s + t.manhattan, 0) / ts.length;
  const index = new Map(layout.workflow.map((s, i) => [s.id, i]));
  const placed = new Set(layout.machines.map((m) => m.id));
  return ts
    .filter((t) => t.manhattan > LONG_FACTOR * mean && t.manhattan > LONG_MIN)
    .sort((p, q) => q.manhattan - p.manhattan)
    .slice(0, LIMIT)
    .map((t) => {
      const i = index.get(t.fromStepId)!, j = index.get(t.toStepId)!;
      const from = layout.workflow[i], to = layout.workflow[j];
      return {
        code: 'LONG_MOVE' as const,
        text: `Step ${i + 1} → ${j + 1} (${from.name} → ${to.name}) is ${t.manhattan.toFixed(1)} m: move them closer`,
        machineIds: [...new Set([...from.machineIds, ...to.machineIds])].filter((id) => placed.has(id)),
      };
    });
}

const orient = (o: Point2, a: Point2, b: Point2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
/** Proper intersection only: touching or collinear segments do not count. */
const segmentsCross = (p1: Point2, p2: Point2, q1: Point2, q2: Point2) =>
  orient(q1, q2, p1) * orient(q1, q2, p2) < 0 && orient(p1, p2, q1) * orient(p1, p2, q2) < 0;

function crossings(layout: Layout): Suggestion[] {
  const byId = new Map(layout.machines.map((m) => [m.id, m]));
  const segs = layout.flows.flatMap((f) => {
    const a = byId.get(f.fromMachineId), b = byId.get(f.toMachineId);
    return a && b ? [{ step: f.label ?? '?', a, b, p: localToWorld(a, a.outputPoint), q: localToWorld(b, b.inputPoint) }] : [];
  });
  const out: Suggestion[] = [];
  for (let i = 0; i < segs.length && out.length < LIMIT; i++) {
    for (let j = i + 1; j < segs.length && out.length < LIMIT; j++) {
      const s = segs[i], t = segs[j];
      const ids = [s.a.id, s.b.id];
      if (ids.includes(t.a.id) || ids.includes(t.b.id)) continue;
      if (!segmentsCross(s.p, s.q, t.p, t.q)) continue;
      out.push({
        code: 'FLOWS_CROSS',
        text: `Flow from step ${s.step} (${s.a.name} → ${s.b.name}) crosses flow from step ${t.step} (${t.a.name} → ${t.b.name})`,
        machineIds: [s.a.id, t.a.id],
      });
    }
  }
  return out;
}

function notInWorkflow(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[] {
  const used = new Set(layout.workflow.flatMap((s) => s.machineIds));
  return layout.machines
    .filter((m) => !used.has(m.id))
    .filter((m) => {
      const cat = findType(project, m.typeId)?.category;
      return cat !== 'storage' && cat !== 'utilities';
    })
    .map((m) => ({ code: 'NOT_IN_WORKFLOW' as const, text: `${m.name} is not in the workflow`, machineIds: [m.id] }));
}

function crowded(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[] {
  if (!layout.machines.length) return [];
  const area = areaBreakdown(layout, project);
  const pct = area.usable ? (area.parts.free / area.usable) * 100 : 100;
  return pct < CROWDED_PCT ? [{ code: 'CROWDED', text: `Only ${Math.round(pct)}% of the floor is free`, machineIds: [] }] : [];
}

/** Text-only improvement hints for one layout; swaps (by saving) first, then rule order. */
export function recommend(layout: Layout, project: Pick<Project, 'customTypes'>): Suggestion[] {
  const total = totalMovement(layout);
  return [
    ...(total ? swaps(layout, total.manhattan) : []),
    ...longMoves(layout),
    ...crossings(layout),
    ...notInWorkflow(layout, project),
    ...crowded(layout, project),
  ];
}
