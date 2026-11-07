import type { Machine, Point2 } from './types';

export interface Rect { cx: number; cy: number; length: number; width: number; rotation: number }

const DEG = Math.PI / 180;

function rotate(p: Point2, deg: number): Point2 {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function rectCorners(r: Rect): Point2[] {
  const hl = r.length / 2, hw = r.width / 2;
  return [
    { x: -hl, y: -hw }, { x: hl, y: -hw }, { x: hl, y: hw }, { x: -hl, y: hw },
  ].map((p) => {
    const q = rotate(p, r.rotation);
    return { x: r.cx + q.x, y: r.cy + q.y };
  });
}

function project(poly: Point2[], n: Point2) {
  let min = Infinity, max = -Infinity;
  for (const p of poly) {
    const d = p.x * n.x + p.y * n.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

/** Separating axis test for convex polygons. Overlap shallower than tol counts as touching. */
export function polygonsOverlap(a: Point2[], b: Point2[], tol = 0.001): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const nx = -(q.y - p.y), ny = q.x - p.x;
      const len = Math.hypot(nx, ny);
      if (len === 0) continue;
      const n = { x: nx / len, y: ny / len };
      const pa = project(a, n), pb = project(b, n);
      if (Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min) <= tol) return false;
    }
  }
  return true;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return polygonsOverlap(rectCorners(a), rectCorners(b));
}

export function polygonInsideBox(poly: Point2[], minX: number, minY: number, maxX: number, maxY: number, tol = 0.001): boolean {
  return poly.every((p) => p.x >= minX - tol && p.x <= maxX + tol && p.y >= minY - tol && p.y <= maxY + tol);
}

export function boxRect(x: number, y: number, length: number, width: number): Rect {
  return { cx: x + length / 2, cy: y + width / 2, length, width, rotation: 0 };
}

export function segmentRect(x1: number, y1: number, x2: number, y2: number, thickness: number): Rect {
  return {
    cx: (x1 + x2) / 2, cy: (y1 + y2) / 2,
    length: Math.hypot(x2 - x1, y2 - y1), width: thickness,
    rotation: Math.atan2(y2 - y1, x2 - x1) / DEG,
  };
}

export function localToWorld(m: Pick<Machine, 'x' | 'y' | 'rotation'>, p: Point2): Point2 {
  const q = rotate(p, m.rotation);
  return { x: m.x + q.x, y: m.y + q.y };
}

export function machineRect(m: Machine): Rect {
  return { cx: m.x, cy: m.y, length: m.length, width: m.width, rotation: m.rotation };
}

export function clearanceRect(m: Machine): Rect {
  const { front, back, left, right } = m.clearance;
  const c = localToWorld(m, { x: (right - left) / 2, y: (front - back) / 2 });
  return { cx: c.x, cy: c.y, length: m.length + left + right, width: m.width + front + back, rotation: m.rotation };
}

export function operatorRect(m: Machine): Rect | null {
  const { side, depth, width } = m.operatorArea;
  if (depth <= 0 || width <= 0) return null;
  const hl = m.length / 2, hw = m.width / 2;
  const local =
    side === 'front' ? { p: { x: 0, y: hw + depth / 2 }, l: width, w: depth }
    : side === 'back' ? { p: { x: 0, y: -hw - depth / 2 }, l: width, w: depth }
    : side === 'left' ? { p: { x: -hl - depth / 2, y: 0 }, l: depth, w: width }
    : { p: { x: hl + depth / 2, y: 0 }, l: depth, w: width };
  const c = localToWorld(m, local.p);
  return { cx: c.x, cy: c.y, length: local.l, width: local.w, rotation: m.rotation };
}

export function rectArea(r: Rect): number {
  return r.length * r.width;
}
