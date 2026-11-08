import type { Machine, MachineCategory, MachineType, Project } from './types';

export const newId = (): string => crypto.randomUUID();

export const CATEGORIES: MachineCategory[] = [
  'storage', 'cutting', 'planing', 'joinery', 'shaping', 'drilling', 'sanding', 'assembly', 'finishing', 'utilities', 'custom',
];

export const CATEGORY_LABELS: Record<MachineCategory, string> = {
  storage: 'Storage', cutting: 'Cutting', planing: 'Planing', joinery: 'Joinery', shaping: 'Shaping', drilling: 'Drilling',
  sanding: 'Sanding', assembly: 'Assembly & Inspection', finishing: 'Finishing & Packing', utilities: 'Utilities', custom: 'Custom',
};

/** Operator side: 'front' (default) or 'infeed' for machines fed by hand at the input end (domain side 'left'). */
function t(
  id: string, name: string, category: MachineCategory,
  length: number, width: number, height: number,
  opts: { clearance?: number; operator?: boolean; operatorAt?: 'front' | 'infeed' } = {},
): MachineType {
  const c = opts.clearance ?? 0.6;
  const operator = opts.operator ?? true;
  const infeed = opts.operatorAt === 'infeed';
  return {
    id, name, category, model: id,
    defaults: {
      length, width, height,
      clearance: { front: c, back: c, left: c, right: c },
      operatorArea: {
        side: infeed ? 'left' : 'front',
        depth: operator ? 0.9 : 0,
        width: operator ? Math.min(infeed ? width : length, 2) : 0,
      },
    },
  };
}

export const CATALOGUE: MachineType[] = [
  t('raw-timber-rack', 'Raw timber storage rack', 'storage', 6.0, 1.2, 3.0),
  t('timber-pallet-stack', 'Raw timber on pallets', 'storage', 2.4, 2.3, 2.2),
  t('wip-rack', 'WIP storage rack', 'storage', 2.5, 1.0, 2.0),
  t('finished-goods-rack', 'Finished goods storage', 'storage', 6.0, 1.2, 3.0),
  t('bandsaw', 'Bandsaw', 'cutting', 1.2, 0.9, 2.1),
  t('table-saw', 'Table saw', 'cutting', 2.0, 1.6, 1.0),
  t('crosscut-saw', 'Crosscut saw', 'cutting', 4.0, 1.0, 1.6),
  t('double-end-saw', 'Double-end cutting machine', 'cutting', 1.3, 2.6, 1.6, { operatorAt: 'infeed' }),
  t('rip-saw', 'Rip saw', 'cutting', 3.0, 1.2, 1.6),
  t('surface-planer', 'Surface planer (jointer)', 'planing', 2.5, 0.8, 1.0),
  t('thickness-planer', 'Thickness planer', 'planing', 1.6, 1.1, 1.3),
  t('four-sided-moulder', 'Four-sided moulder', 'planing', 5.0, 1.6, 1.7),
  t('mortiser', 'Mortising machine', 'joinery', 1.2, 0.9, 1.7),
  t('cnc-mortiser', 'CNC mortising machine', 'joinery', 2.0, 1.3, 2.0),
  t('tenoner', 'Tenon machine', 'joinery', 2.5, 1.6, 1.5),
  t('spindle-moulder', 'Spindle moulder', 'shaping', 1.4, 1.1, 1.2),
  t('router', 'Router', 'shaping', 1.3, 1.1, 1.8),
  t('cnc-router', 'CNC woodworking machine', 'shaping', 4.0, 2.2, 2.0),
  t('chair-apron-cnc', 'CNC auto chair apron machine', 'shaping', 4.2, 1.6, 1.8, { operatorAt: 'infeed' }),
  t('shaper', 'Wood shaping machine', 'shaping', 1.5, 1.2, 1.6),
  t('drill-press', 'Drilling machine', 'drilling', 0.8, 0.6, 1.8),
  t('multi-boring', 'Multi-boring machine', 'drilling', 2.5, 1.2, 1.5),
  t('belt-sander', 'Belt sanding machine', 'sanding', 3.0, 1.2, 1.4),
  t('wide-belt-sander', 'Wide belt sanding machine', 'sanding', 2.2, 2.0, 2.1),
  t('master-sander', 'Master sanding machine', 'sanding', 1.5, 1.6, 2.0, { operatorAt: 'infeed' }),
  t('brush-sander', 'Brush sanding machine', 'sanding', 2.0, 0.7, 1.25),
  t('roller-sander', 'Roller sanding machine', 'sanding', 1.0, 0.75, 1.25),
  t('disc-sander', 'Disc sanding machine', 'sanding', 1.0, 0.6, 1.2),
  t('profile-sander', 'Profile sanding machine', 'sanding', 2.5, 1.3, 1.6),
  t('inspection-table', 'Component inspection table', 'assembly', 2.0, 1.0, 0.9),
  t('assembly-station', 'Assembly workstation', 'assembly', 2.0, 1.2, 0.9),
  t('glue-station', 'Glue application station', 'assembly', 1.5, 0.8, 1.0),
  t('spray-booth', 'Spray booth', 'finishing', 4.0, 3.0, 2.8, { clearance: 1.0 }),
  t('drying-room', 'Drying room', 'finishing', 6.0, 4.0, 2.8, { clearance: 1.0 }),
  t('packing-station', 'Packing station', 'finishing', 2.5, 1.5, 0.9),
  t('dust-collector', 'Dust collector', 'utilities', 2.5, 1.5, 4.0, { operator: false }),
  t('air-compressor', 'Air compressor', 'utilities', 1.4, 0.8, 1.2, { operator: false }),
];

export function allTypes(project: Pick<Project, 'customTypes'>): MachineType[] {
  return [...CATALOGUE, ...project.customTypes];
}

export function findType(project: Pick<Project, 'customTypes'>, typeId: string): MachineType | undefined {
  return allTypes(project).find((t) => t.id === typeId);
}

export function createMachine(type: MachineType, x: number, y: number): Machine {
  const d = type.defaults;
  return {
    id: newId(),
    typeId: type.id,
    name: type.name,
    x, y, rotation: 0,
    length: d.length, width: d.width, height: d.height,
    clearance: { ...d.clearance },
    operatorArea: { ...d.operatorArea },
    inputPoint: { x: -d.length / 2, y: 0 },
    outputPoint: { x: d.length / 2, y: 0 },
  };
}
