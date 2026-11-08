import { machineRect, rectCorners } from './geometry';
import type { Layout, ProcessArea } from './types';

/** Distinct, readable on the grey floor in both 2D and 3D. */
export const AREA_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16'];

export const nextAreaColor = (areas: ProcessArea[]) => AREA_COLORS[areas.length % AREA_COLORS.length];

export interface AreaBounds { area: ProcessArea; count: number; minX: number; minY: number; maxX: number; maxY: number }

/** Floor box around each area's machines (footprint corners, so rotation counts) plus padding; areas with no machines are left out. */
export function areaBounds(layout: Layout, pad = 0.5): AreaBounds[] {
  return layout.areas.flatMap((area) => {
    const corners = layout.machines.filter((m) => m.areaId === area.id).flatMap((m) => rectCorners(machineRect(m)));
    if (!corners.length) return [];
    const xs = corners.map((p) => p.x), ys = corners.map((p) => p.y);
    return [{
      area,
      count: layout.machines.filter((m) => m.areaId === area.id).length,
      minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad,
      maxX: Math.max(...xs) + pad, maxY: Math.max(...ys) + pad,
    }];
  });
}
