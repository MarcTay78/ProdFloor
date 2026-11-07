# Dining Chair Factory Layout Planner — Phase 1 Design

Date: 2026-11-07
Status: Approved design, pending spec review

## 1. Goal

Browser app for recreating an existing dining-chair factory in 3D, at real-world scale (metres), and experimenting with machine arrangements. Phase 1 delivers the editable factory, machine library, placement/editing, 2D/3D views, collision detection, and project save/load. Phases 2 (production flow, clearance and distance analysis) and 3 (layout comparison, optimisation) must plug in without changing the data format.

## 2. Decisions

| Topic | Decision |
|---|---|
| App shape | Vite + React 18 + TypeScript single-page app; static build |
| 3D | three, @react-three/fiber, @react-three/drei |
| State | Zustand; undo/redo via zundo (temporal middleware) |
| Styling | Tailwind CSS |
| 2D view | Same R3F scene, orthographic top-down camera — no second renderer |
| Machine models | Procedural model per machine family, built from parameterised parts scaled to real L/W/H; plus import of GLB, GLTF, OBJ, STL, FBX per machine or per type, auto-fitted to the machine's dimensions |
| Building | Rectangular outer shell (length × width) + internal walls as line segments |
| Storage | IndexedDB in the browser (idb-keyval); JSON export/import for backup and sharing |
| Hosting | Static deploy (Vercel or Netlify) for the team. Each user's projects live in their own browser; sharing is by JSON file |
| Units | Metres everywhere in data and UI. Display precision 0.01 m |
| Target | Desktop browsers (Chrome, Edge, Firefox latest) |
| Tests | Vitest for all `domain/` logic |

## 3. Data model

All lengths in metres, angles in degrees, plain JSON-serialisable objects. Floor coordinates: origin at the building's south-west inside corner, `x` along length, `y` along width (rendered as three.js `x` and `z`). Machine `x, y` is the footprint centre.

```ts
interface ProjectFile {
  schemaVersion: 1;
  project: Project;
  models?: Record<string, { name: string; format: ModelFormat; dataBase64: string }>; // optional embedded imports
}

interface Project {
  id: string;
  name: string;
  createdAt: string;   // ISO
  updatedAt: string;
  customTypes: MachineType[];   // user-created machine types
  typeModels: Record<string, string>; // typeId -> imported model key, applies to every machine of that type (built-in or custom)
  layouts: Layout[];            // at least one
  activeLayoutId: string;
}

interface Layout {
  id: string;
  name: string;
  factory: Factory;
  machines: Machine[];
  flows: FlowLink[];            // Phase 2; empty array in Phase 1
}

interface Factory {
  length: number; width: number; ceilingHeight: number; wallThickness: number;
  internalWalls: { id: string; x1: number; y1: number; x2: number; y2: number; thickness: number; height: number }[];
  doors: Opening[];             // entrances, loading doors
  windows: Opening[];
  pillars: { id: string; x: number; y: number; sizeX: number; sizeY: number }[];
  restrictedZones: { id: string; name: string; x: number; y: number; length: number; width: number }[]; // x,y = min corner
}

interface Opening {
  id: string; name: string;
  wall: 'north' | 'south' | 'east' | 'west';
  offset: number;               // to opening centre: north/south walls measured from the west end (x), east/west walls from the south end (y)
  width: number; height: number;
  sill?: number;                // windows only
  kind?: 'personnel' | 'loading'; // doors only
  keepClear: number;            // depth of clear zone inside the door, default 1.5 (personnel) / 4.0 (loading)
}

interface Machine {
  id: string;
  typeId: string;
  name: string;
  x: number; y: number; rotation: number;
  length: number; width: number; height: number;
  clearance: { front: number; back: number; left: number; right: number };
  operatorArea: { side: 'front' | 'back' | 'left' | 'right'; depth: number; width: number };
  inputPoint: { x: number; y: number };   // local coords relative to machine centre, unrotated
  outputPoint: { x: number; y: number };
  modelOverride?: string;                  // key of an imported model
  color?: string;
}

interface FlowLink { id: string; fromMachineId: string; toMachineId: string; label?: string } // Phase 2

interface MachineType {
  id: string; name: string; category: MachineCategory;
  defaults: Pick<Machine, 'length' | 'width' | 'height' | 'clearance' | 'operatorArea'>;
  model: string;      // procedural model key, e.g. 'bandsaw'
}
```

"Machine quantity" means number of placed instances; each instance needs its own floor position. The library and status bar show counts per type and in total.

Front of a machine = its local +y side before rotation. Clearance and operator area are stored now, drawn as outlines in Phase 1, and analysed in Phase 2.

`schemaVersion` drives a `migrate()` function so older files keep loading.

## 4. Machine catalogue (defaults, editable)

L × W × H in metres. Default clearance 0.6 m all round, operator area 0.9 m deep on the front unless stated.

