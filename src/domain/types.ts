export type MachineCategory =
  | 'storage' | 'cutting' | 'planing' | 'joinery' | 'shaping' | 'drilling'
  | 'sanding' | 'assembly' | 'finishing' | 'utilities' | 'custom';

export type ModelFormat = 'glb' | 'gltf' | 'obj' | 'stl' | 'fbx';

export type Side = 'front' | 'back' | 'left' | 'right';
export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface Clearance { front: number; back: number; left: number; right: number }
export interface OperatorArea { side: Side; depth: number; width: number }
export interface Point2 { x: number; y: number }

export interface Machine {
  id: string;
  typeId: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  length: number;
  width: number;
  height: number;
  clearance: Clearance;
  operatorArea: OperatorArea;
  inputPoint: Point2;
  outputPoint: Point2;
  modelOverride?: string;
  color?: string;
}

export interface MachineType {
  id: string;
  name: string;
  category: MachineCategory;
  defaults: Pick<Machine, 'length' | 'width' | 'height' | 'clearance' | 'operatorArea'>;
  model: string;
}

export interface Opening {
  id: string;
  name: string;
  wall: WallSide;
  offset: number;
  width: number;
  height: number;
  sill?: number;
  kind?: 'personnel' | 'loading';
  keepClear: number;
}

export interface InternalWall { id: string; x1: number; y1: number; x2: number; y2: number; thickness: number; height: number }
export interface Pillar { id: string; x: number; y: number; sizeX: number; sizeY: number }
export interface RestrictedZone { id: string; name: string; x: number; y: number; length: number; width: number }

export interface Factory {
  length: number;
  width: number;
  ceilingHeight: number;
  wallThickness: number;
  internalWalls: InternalWall[];
  doors: Opening[];
  windows: Opening[];
  pillars: Pillar[];
  restrictedZones: RestrictedZone[];
}

export interface FlowLink { id: string; fromMachineId: string; toMachineId: string; label?: string }

export interface Layout {
  id: string;
  name: string;
  factory: Factory;
  machines: Machine[];
  flows: FlowLink[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  customTypes: MachineType[];
  typeModels: Record<string, string>;
  layouts: Layout[];
  activeLayoutId: string;
}

export interface EmbeddedModel { name: string; format: ModelFormat; dataBase64: string; fitMode?: 'stretch' | 'contain' }

export interface ProjectFile {
  schemaVersion: 1;
  project: Project;
  models?: Record<string, EmbeddedModel>;
}

/** Factory list keys that hold editable obstacles/openings. */
export type FactoryItemKind = 'internalWalls' | 'doors' | 'windows' | 'pillars' | 'restrictedZones';
