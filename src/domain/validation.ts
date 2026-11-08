import { LINK_TYPES, OVERHEAD_TYPES, SLOPE_TYPES, slopeRise } from './catalogue';
import {
  boxRect, clearanceRect, machineRect, operatorRect, polygonInsideBox, polygonsOverlap, rectCorners, segmentRect, type Rect,
} from './geometry';
import type { Factory, InternalWall, Layout, Opening, Pillar, RestrictedZone } from './types';

export type WarningCode =
  | 'OUTSIDE_BUILDING' | 'TOO_TALL' | 'MACHINE_OVERLAP' | 'OBSTACLE_OVERLAP' | 'DOOR_BLOCKED' | 'CLEARANCE_INTRUSION'
  | 'OPERATOR_BLOCKED' | 'OPERATOR_SHARED' | 'ZONE_CROSSES_WALL' | 'OPERATOR_AT_DOOR' | 'STEP_NO_MACHINE';

export interface LayoutWarning {
  id: string;
  severity: 'error' | 'warning';
  code: WarningCode;
  message: string;
  machineIds: string[];
  targetId?: string;
}

export const pillarRect = (p: Pillar): Rect => boxRect(p.x - p.sizeX / 2, p.y - p.sizeY / 2, p.sizeX, p.sizeY);
export const zoneRect = (z: RestrictedZone): Rect => boxRect(z.x, z.y, z.length, z.width);
export const wallRect = (w: InternalWall): Rect => segmentRect(w.x1, w.y1, w.x2, w.y2, w.thickness);

export function doorKeepClearRect(f: Factory, d: Opening): Rect {
  const w = d.width, k = d.keepClear;
  switch (d.wall) {
    case 'south': return boxRect(d.offset - w / 2, 0, w, k);
    case 'north': return boxRect(d.offset - w / 2, f.width - k, w, k);
    case 'west': return boxRect(0, d.offset - w / 2, k, w);
    case 'east': return boxRect(f.length - k, d.offset - w / 2, k, w);
  }
}