| Category | Type | L × W × H |
|---|---|---|
| Storage | Raw timber storage rack | 6.0 × 1.2 × 3.0 |
| Storage | WIP storage rack | 2.5 × 1.0 × 2.0 |
| Storage | Finished goods storage | 6.0 × 1.2 × 3.0 |
| Cutting | Bandsaw | 1.2 × 0.9 × 2.1 |
| Cutting | Table saw | 2.0 × 1.6 × 1.0 |
| Cutting | Crosscut saw | 4.0 × 1.0 × 1.6 |
| Cutting | Rip saw | 3.0 × 1.2 × 1.6 |
| Joinery | Mortising machine | 1.2 × 0.9 × 1.7 |
| Joinery | Tenon machine | 2.5 × 1.6 × 1.5 |
| Shaping | Spindle moulder | 1.4 × 1.1 × 1.2 |
| Shaping | Router | 1.3 × 1.1 × 1.8 |
| Shaping | CNC woodworking machine | 4.0 × 2.2 × 2.0 |
| Shaping | Wood shaping machine | 1.5 × 1.2 × 1.6 |
| Drilling | Drilling machine | 0.8 × 0.6 × 1.8 |
| Drilling | Multi-boring machine | 2.5 × 1.2 × 1.5 |
| Sanding | Belt sanding machine | 3.0 × 1.2 × 1.4 |
| Sanding | Wide belt sanding machine | 2.2 × 2.0 × 2.1 |
| Sanding | Disc sanding machine | 1.0 × 0.6 × 1.2 |
| Sanding | Profile sanding machine | 2.5 × 1.3 × 1.6 |
| Assembly | Component inspection table | 2.0 × 1.0 × 0.9 |
| Assembly | Assembly workstation | 2.0 × 1.2 × 0.9 |
| Assembly | Glue application station | 1.5 × 0.8 × 1.0 |
| Finishing | Spray booth | 4.0 × 3.0 × 2.8 (clearance 1.0) |
| Finishing | Drying room | 6.0 × 4.0 × 2.8 (clearance 1.0) |
| Finishing | Packing station | 2.5 × 1.5 × 0.9 |
| Utilities | Dust collector | 2.5 × 1.5 × 4.0 (no operator area) |
| Utilities | Air compressor | 1.4 × 0.8 × 1.2 (no operator area) |

Users can create custom types (name, category, defaults, procedural model choice or imported model).

## 5. Module layout

```
src/
  domain/            pure TypeScript, no React, fully unit-tested
    types.ts
    catalogue.ts     built-in MachineType list
    geometry.ts      rotated rectangle corners, SAT overlap, point-in-rect, area
    validation.ts    returns Warning[] for a Layout
    projectFile.ts   serialise, parse + validate, migrate
  store/
    projectStore.ts  projects list, active project/layout, mutations (temporal for undo/redo)
    uiStore.ts       selection, view mode, camera preset, wall visibility, snap settings
    persistence.ts   IndexedDB read/write, autosave (debounced 1 s)
  scene/
    FactoryCanvas.tsx      Canvas, lights, camera switching
    FactoryShell.tsx       floor, outer walls with openings, internal walls, pillars, zones, door keep-clear zones
    MachineInstance.tsx    model + selection outline + label + dimension lines + clearance/operator outlines + warning tint
    DragController.tsx     floor-plane raycast drag, snap, rotate handle
    models/                procedural model components, one file per family
      parts.ts             shared parts: frame, table top, legs, blade, wheel, belt, cabinet, hood, duct, shelf rack, enclosure
      saws.tsx  joinery.tsx  shaping.tsx  drilling.tsx  sanding.tsx  stations.tsx  rooms.tsx  storage.tsx  utilities.tsx
      index.ts             model key -> component registry
    ImportedModel.tsx      loads GLB/GLTF/OBJ/STL/FBX, fits bounding box to L/W/H
  ui/
    TopToolbar.tsx  LeftLibrary.tsx  RightInspector.tsx  BottomStatus.tsx
    FactoryConfigDialog.tsx  ProjectManagerDialog.tsx  CustomTypeDialog.tsx
  App.tsx  main.tsx
```

Each procedural model component receives `{ length, width, height }` and lays parts out proportionally, so the visual always matches the entered dimensions. Adding a machine type = one catalogue entry + (optionally) one model component registered in `models/index.ts`.

## 6. Features

### 6.1 Factory configuration
Dialog edits length, width, ceiling height, wall thickness, and lists of internal walls, doors, windows, pillars, restricted zones (add / edit numerically / delete). Pillars, internal walls and restricted zones can also be selected and dragged in the canvas. Changing dimensions never deletes machines; machines left outside the building are flagged.

