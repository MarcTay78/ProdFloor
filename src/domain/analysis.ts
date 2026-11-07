import { localToWorld } from './geometry';
import type { Layout, Machine } from './types';

export interface Distance { straight: number; manhattan: number }

export function linkDistance(a: Machine, b: Machine): Distance {
  const p = localToWorld(a, a.outputPoint), q = localToWorld(b, b.inputPoint);
  const dx = Math.abs(q.x - p.x), dy = Math.abs(q.y - p.y);
  return { straight: Math.hypot(dx, dy), manhattan: dx + dy };
}

export function flowDistances(layout: Layout): Map<string, Distance> {
  const byId = new Map(layout.machines.map((m) => [m.id, m]));
  const out = new Map<string, Distance>();
  for (const f of layout.flows) {
    const a = byId.get(f.fromMachineId), b = byId.get(f.toMachineId);
    if (a && b) out.set(f.id, linkDistance(a, b));
  }
  return out;
}

export interface StepTransition extends Distance { fromStepId: string; toStepId: string; links: number }

/** Consecutive non-empty steps; distance is the mean over the pair's links (a part goes through one parallel machine). */
export function stepTransitions(layout: Layout): StepTransition[] {
  const byId = new Map(layout.machines.map((m) => [m.id, m]));
  const steps = layout.workflow
    .map((s) => ({ id: s.id, ms: s.machineIds.flatMap((id) => byId.get(id) ?? []) }))
    .filter((s) => s.ms.length);
  const out: StepTransition[] = [];
  for (let i = 1; i < steps.length; i++) {
    const ds = steps[i - 1].ms.flatMap((a) => steps[i].ms.filter((b) => b.id !== a.id).map((b) => linkDistance(a, b)));
    if (!ds.length) continue;
    out.push({
      fromStepId: steps[i - 1].id,
      toStepId: steps[i].id,
      links: ds.length,
      straight: ds.reduce((s, d) => s + d.straight, 0) / ds.length,
      manhattan: ds.reduce((s, d) => s + d.manhattan, 0) / ds.length,
    });
  }
  return out;
}

export function totalMovement(layout: Layout): Distance | null {
  const ts = stepTransitions(layout);
  if (!ts.length) return null;
  return { straight: ts.reduce((s, t) => s + t.straight, 0), manhattan: ts.reduce((s, t) => s + t.manhattan, 0) };
}
