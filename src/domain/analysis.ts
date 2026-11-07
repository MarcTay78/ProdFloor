import { findType } from './catalogue';
import { clearanceRect, localToWorld, machineRect, operatorRect, type Rect } from './geometry';
import type { Layout, Machine, MachineCategory, Project } from './types';
import { doorKeepClearRect, pillarRect, wallRect, zoneRect } from './validation';

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

export type AreaPart = 'footprint' | 'operator' | 'clearance' | 'keepClear' | 'free';

export interface AreaBreakdown {
  usable: number;
  parts: Record<AreaPart, number>;
  footprintByCategory: Partial<Record<MachineCategory, number>>;
}

/** Point-in-rotated-rectangle tester with the trig done once. */
function contains(r: Rect): (x: number, y: number) => boolean {
  const c = Math.cos((-r.rotation * Math.PI) / 180), s = Math.sin((-r.rotation * Math.PI) / 180);
  const hl = r.length / 2, hw = r.width / 2;
  return (x, y) => {
    const dx = x - r.cx, dy = y - r.cy;
    return Math.abs(dx * c - dy * s) <= hl && Math.abs(dx * s + dy * c) <= hw;
  };
}

/**
 * Usable floor (minus pillars, restricted zones, internal walls) split by what covers it.
 * Each cell counted once: footprint > operator > clearance > keep-clear > free.
 * ponytail: samples cell centres at 0.1 m (40 x 20 m ≈ 80k cells); exact polygon union only if precision becomes a problem.
 */
export function areaBreakdown(layout: Layout, project: Pick<Project, 'customTypes'>, cell = 0.1): AreaBreakdown {
  const f = layout.factory;
  const blocked = [...f.pillars.map(pillarRect), ...f.restrictedZones.map(zoneRect), ...f.internalWalls.map(wallRect)].map(contains);
  const footprints = layout.machines.map((m: Machine) => ({
    hit: contains(machineRect(m)),
    cat: findType(project, m.typeId)?.category ?? ('custom' as MachineCategory),
  }));
  const ops = layout.machines.flatMap((m) => {
    const r = operatorRect(m);
    return r ? [contains(r)] : [];
  });
  const clears = layout.machines.map((m) => contains(clearanceRect(m)));
  const keeps = f.doors.map((d) => contains(doorKeepClearRect(f, d)));

  const a = cell * cell;
  const parts: Record<AreaPart, number> = { footprint: 0, operator: 0, clearance: 0, keepClear: 0, free: 0 };
  const byCat: Partial<Record<MachineCategory, number>> = {};
  let usable = 0;
  const nx = Math.round(f.length / cell), ny = Math.round(f.width / cell);
  for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * cell;
    for (let j = 0; j < ny; j++) {
      const y = (j + 0.5) * cell;
      if (blocked.some((h) => h(x, y))) continue;
      usable += a;
      const fp = footprints.find((p) => p.hit(x, y));
      if (fp) {
        parts.footprint += a;
        byCat[fp.cat] = (byCat[fp.cat] ?? 0) + a;
      } else if (ops.some((h) => h(x, y))) parts.operator += a;
      else if (clears.some((h) => h(x, y))) parts.clearance += a;
      else if (keeps.some((h) => h(x, y))) parts.keepClear += a;
      else parts.free += a;
    }
  }
  return { usable, parts, footprintByCategory: byCat };
}