### 6.2 Scene
- Concrete floor (CC0 PBR texture from ambientCG, bundled), 1 m grid overlay with 5 m major lines, toggleable.
- Outer walls with real openings for doors and windows; translucent ceiling-height indicator optional.
- Pillars, internal walls, restricted zones (hatched red), door keep-clear zones (dashed yellow).
- Industrial lighting: hemisphere + directional sun with shadows + row of high-bay point/rect lights scaled to building size.
- Machine labels (name) always visible, scaled for readability; can be toggled.
- Selected machine shows L, W, H dimension lines with values, plus clearance (blue) and operator area (green) outlines.
- Hide walls toggle; 2D/3D toggle.

### 6.3 Cameras
- 3D: perspective with OrbitControls (rotate, zoom, pan).
- Presets: Top (orthographic, used for 2D), Front, Side, Iso. Each preset frames the whole building.
- 2D mode: orthographic top view, rotation locked, walls rendered as plan outlines, machine models replaced by footprint rectangles with labels for clarity (toggle "show models in 2D").

### 6.4 Machine editing
- Drag from left library onto floor (HTML drag to canvas; drop point raycast to floor).
- Click to select; drag to move on floor plane, snap 0.1 m (configurable 0.01–1 m, hold Alt to disable).
- Rotate: handle on selected machine, snap 15° (Shift for 1°); keyboard R = +90°.
- Resize: numeric fields in inspector (L/W/H are measurements, never visual scale).
- Duplicate (Ctrl+D, offset 1 m), Delete (Del), Copy/Paste.
- Inspector fields: name, type (change keeps position and dims unless "reset to type defaults"), L/W/H, X/Y, rotation, clearance ×4, operator area, input/output points, model choice (procedural / imported file), colour.
- Custom machine type dialog.

### 6.5 Collision detection and warnings
`validation.ts` produces `Warning { id, severity: 'error' | 'warning', code, message, machineIds, targetId? }` for:
- Machine footprint overlaps another machine footprint (error).
- Machine overlaps pillar, internal wall, restricted zone (error).
- Machine outside or crossing outer walls (error).
- Machine footprint in a door keep-clear zone (warning).
- Machine taller than ceiling height (warning).
- Clearance zones overlapping other machines' footprints (warning; full clearance/operator analysis is Phase 2).

Footprints are rotated rectangles; overlap via separating axis test. Touching edges are not overlaps (tolerance 1 mm). Placement is never blocked: offending machines are tinted red and listed in the bottom panel; clicking a warning selects and frames the machine. Recomputed on every change (n² over machines; fine for hundreds of machines; add a spatial grid if it ever gets slow).

### 6.6 Bottom status panel
Factory L × W, total floor area, machine count (total and per category on hover), machine footprint area, simple utilisation % (footprint ÷ floor area minus pillars/zones), warning count with expandable list.

### 6.7 Undo / redo
Covers all layout and factory changes (Ctrl+Z / Ctrl+Y). Drags record one history entry on drop, not per frame. Selection and camera are not in history. History limit 200.

### 6.8 Projects and persistence
- Project manager dialog: list, create, open, rename, duplicate, delete (with confirm).
- Layouts inside a project: add, duplicate, rename, delete, switch (comparison UI is Phase 3).
- Autosave to IndexedDB 1 s after each change; explicit Save button forces it and shows "Saved" time.
- Export JSON: whole project; checkbox "embed imported models" (base64). Import JSON: validate, migrate, import as a new project (never overwrites an existing one).
- Export PNG screenshot of the current view.

### 6.9 Model import
User picks a GLB/GLTF/OBJ/STL/FBX file for a machine or for a whole type. File stored as a blob in IndexedDB under a generated key. On render the model is centred, its bounding box scaled per-axis to the machine's L/W/H (option to keep proportions, fitting inside the box), and rotated with the machine. Loading spinner while parsing; on failure fall back to procedural model and show a warning toast.

## 7. Error handling
- JSON import: schema check (required fields, number ranges, unique ids); on failure show message listing first few problems; nothing is written.
- Numeric inputs: reject non-numbers and negative sizes; minimum dimension 0.05 m; field shows error state, value not committed.
- IndexedDB unavailable or quota exceeded: banner warning, suggest JSON export; app keeps working in memory.
- WebGL unavailable: full-screen message.

## 8. Testing
- Vitest: geometry (corners, SAT overlap incl. rotated and touching cases), validation (each warning code), projectFile (round-trip, invalid file rejection, migration), catalogue integrity (unique ids, positive dims, model key registered).
- Manual check in browser: place, drag, rotate, resize, duplicate, delete, undo/redo, 2D/3D, camera presets, hide walls, save/reload, export/import, model import.

## 9. Out of scope for Phase 1 (data already prepared)
- Phase 2: production flow links and arrows, editable workflow template (default chair workflow), operator area and clearance analysis, utilisation breakdown, distance between consecutive machines, total material movement distance.
- Phase 3: layout comparison view, optimisation recommendations, automated arrangement suggestions.
- Multi-user shared storage (backend). JSON format is the future API payload.
