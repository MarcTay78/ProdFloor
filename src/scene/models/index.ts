import type { FC } from 'react';
import { DrillPress, MultiBoring } from './drilling';
import { CncMortiser, Mortiser, Tenoner } from './joinery';
import type { ModelProps } from './parts';
import { FourSidedMoulder, SurfacePlaner, ThicknessPlaner } from './planing';
import { DryingRoom, SprayBooth } from './rooms';
import { BeltSander, DiscSander, MasterSander, ProfileSander, WideBeltSander } from './sanding';
import { Bandsaw, CrosscutSaw, RipSaw, TableSaw } from './saws';
import { CncRouter, Router, Shaper, SpindleMoulder } from './shaping';
import { AssemblyStation, Generic, GlueStation, InspectionTable, PackingStation } from './stations';
import { FinishedGoodsRack, TimberRack, WipRack } from './storage';
import { AirCompressor, DustCollector } from './utilities';

export type { ModelProps } from './parts';

/** Procedural model registry: model key -> component. To add a machine model, add a component and register it here. */
export const MODELS: Record<string, FC<ModelProps>> = {
  'raw-timber-rack': TimberRack,
  'wip-rack': WipRack,
  'finished-goods-rack': FinishedGoodsRack,
  bandsaw: Bandsaw,
  'table-saw': TableSaw,
  'crosscut-saw': CrosscutSaw,
  'rip-saw': RipSaw,
  'surface-planer': SurfacePlaner,
  'thickness-planer': ThicknessPlaner,
  'four-sided-moulder': FourSidedMoulder,
  mortiser: Mortiser,
  'cnc-mortiser': CncMortiser,
  tenoner: Tenoner,
  'spindle-moulder': SpindleMoulder,
  router: Router,
  'cnc-router': CncRouter,
  shaper: Shaper,
  'drill-press': DrillPress,
  'multi-boring': MultiBoring,
  'belt-sander': BeltSander,
  'wide-belt-sander': WideBeltSander,
  'master-sander': MasterSander,
  'disc-sander': DiscSander,
  'profile-sander': ProfileSander,
  'inspection-table': InspectionTable,
  'assembly-station': AssemblyStation,
  'glue-station': GlueStation,
  'spray-booth': SprayBooth,
  'drying-room': DryingRoom,
  'packing-station': PackingStation,
  'dust-collector': DustCollector,
  'air-compressor': AirCompressor,
  generic: Generic,
};

export const MODEL_LABELS: Record<string, string> = {
  generic: 'Generic machine',
  'raw-timber-rack': 'Cantilever timber rack', 'wip-rack': 'Shelf rack', 'finished-goods-rack': 'Pallet rack',
  bandsaw: 'Bandsaw', 'table-saw': 'Table / panel saw', 'crosscut-saw': 'Crosscut saw', 'rip-saw': 'Rip saw',
  'surface-planer': 'Surface planer', 'thickness-planer': 'Thickness planer', 'four-sided-moulder': 'Four-sided moulder',
  mortiser: 'Mortiser', 'cnc-mortiser': 'CNC mortiser', tenoner: 'Tenoner', 'spindle-moulder': 'Spindle moulder', router: 'Overhead router',
  'cnc-router': 'CNC router', shaper: 'Copy shaper', 'drill-press': 'Drill press', 'multi-boring': 'Multi-boring',
  'belt-sander': 'Belt sander', 'wide-belt-sander': 'Wide belt sander', 'master-sander': 'Master sander', 'disc-sander': 'Disc sander', 'profile-sander': 'Profile sander',
  'inspection-table': 'Inspection table', 'assembly-station': 'Assembly bench', 'glue-station': 'Glue station',
  'spray-booth': 'Spray booth', 'drying-room': 'Drying room', 'packing-station': 'Packing bench',
  'dust-collector': 'Dust collector', 'air-compressor': 'Air compressor',
};

export function getModel(key: string): FC<ModelProps> {
  return MODELS[key] ?? MODELS.generic;
}
