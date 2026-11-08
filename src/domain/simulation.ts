import { localToWorld } from './geometry';
import type { Layout, Point2 } from './types';

export interface RouteLeg {
  /** dwell: passing through a machine (input to output point); move: along a flow to the next machine's input. */
  kind: 'dwell' | 'move';
  from: Point2;
  to: Point2;
  /** Seconds. */
  duration: number;
}

/**
 * Route of part number n through the workflow (display only, not a capacity model).
 * Parallel machines in a step take turns by part number; empty steps are skipped.
 */
export function partRoute(layout: Layout, n: number, speed = 1, dwell = 1): RouteLeg[] {
  const byId = new Map(layout.machines.map((m) => [m.id, m]));
  const picks = layout.workflow
    .map((s) => s.machineIds.flatMap((id) => byId.get(id) ?? []))
    .filter((ms) => ms.length)
    .map((ms) => ms[n % ms.length]);
  const legs: RouteLeg[] = [];
  picks.forEach((m, i) => {
    const prev = picks[i - 1];
    const input = localToWorld(m, m.inputPoint);
    if (prev && prev.id !== m.id) {
      const from = localToWorld(prev, prev.outputPoint);
      legs.push({ kind: 'move', from, to: input, duration: Math.hypot(input.x - from.x, input.y - from.y) / speed });
    }
    legs.push({ kind: 'dwell', from: input, to: localToWorld(m, m.outputPoint), duration: dwell });
  });
  return legs;
}

export const routeDuration = (legs: RouteLeg[]) => legs.reduce((s, l) => s + l.duration, 0);

/** Position t seconds after the part starts; null before it starts or once it has left the last machine. */
export function positionAt(legs: RouteLeg[], t: number): Point2 | null {
  if (t < 0) return null;
  for (const l of legs) {
    if (t <= l.duration) {
      const k = l.duration ? t / l.duration : 1;
      return { x: l.from.x + (l.to.x - l.from.x) * k, y: l.from.y + (l.to.y - l.from.y) * k };
    }
    t -= l.duration;
  }
  return null;
}
