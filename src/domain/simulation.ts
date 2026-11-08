import { normDeg } from './geometry';
import type { Layout, Point2, Worker } from './types';

export interface RouteLeg {
  /** dwell: waiting at a machine's centre; move: straight line to the next machine's centre. */
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
    const at = { x: m.x, y: m.y };
    if (prev && prev.id !== m.id) {
      const from = { x: prev.x, y: prev.y };
      legs.push({ kind: 'move', from, to: at, duration: Math.hypot(at.x - from.x, at.y - from.y) / speed });
    }
    legs.push({ kind: 'dwell', from: at, to: at, duration: dwell });
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

/** Walking speed of a worker, m/s (before the animation speed multiplier). */
export const WALK_SPEED = 1.2;

/** Loop from the worker's position through each path point and back to the start; [] when the path is empty. */
export function walkLoop(w: Pick<Worker, 'x' | 'y' | 'path'>): RouteLeg[] {
  if (!w.path.length) return [];
  const home = { x: w.x, y: w.y };
  const pts = [home, ...w.path, home];
  return pts.slice(1).map((to, i) => {
    const from = pts[i];
    return { kind: 'move', from, to, duration: Math.hypot(to.x - from.x, to.y - from.y) / WALK_SPEED };
  });
}

/** Length of the walking loop in metres. */
export const pathLength = (w: Pick<Worker, 'x' | 'y' | 'path'>) => routeDuration(walkLoop(w)) * WALK_SPEED;

/**
 * Position and facing t seconds into the loop (wraps round). Facing uses the worker rotation
 * convention: degrees, 0 = facing south, 90 = east. Null when the loop has no length.
 */
export function walkPose(legs: RouteLeg[], t: number): (Point2 & { rotation: number }) | null {
  const moving = legs.filter((l) => l.duration > 0);
  const total = routeDuration(moving);
  if (!total) return null;
  let r = ((t % total) + total) % total;
  for (const l of moving) {
    if (r <= l.duration) {
      const k = r / l.duration;
      const dx = l.to.x - l.from.x, dy = l.to.y - l.from.y;
      return { x: l.from.x + dx * k, y: l.from.y + dy * k, rotation: normDeg((Math.atan2(dx, -dy) * 180) / Math.PI) };
    }
    r -= l.duration;
  }
  return null;
}