// ponytail: O(n²) pair checks; fine for a few hundred machines, add a spatial grid if it gets slow.
export function validateLayout(layout: Layout): LayoutWarning[] {
  const { factory: f, machines } = layout;
  const out: LayoutWarning[] = [];
  const add = (w: Omit<LayoutWarning, 'id'>) =>
    out.push({ ...w, id: [w.code, ...w.machineIds, w.targetId ?? ''].join(':') });

  const corners = machines.map((m) => rectCorners(machineRect(m)));
  const obstacles = [
    ...f.pillars.map((p) => ({ id: p.id, label: 'a pillar', poly: rectCorners(pillarRect(p)) })),
    ...f.internalWalls.map((w) => ({ id: w.id, label: 'an internal wall', poly: rectCorners(wallRect(w)) })),
    ...f.restrictedZones.map((z) => ({ id: z.id, label: `restricted zone "${z.name}"`, poly: rectCorners(zoneRect(z)) })),
  ];
  const keepClear = f.doors.map((d) => ({ id: d.id, name: d.name, poly: rectCorners(doorKeepClearRect(f, d)) }));

  const ops = machines.map((m) => {
    const r = operatorRect(m);
    return r ? rectCorners(r) : null;
  });
  const walls = f.internalWalls.map((w) => rectCorners(wallRect(w)));
  const overlapsPair = (i: number, j: number) => polygonsOverlap(corners[i], corners[j]);
  // A conveyor joining two machines is meant to touch them: skip every machine-to-machine check for that pair.
  const isLink = machines.map((m) => LINK_TYPES.has(m.typeId));
  const linked = (i: number, j: number) => isLink[i] || isLink[j];

  machines.forEach((m, i) => {
    const inside = polygonInsideBox(corners[i], 0, 0, f.length, f.width);
    if (!inside) {
      add({ severity: 'error', code: 'OUTSIDE_BUILDING', message: `${m.name} is outside or crossing the building walls`, machineIds: [m.id] });
    }
    const top = SLOPE_TYPES.has(m.typeId) ? m.height + slopeRise(m, f.ceilingHeight) : m.height;
    if (top > f.ceilingHeight) {
      add({ severity: 'warning', code: 'TOO_TALL', message: `${m.name} (${+top.toFixed(2)} m) is taller than the ceiling (${f.ceilingHeight} m)`, machineIds: [m.id] });
    }
    for (let j = i + 1; j < machines.length; j++) {
      if (linked(i, j)) continue;
      if (overlapsPair(i, j)) {
        add({ severity: 'error', code: 'MACHINE_OVERLAP', message: `${m.name} overlaps ${machines[j].name}`, machineIds: [m.id, machines[j].id] });
      } else if (ops[i] && ops[j] && polygonsOverlap(ops[i]!, ops[j]!)) {
        add({ severity: 'warning', code: 'OPERATOR_SHARED', message: `Operator areas of ${m.name} and ${machines[j].name} overlap`, machineIds: [m.id, machines[j].id] });
      }
    }
    const overhead = OVERHEAD_TYPES.has(m.typeId);
    for (const o of overhead ? [] : obstacles) {
      if (polygonsOverlap(corners[i], o.poly)) {
        add({ severity: 'error', code: 'OBSTACLE_OVERLAP', message: `${m.name} overlaps ${o.label}`, machineIds: [m.id], targetId: o.id });
      }
    }
    for (const d of overhead ? [] : keepClear) {
      if (polygonsOverlap(corners[i], d.poly)) {
        add({ severity: 'warning', code: 'DOOR_BLOCKED', message: `${m.name} blocks the access area of ${d.name}`, machineIds: [m.id], targetId: d.id });
      }
    }
    const clear = rectCorners(clearanceRect(m));
    machines.forEach((other, j) => {
      if (j !== i && !linked(i, j) && polygonsOverlap(clear, corners[j]) && !overlapsPair(i, j)) {
        add({ severity: 'warning', code: 'CLEARANCE_INTRUSION', message: `${other.name} is inside the operating clearance of ${m.name}`, machineIds: [m.id, other.id] });
      }
    });

    const op = ops[i];
    if (op) {
      machines.forEach((other, j) => {
        if (j !== i && !linked(i, j) && !overlapsPair(i, j) && polygonsOverlap(op, corners[j])) {
          add({ severity: 'error', code: 'OPERATOR_BLOCKED', message: `Operator area of ${m.name} is blocked by ${other.name}`, machineIds: [m.id, other.id] });
        }
      });
      for (const o of obstacles) {
        if (polygonsOverlap(op, o.poly)) {
          add({ severity: 'error', code: 'OPERATOR_BLOCKED', message: `Operator area of ${m.name} is blocked by ${o.label}`, machineIds: [m.id], targetId: o.id });
        }
      }
      for (const d of keepClear) {
        if (polygonsOverlap(op, d.poly)) {
          add({ severity: 'warning', code: 'OPERATOR_AT_DOOR', message: `Operator area of ${m.name} is in the access area of ${d.name}`, machineIds: [m.id], targetId: d.id });
        }
      }
    }
    const zones = op ? [clear, op] : [clear];
    const crosses = zones.some((z) => !polygonInsideBox(z, 0, 0, f.length, f.width) || walls.some((w) => !polygonsOverlap(corners[i], w) && polygonsOverlap(z, w)));
    if (inside && crosses) {
      add({ severity: 'warning', code: 'ZONE_CROSSES_WALL', message: `Clearance or operator area of ${m.name} crosses a wall`, machineIds: [m.id] });
    }
  });

  const present = new Set(machines.map((m) => m.id));
  layout.workflow.forEach((s, i) => {
    if (!s.machineIds.some((id) => present.has(id))) {
      add({ severity: 'warning', code: 'STEP_NO_MACHINE', message: `Workflow step ${i + 1} "${s.name}" has no machine`, machineIds: [], targetId: s.id });
    }
  });
  return out;
}
