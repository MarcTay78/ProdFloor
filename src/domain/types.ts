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
  /** Process area the user assigned this machine to (Layout.areas). */
  areaId?: string;
  /** Overhead slope pieces: height climbed/dropped above the track height; unset = up to 0.5 m under the ceiling. */
  rise?: number;
  /** Overhead line pieces: hooks run from the exit end back to the entry end during Play. */
  reverse?: boolean;
}

/** User-defined group of machines by process stage (e.g. "Cutting", "Sanding"); drawn on the floor around its machines. */
export interface ProcessArea { id: string; name: string; color: string }

/** Person on the floor; placed freely, runs 0..n machines (staffing plan only, no capacity model). */
export interface Worker {
  id: string;
  name: string;
  x: number;
  y: number;
  machineIds: string[];
  /** Degrees counter-clockwise from above; 0 = facing south (same convention as machines). */
  rotation: number;
  /** Walking loop: from (x, y) through these floor points in order and back. */
  path: Point2[];
  /** operator: stands and works at a machine; handler: moves material along its walking path; forklift: drives a forklift along its path. */
  role: WorkerRole;
}

export type WorkerRole = 'operator' | 'handler' | 'forklift';

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

export interface WorkflowStep {
  id: string;
  name: string;
  /** Hint for template auto-assign and "save as template". */
  typeId?: string;
  /** 0, 1 or several machines; several = parallel machines. */
  machineIds: string[];
}

export interface WorkflowTemplate { id: string; name: string; steps: { name: string; typeId?: string }[] }

export interface Layout {
  id: string;
  name: string;
  factory: Factory;
  machines: Machine[];
  /** Ordered process steps; source of truth for flows. */
  workflow: WorkflowStep[];
  /** Derived from workflow by deriveFlows; stored for the scene and the file format. */
  flows: FlowLink[];
  /** Process areas; machines join one by Machine.areaId. */
  areas: ProcessArea[];
  /** Workers placed on this layout's floor. */
  workers: Worker[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  customTypes: MachineType[];
  typeModels: Record<string, string>;
  workflowTemplates: WorkflowTemplate[];
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
