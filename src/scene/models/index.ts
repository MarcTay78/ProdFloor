import type { FC } from 'react';
import { DrillPress, MultiBoring, MultiHeadDrill, MultiHeadTableDrill } from './drilling';
import { CncBackLegMortiser, CncMortiser, CncTenoner, Mortiser, Tenoner } from './joinery';
import type { ModelProps } from './parts';
import { FourSidedMoulder, SurfacePlaner, ThicknessPlaner } from './planing';
import { DiscSprayRoom, DryingRoom, HandSprayBooth, SprayBooth } from './rooms';
import { BeltSander, BrushSander, DiscSander, MasterSander, ProfileSander, RollerSander, WideBeltSander } from './sanding';
import { Bandsaw, CrosscutSaw, DoubleEndSaw, RipSaw, TableSaw } from './saws';
import { ChairApronMachine, CncRouter, CncTableProfile, RotaryCopyShaper, Router, Shaper, SpindleMoulder } from './shaping';
import { AssemblyStation, Generic, GlueStation, InspectionTable, PackingStation } from './stations';
import { FinishedGoodsRack, TimberPalletStack, TimberRack, WipRack } from './storage';
import { AirCompressor, DustCollector, OverheadConveyor, OverheadConveyorBend, OverheadConveyorDown, OverheadConveyorUp, RollerConveyor } from './utilities';

export type { ModelProps } from './parts';

/** Procedural model registry: model key -> component. To add a machine model, add a component and register it here. */
export const MODELS: Record<string, FC<ModelProps>> = {
  'raw-timber-rack': TimberRack,
  'timber-pallet-stack': TimberPalletStack,
  'wip-rack': WipRack,
  'finished-goods-rack': FinishedGoodsRack,
  bandsaw: Bandsaw,
  'table-saw': TableSaw,
  'crosscut-saw': CrosscutSaw,
  'double-end-saw': DoubleEndSaw,
  'rip-saw': RipSaw,
  'surface-planer': SurfacePlaner,
  'thickness-planer': ThicknessPlaner,
  'four-sided-moulder': FourSidedMoulder,
  mortiser: Mortiser,
  'cnc-mortiser': CncMortiser,
  tenoner: Tenoner,
  'cnc-tenoner': CncTenoner,
  'cnc-back-leg-mortiser': CncBackLegMortiser,
  'spindle-moulder': SpindleMoulder,
  router: Router,
  'cnc-router': CncRouter,
  'cnc-table-profile': CncTableProfile,
  'chair-apron-cnc': ChairApronMachine,
  shaper: Shaper,
  'rotary-copy-shaper': RotaryCopyShaper,
  'drill-press': DrillPress,
  'multi-boring': MultiBoring,
  'multi-head-drill': MultiHeadDrill,
  'multi-head-table-drill': MultiHeadTableDrill,
  'belt-sander': BeltSander,
  'wide-belt-sander': WideBeltSander,
  'master-sander': MasterSander,
  'brush-sander': BrushSander,
  'roller-sander': RollerSander,
  'disc-sander': DiscSander,
  'profile-sander': ProfileSander,
  'inspection-table': InspectionTable,
  'assembly-station': AssemblyStation,
  'glue-station': GlueStation,
  'spray-booth': SprayBooth,
  'hand-spray-booth': HandSprayBooth,
  'disc-spray-room': DiscSprayRoom,
  'drying-room': DryingRoom,
  'packing-station': PackingStation,
  'dust-collector': DustCollector,
  'air-compressor': AirCompressor,
  'roller-conveyor': RollerConveyor,
  'overhead-conveyor': OverheadConveyor,
  'overhead-conveyor-bend': OverheadConveyorBend,
  'overhead-conveyor-down': OverheadConveyorDown,
  'overhead-conveyor-up': OverheadConveyorUp,
  generic: Generic,
};

export const MODEL_LABELS: Record<string, string> = {
  generic: 'Generic machine',
  'raw-timber-rack': 'Cantilever timber rack', 'timber-pallet-stack': 'Timber bundles on pallet', 'wip-rack': 'Shelf rack', 'finished-goods-rack': 'Pallet rack',
  bandsaw: 'Bandsaw', 'table-saw': 'Table / panel saw', 'crosscut-saw': 'Crosscut saw', 'double-end-saw': 'Double-end trim saw', 'rip-saw': 'Rip saw',
  'surface-planer': 'Surface planer', 'thickness-planer': 'Thickness planer', 'four-sided-moulder': 'Four-sided moulder',
  mortiser: 'Mortiser', 'cnc-mortiser': 'CNC mortiser', tenoner: 'Tenoner', 'cnc-tenoner': 'CNC tenoner', 'cnc-back-leg-mortiser': 'Back leg mortiser', 'spindle-moulder': 'Spindle moulder', router: 'Overhead router',
  'cnc-router': 'CNC router', 'cnc-table-profile': 'ATC nesting router', 'chair-apron-cnc': 'Chair apron moulder', shaper: 'Copy shaper', 'rotary-copy-shaper': 'Rotary copy shaper', 'drill-press': 'Drill press', 'multi-boring': 'Multi-boring', 'multi-head-drill': 'Double-head drill', 'multi-head-table-drill': 'Multi-spindle table drill',
  'belt-sander': 'Belt sander', 'wide-belt-sander': 'Wide belt sander', 'master-sander': 'Master sander', 'brush-sander': 'Brush sander', 'roller-sander': 'Roller sander', 'disc-sander': 'Disc sander', 'profile-sander': 'Profile sander',
  'inspection-table': 'Inspection table', 'assembly-station': 'Assembly bench', 'glue-station': 'Glue station',
  'spray-booth': 'Spray booth', 'hand-spray-booth': 'Open-front spray booth', 'disc-spray-room': 'Disc spray room', 'drying-room': 'Drying room', 'packing-station': 'Packing bench',
  'dust-collector': 'Dust collector', 'air-compressor': 'Air compressor', 'roller-conveyor': 'Roller conveyor', 'overhead-conveyor': 'Overhead hanging conveyor', 'overhead-conveyor-bend': 'Overhead conveyor bend', 'overhead-conveyor-down': 'Overhead conveyor drop', 'overhead-conveyor-up': 'Overhead conveyor rise',
};

export function getModel(key: string): FC<ModelProps> {
  return MODELS[key] ?? MODELS.generic;
}
