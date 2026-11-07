# Factory Layout Planner — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser app to recreate an existing dining-chair factory in 3D at real scale and place, move, rotate, resize and check machines, with 2D/3D views, collision warnings and project save/load.

**Architecture:** Vite + React SPA. Pure TypeScript `domain/` (types, catalogue, geometry, validation, project file) is unit-tested and has no React. Zustand stores hold the active project (with zundo undo/redo) and UI state. One React Three Fiber scene serves both 3D (perspective) and 2D (orthographic top) views. IndexedDB persistence with debounced autosave; JSON export/import.

**Tech Stack:** React 18.3.1, TypeScript 5.6.3, Vite 5.4.10, three 0.169.0, @react-three/fiber 8.17.10, @react-three/drei 9.114.0, zustand 4.5.5, zundo 2.2.0, idb-keyval 6.2.1, Tailwind CSS 3.4.14, Vitest 2.1.4, fake-indexeddb 6.0.0.

Spec: `docs/superpowers/specs/2026-11-07-factory-layout-planner-phase1-design.md`

## Global Constraints

- All lengths in metres, angles in degrees, in data and UI. Display precision 0.01 m.
- Machine L/W/H are real measurements. Never scale a mesh to represent size changes other than fitting a model to the entered L/W/H.
- Floor coordinates: origin = south-west inside corner; `x` along factory length (east), `y` along width (north). Machine `x, y` = footprint centre. Rotation counter-clockwise viewed from above.
- three.js mapping: floor `(x, y)` → three `(x, height, -y)`; machine rotation `r°` → `rotation.y = r * π/180`. Use `toThree()` from `src/scene/coords.ts`, never inline the mapping.
- Machine local axes: length along local x, width along local y; front = local +y, back = −y, left = −x, right = +x.
- Minimum machine dimension 0.05 m. Default snap 0.1 m, rotation snap 15°.
- Placement never blocked; problems become warnings.
- Undo history limit 200; drags commit one history entry on drop.
- Desktop browsers only (latest Chrome, Edge, Firefox).
- IDs via `crypto.randomUUID()`. No extra id library.
- `src/domain/` must not import React, three, or anything from `src/store`, `src/scene`, `src/ui`.
- Commit after every task; commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Plan conventions

Tasks 1–7 (domain, stores, persistence) contain complete code and tests. Tasks 8–17 are React/three components; they give exact files, props, store calls, the non-obvious code (coordinate mapping, drag, model fitting), and a browser checklist as the test, because rendering behaviour is verified in the browser rather than by unit tests. Run `npm test` at the end of every task; it must stay green.

## File map

```
package.json  vite.config.ts  tsconfig.json  index.html  tailwind.config.js  postcss.config.js  vercel.json  README.md
public/textures/concrete/{color.jpg,normal.jpg,roughness.jpg}   CC0 ambientCG Concrete034 1K
src/main.tsx  src/App.tsx  src/index.css
src/domain/types.ts         all data types
src/domain/catalogue.ts     built-in machine types, createMachine, findType, allTypes
src/domain/geometry.ts      rotated rectangles, SAT overlap, clearance/operator rects
src/domain/validation.ts    validateLayout -> LayoutWarning[]
src/domain/projectFile.ts   create*/serialize/parse/migrate/validate
src/domain/*.test.ts
src/store/projectStore.ts   active project + mutations, temporal undo
src/store/uiStore.ts        selection, view, toggles, snap, drag preview, save status
src/store/persistence.ts    IndexedDB, autosave
src/store/*.test.ts
src/scene/coords.ts         toThree, rotY
src/scene/FactoryCanvas.tsx cameras, lights, controls, 2D/3D
src/scene/FactoryShell.tsx  floor, walls+openings, internal walls, pillars, zones, keep-clear
src/scene/MachineInstance.tsx
src/scene/MachineOverlays.tsx  dimension lines, clearance/operator outlines, label
src/scene/DragController.tsx   floor raycast, move/rotate, drop from library
src/scene/ImportedModel.tsx
src/scene/models/parts.tsx  shared mesh parts + materials
src/scene/models/{saws,joinery,shaping,drilling,sanding,stations,rooms,storage,utilities}.tsx
src/scene/models/index.ts   registry
src/scene/models/registry.test.ts
src/ui/TopToolbar.tsx  LeftLibrary.tsx  RightInspector.tsx  BottomStatus.tsx  NumberField.tsx
src/ui/FactoryConfigDialog.tsx  ProjectManagerDialog.tsx  CustomTypeDialog.tsx  Dialog.tsx
src/ui/shortcuts.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `tailwind.config.js`, `postcss.config.js`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test` scripts; Tailwind available in all components.

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "prodfloor",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@react-three/drei": "9.114.0",
    "@react-three/fiber": "8.17.10",
    "idb-keyval": "6.2.1",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "three": "0.169.0",
    "zundo": "2.2.0",
    "zustand": "4.5.5"
  },
  "devDependencies": {
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "@types/three": "0.169.0",
    "@vitejs/plugin-react": "4.3.3",
    "autoprefixer": "10.4.20",
    "fake-indexeddb": "6.0.0",
    "postcss": "8.4.47",
    "tailwindcss": "3.4.14",
    "typescript": "5.6.3",
    "vite": "5.4.10",
    "vitest": "2.1.4"
  }
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node' },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ProdFloor — Factory Layout Planner</title>
  </head>
  <body class="bg-slate-900">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] };
```

`postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`.gitignore`:
```
node_modules
dist
*.local
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; margin: 0; }
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx`:
```tsx
export default function App() {
  return <div className="h-full grid place-items-center text-slate-200">ProdFloor</div>;
}
```

`src/smoke.test.ts`:
```ts
import { expect, test } from 'vitest';
test('test runner works', () => expect(1 + 1).toBe(2));
```

- [ ] **Step 2: Install and verify**

Run: `npm install`
Expected: completes, no peer-dependency errors.

Run: `npm test`
Expected: `1 passed`.

Run: `npm run build`
Expected: `dist/` created, exit 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TypeScript app with Tailwind and Vitest"
```

---

### Task 2: Domain types and machine catalogue

**Files:**
- Create: `src/domain/types.ts`, `src/domain/catalogue.ts`
- Test: `src/domain/catalogue.test.ts`

**Interfaces:**
- Produces: all types below; `CATALOGUE: MachineType[]`, `CATEGORIES: MachineCategory[]`, `CATEGORY_LABELS: Record<MachineCategory,string>`, `allTypes(project: Pick<Project,'customTypes'>): MachineType[]`, `findType(project, typeId): MachineType | undefined`, `createMachine(type: MachineType, x: number, y: number): Machine`, `newId(): string`.

- [ ] **Step 1: Write types**

`src/domain/types.ts`:
```ts
export type MachineCategory =
  | 'storage' | 'cutting' | 'joinery' | 'shaping' | 'drilling'
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

export interface EmbeddedModel { name: string; format: ModelFormat; dataBase64: string }

export interface ProjectFile {
  schemaVersion: 1;
  project: Project;
  models?: Record<string, EmbeddedModel>;
}

/** Factory list keys that hold editable obstacles/openings. */
export type FactoryItemKind = 'internalWalls' | 'doors' | 'windows' | 'pillars' | 'restrictedZones';
```

- [ ] **Step 2: Write the failing catalogue test**

`src/domain/catalogue.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, CATEGORIES, allTypes, createMachine, findType } from './catalogue';

describe('catalogue', () => {
  test('has 27 built-in types with unique ids', () => {
    expect(CATALOGUE).toHaveLength(27);
    expect(new Set(CATALOGUE.map((t) => t.id)).size).toBe(27);
  });

  test('every type has positive dimensions and a known category', () => {
    for (const t of CATALOGUE) {
      expect(t.defaults.length).toBeGreaterThan(0);
      expect(t.defaults.width).toBeGreaterThan(0);
      expect(t.defaults.height).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(t.category);
    }
  });

  test('spray booth uses 1.0 m clearance, dust collector has no operator area', () => {
    expect(findType({ customTypes: [] }, 'spray-booth')!.defaults.clearance.front).toBe(1.0);
    expect(findType({ customTypes: [] }, 'dust-collector')!.defaults.operatorArea.depth).toBe(0);
  });

  test('createMachine copies defaults, centres at x,y, and does not share objects', () => {
    const type = findType({ customTypes: [] }, 'bandsaw')!;
    const a = createMachine(type, 5, 3);
    const b = createMachine(type, 5, 3);
    expect(a).toMatchObject({ typeId: 'bandsaw', name: 'Bandsaw', x: 5, y: 3, rotation: 0, length: 1.2, width: 0.9, height: 2.1 });
    expect(a.inputPoint).toEqual({ x: -0.6, y: 0 });
    expect(a.outputPoint).toEqual({ x: 0.6, y: 0 });
    expect(a.id).not.toBe(b.id);
    a.clearance.front = 9;
    expect(type.defaults.clearance.front).toBe(0.6);
  });

  test('custom types are found after built-ins', () => {
    const custom = { ...CATALOGUE[0], id: 'my-saw', name: 'My saw', category: 'custom' as const };
    expect(allTypes({ customTypes: [custom] })).toHaveLength(28);
    expect(findType({ customTypes: [custom] }, 'my-saw')!.name).toBe('My saw');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/domain/catalogue.test.ts`
Expected: FAIL, cannot resolve `./catalogue`.

- [ ] **Step 4: Implement catalogue**

`src/domain/catalogue.ts`:
```ts
import type { Machine, MachineCategory, MachineType, Project } from './types';

export const newId = (): string => crypto.randomUUID();

export const CATEGORIES: MachineCategory[] = [
  'storage', 'cutting', 'joinery', 'shaping', 'drilling', 'sanding', 'assembly', 'finishing', 'utilities', 'custom',
];

export const CATEGORY_LABELS: Record<MachineCategory, string> = {
  storage: 'Storage', cutting: 'Cutting', joinery: 'Joinery', shaping: 'Shaping', drilling: 'Drilling',
  sanding: 'Sanding', assembly: 'Assembly & Inspection', finishing: 'Finishing & Packing', utilities: 'Utilities', custom: 'Custom',
};

function t(
  id: string, name: string, category: MachineCategory,
  length: number, width: number, height: number,
  opts: { clearance?: number; operator?: boolean } = {},
): MachineType {
  const c = opts.clearance ?? 0.6;
  const operator = opts.operator ?? true;
  return {
    id, name, category, model: id,
    defaults: {
      length, width, height,
      clearance: { front: c, back: c, left: c, right: c },
      operatorArea: { side: 'front', depth: operator ? 0.9 : 0, width: operator ? Math.min(length, 2) : 0 },
    },
  };
}

export const CATALOGUE: MachineType[] = [
  t('raw-timber-rack', 'Raw timber storage rack', 'storage', 6.0, 1.2, 3.0),
  t('wip-rack', 'WIP storage rack', 'storage', 2.5, 1.0, 2.0),
  t('finished-goods-rack', 'Finished goods storage', 'storage', 6.0, 1.2, 3.0),
  t('bandsaw', 'Bandsaw', 'cutting', 1.2, 0.9, 2.1),
  t('table-saw', 'Table saw', 'cutting', 2.0, 1.6, 1.0),
  t('crosscut-saw', 'Crosscut saw', 'cutting', 4.0, 1.0, 1.6),
  t('rip-saw', 'Rip saw', 'cutting', 3.0, 1.2, 1.6),
  t('mortiser', 'Mortising machine', 'joinery', 1.2, 0.9, 1.7),
  t('tenoner', 'Tenon machine', 'joinery', 2.5, 1.6, 1.5),
  t('spindle-moulder', 'Spindle moulder', 'shaping', 1.4, 1.1, 1.2),
  t('router', 'Router', 'shaping', 1.3, 1.1, 1.8),
  t('cnc-router', 'CNC woodworking machine', 'shaping', 4.0, 2.2, 2.0),
  t('shaper', 'Wood shaping machine', 'shaping', 1.5, 1.2, 1.6),
  t('drill-press', 'Drilling machine', 'drilling', 0.8, 0.6, 1.8),
  t('multi-boring', 'Multi-boring machine', 'drilling', 2.5, 1.2, 1.5),
  t('belt-sander', 'Belt sanding machine', 'sanding', 3.0, 1.2, 1.4),
  t('wide-belt-sander', 'Wide belt sanding machine', 'sanding', 2.2, 2.0, 2.1),
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
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npx vitest run src/domain/catalogue.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add data types and built-in machine catalogue"
```

---

### Task 3: Geometry

**Files:**
- Create: `src/domain/geometry.ts`
- Test: `src/domain/geometry.test.ts`

**Interfaces:**
- Consumes: `Machine`, `Point2` from `types.ts`.
- Produces:
  - `interface Rect { cx: number; cy: number; length: number; width: number; rotation: number }`
  - `rectCorners(r: Rect): Point2[]` (4 corners, counter-clockwise)
  - `polygonsOverlap(a: Point2[], b: Point2[], tol = 0.001): boolean` (convex polygons)
  - `rectsOverlap(a: Rect, b: Rect): boolean`
  - `polygonInsideBox(poly: Point2[], minX: number, minY: number, maxX: number, maxY: number, tol = 0.001): boolean`
  - `boxRect(x: number, y: number, length: number, width: number): Rect` (x,y = min corner)
  - `segmentRect(x1: number, y1: number, x2: number, y2: number, thickness: number): Rect`
  - `localToWorld(m: Pick<Machine,'x'|'y'|'rotation'>, p: Point2): Point2`
  - `machineRect(m: Machine): Rect`, `clearanceRect(m: Machine): Rect`, `operatorRect(m: Machine): Rect | null`
  - `rectArea(r: Rect): number`

- [ ] **Step 1: Write the failing tests**

`src/domain/geometry.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import {
  boxRect, clearanceRect, localToWorld, machineRect, operatorRect, polygonInsideBox,
  rectCorners, rectsOverlap, segmentRect,
} from './geometry';

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
const sq = (cx: number, cy: number, rotation = 0) => ({ cx, cy, length: 1, width: 1, rotation });

describe('rectCorners', () => {
  test('unrotated', () => {
    expect(rectCorners({ cx: 0, cy: 0, length: 2, width: 1, rotation: 0 })).toEqual([
      { x: -1, y: -0.5 }, { x: 1, y: -0.5 }, { x: 1, y: 0.5 }, { x: -1, y: 0.5 },
    ]);
  });
  test('rotated 90° swaps extents', () => {
    const c = rectCorners({ cx: 0, cy: 0, length: 2, width: 1, rotation: 90 });
    near(Math.max(...c.map((p) => p.x)), 0.5);
    near(Math.max(...c.map((p) => p.y)), 1);
  });
});

describe('rectsOverlap', () => {
  test('identical rects overlap', () => expect(rectsOverlap(sq(0, 0), sq(0, 0))).toBe(true));
  test('touching edges do not overlap', () => expect(rectsOverlap(sq(0, 0), sq(1, 0))).toBe(false));
  test('separated do not overlap', () => expect(rectsOverlap(sq(0, 0), sq(3, 0))).toBe(false));
  test('partial overlap', () => expect(rectsOverlap(sq(0, 0), sq(0.5, 0.5))).toBe(true));
  test('rotated rect near corner: bounding boxes overlap but shapes do not', () => {
    expect(rectsOverlap(sq(0, 0), sq(1.1, 1.1, 45))).toBe(false);
  });
  test('rotated rect overlapping', () => expect(rectsOverlap(sq(0, 0), sq(0.7, 0.7, 45))).toBe(true));
});

describe('polygonInsideBox', () => {
  test('inside and crossing', () => {
    expect(polygonInsideBox(rectCorners(sq(5, 5)), 0, 0, 10, 10)).toBe(true);
    expect(polygonInsideBox(rectCorners(sq(9.8, 5)), 0, 0, 10, 10)).toBe(false);
    expect(polygonInsideBox(rectCorners(sq(9.5, 5)), 0, 0, 10, 10)).toBe(true);
  });
});

describe('helpers', () => {
  test('boxRect converts min corner to centre', () => {
    expect(boxRect(2, 3, 4, 2)).toEqual({ cx: 4, cy: 4, length: 4, width: 2, rotation: 0 });
  });
  test('segmentRect for a vertical wall', () => {
    const r = segmentRect(5, 0, 5, 10, 0.2);
    near(r.cx, 5); near(r.cy, 5); near(r.length, 10); near(r.width, 0.2); near(r.rotation, 90);
  });
  test('localToWorld rotates then translates', () => {
    const p = localToWorld({ x: 10, y: 5, rotation: 90 }, { x: 1, y: 0 });
    near(p.x, 10); near(p.y, 6);
  });
});

describe('machine rects', () => {
  const base = () => {
    const m = createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, 10, 5);
    m.length = 2; m.width = 1;
    m.clearance = { front: 1, back: 0, left: 0, right: 0 };
    m.operatorArea = { side: 'front', depth: 0.9, width: 2 };
    return m;
  };
  test('machineRect', () => expect(machineRect(base())).toEqual({ cx: 10, cy: 5, length: 2, width: 1, rotation: 0 }));
  test('clearanceRect extends to the front', () => {
    const r = clearanceRect(base());
    near(r.cx, 10); near(r.cy, 5.5); near(r.length, 2); near(r.width, 2);
  });
  test('clearanceRect follows rotation (front faces -x at 90°)', () => {
    const m = base(); m.rotation = 90;
    const r = clearanceRect(m);
    near(r.cx, 9.5); near(r.cy, 5); near(r.rotation, 90);
  });
  test('operatorRect sits outside the front edge', () => {
    const r = operatorRect(base())!;
    near(r.cx, 10); near(r.cy, 5 + 0.5 + 0.45); near(r.length, 2); near(r.width, 0.9);
  });
  test('operatorRect left side is depth wide along x', () => {
    const m = base(); m.operatorArea = { side: 'left', depth: 0.8, width: 1 };
    const r = operatorRect(m)!;
    near(r.cx, 10 - 1 - 0.4); near(r.cy, 5); near(r.length, 0.8); near(r.width, 1);
  });
  test('operatorRect null when depth is 0', () => {
    const m = base(); m.operatorArea.depth = 0;
    expect(operatorRect(m)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/domain/geometry.test.ts`
Expected: FAIL, cannot resolve `./geometry`.

- [ ] **Step 3: Implement**

`src/domain/geometry.ts`:
```ts
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
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/domain/geometry.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add rotated-rectangle geometry and SAT overlap"
```

---

### Task 4: Layout validation

**Files:**
- Create: `src/domain/validation.ts`
- Test: `src/domain/validation.test.ts`

**Interfaces:**
- Consumes: geometry functions from Task 3; `Layout`, `Factory`, `Opening` types.
- Produces:
  - `type WarningCode = 'OUTSIDE_BUILDING' | 'TOO_TALL' | 'MACHINE_OVERLAP' | 'OBSTACLE_OVERLAP' | 'DOOR_BLOCKED' | 'CLEARANCE_INTRUSION'`
  - `interface LayoutWarning { id: string; severity: 'error' | 'warning'; code: WarningCode; message: string; machineIds: string[]; targetId?: string }`
  - `validateLayout(layout: Layout): LayoutWarning[]`
  - `doorKeepClearRect(factory: Factory, door: Opening): Rect`
  - `pillarRect(p: Pillar): Rect`, `zoneRect(z: RestrictedZone): Rect`, `wallRect(w: InternalWall): Rect`

- [ ] **Step 1: Write the failing tests**

`src/domain/validation.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import type { Factory, Layout, Machine } from './types';
import { doorKeepClearRect, validateLayout } from './validation';

const factory = (over: Partial<Factory> = {}): Factory => ({
  length: 20, width: 10, ceilingHeight: 6, wallThickness: 0.3,
  internalWalls: [], doors: [], windows: [], pillars: [], restrictedZones: [], ...over,
});

const box = (x: number, y: number, l = 2, w = 1, over: Partial<Machine> = {}): Machine => ({
  ...createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, x, y),
  length: l, width: w, height: 1,
  clearance: { front: 0, back: 0, left: 0, right: 0 },
  ...over,
});

const layout = (machines: Machine[], f: Factory = factory()): Layout => ({ id: 'L', name: 'L', factory: f, machines, flows: [] });
const codes = (l: Layout) => validateLayout(l).map((w) => w.code).sort();

describe('validateLayout', () => {
  test('clean layout has no warnings', () => {
    expect(validateLayout(layout([box(5, 5), box(10, 5)]))).toEqual([]);
  });

  test('machine crossing the outer wall', () => {
    const w = validateLayout(layout([box(19.5, 5)]));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'OUTSIDE_BUILDING', severity: 'error' });
  });

  test('machine taller than ceiling', () => {
    expect(codes(layout([box(5, 5, 2, 1, { height: 7 })]))).toEqual(['TOO_TALL']);
  });

  test('two overlapping machines produce one pair warning', () => {
    const a = box(5, 5), b = box(6, 5);
    const w = validateLayout(layout([a, b]));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'MACHINE_OVERLAP', severity: 'error' });
    expect(w[0].machineIds.sort()).toEqual([a.id, b.id].sort());
  });

  test('machines touching edge to edge are fine', () => {
    expect(validateLayout(layout([box(5, 5), box(7, 5)]))).toEqual([]);
  });

  test('overlap with pillar, internal wall and restricted zone', () => {
    const f = factory({
      pillars: [{ id: 'p1', x: 5, y: 5, sizeX: 0.4, sizeY: 0.4 }],
      internalWalls: [{ id: 'w1', x1: 10, y1: 0, x2: 10, y2: 6, thickness: 0.2, height: 3 }],
      restrictedZones: [{ id: 'z1', name: 'Electrical', x: 14, y: 4, length: 2, width: 2 }],
    });
    const w = validateLayout(layout([box(5, 5), box(10, 3), box(15, 5)], f));
    expect(w.map((x) => [x.code, x.targetId])).toEqual([
      ['OBSTACLE_OVERLAP', 'p1'], ['OBSTACLE_OVERLAP', 'w1'], ['OBSTACLE_OVERLAP', 'z1'],
    ]);
  });

  test('machine in door keep-clear zone', () => {
    const f = factory({
      doors: [{ id: 'd1', name: 'Loading', wall: 'south', offset: 5, width: 4, height: 4, kind: 'loading', keepClear: 4 }],
    });
    const w = validateLayout(layout([box(5, 2)], f));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'DOOR_BLOCKED', severity: 'warning', targetId: 'd1' });
  });

  test('neighbour inside operating clearance (but not overlapping footprint)', () => {
    const a = box(5, 5, 2, 1, { clearance: { front: 1, back: 0, left: 0, right: 0 } });
    const b = box(5, 6.4);
    const w = validateLayout(layout([a, b]));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: 'CLEARANCE_INTRUSION', severity: 'warning', machineIds: [a.id, b.id] });
  });
});

describe('doorKeepClearRect', () => {
  const f = factory();
  const d = { id: 'd', name: 'D', offset: 4, width: 2, height: 2, keepClear: 1.5 };
  test('south', () => expect(doorKeepClearRect(f, { ...d, wall: 'south' })).toMatchObject({ cx: 4, cy: 0.75, length: 2, width: 1.5 }));
  test('north', () => expect(doorKeepClearRect(f, { ...d, wall: 'north' })).toMatchObject({ cx: 4, cy: 9.25 }));
  test('west', () => expect(doorKeepClearRect(f, { ...d, wall: 'west' })).toMatchObject({ cx: 0.75, cy: 4, length: 1.5, width: 2 }));
  test('east', () => expect(doorKeepClearRect(f, { ...d, wall: 'east' })).toMatchObject({ cx: 19.25, cy: 4 }));
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/domain/validation.test.ts`
Expected: FAIL, cannot resolve `./validation`.

- [ ] **Step 3: Implement**

`src/domain/validation.ts`:
```ts
import {
  boxRect, clearanceRect, machineRect, polygonInsideBox, polygonsOverlap, rectCorners, segmentRect, type Rect,
} from './geometry';
import type { Factory, InternalWall, Layout, Opening, Pillar, RestrictedZone } from './types';

export type WarningCode =
  | 'OUTSIDE_BUILDING' | 'TOO_TALL' | 'MACHINE_OVERLAP' | 'OBSTACLE_OVERLAP' | 'DOOR_BLOCKED' | 'CLEARANCE_INTRUSION';

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

  machines.forEach((m, i) => {
    if (!polygonInsideBox(corners[i], 0, 0, f.length, f.width)) {
      add({ severity: 'error', code: 'OUTSIDE_BUILDING', message: `${m.name} is outside or crossing the building walls`, machineIds: [m.id] });
    }
    if (m.height > f.ceilingHeight) {
      add({ severity: 'warning', code: 'TOO_TALL', message: `${m.name} (${m.height} m) is taller than the ceiling (${f.ceilingHeight} m)`, machineIds: [m.id] });
    }
    for (let j = i + 1; j < machines.length; j++) {
      if (polygonsOverlap(corners[i], corners[j])) {
        add({ severity: 'error', code: 'MACHINE_OVERLAP', message: `${m.name} overlaps ${machines[j].name}`, machineIds: [m.id, machines[j].id] });
      }
    }
    for (const o of obstacles) {
      if (polygonsOverlap(corners[i], o.poly)) {
        add({ severity: 'error', code: 'OBSTACLE_OVERLAP', message: `${m.name} overlaps ${o.label}`, machineIds: [m.id], targetId: o.id });
      }
    }
    for (const d of keepClear) {
      if (polygonsOverlap(corners[i], d.poly)) {
        add({ severity: 'warning', code: 'DOOR_BLOCKED', message: `${m.name} blocks the access area of ${d.name}`, machineIds: [m.id], targetId: d.id });
      }
    }
    const clear = rectCorners(clearanceRect(m));
    machines.forEach((other, j) => {
      if (j !== i && polygonsOverlap(clear, corners[j]) && !polygonsOverlap(corners[i], corners[j])) {
        add({ severity: 'warning', code: 'CLEARANCE_INTRUSION', message: `${other.name} is inside the operating clearance of ${m.name}`, machineIds: [m.id, other.id] });
      }
    });
  });
  return out;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/domain/validation.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add layout validation warnings"
```

---

### Task 5: Project creation, serialisation, import validation

**Files:**
- Create: `src/domain/projectFile.ts`
- Test: `src/domain/projectFile.test.ts`

**Interfaces:**
- Consumes: `newId` from catalogue; types.
- Produces:
  - `SCHEMA_VERSION = 1`
  - `createFactory(): Factory` (40 × 20 × 6 m, wall 0.3 m, one loading door south offset 6 w 4 h 4.5 keepClear 4, one personnel door west offset 3 w 1 h 2.1 keepClear 1.5)
  - `createLayout(name?: string, factory?: Factory): Layout`
  - `createProject(name: string): Project`
  - `serializeProject(project: Project, models?: ProjectFile['models']): string`
  - `type ParseResult = { ok: true; file: ProjectFile } | { ok: false; errors: string[] }`
  - `parseProjectFile(text: string): ParseResult`
  - `asNewProject(project: Project, name?: string): Project` (fresh id + timestamps; used for import and duplicate)

- [ ] **Step 1: Write the failing tests**

`src/domain/projectFile.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import { asNewProject, createProject, parseProjectFile, serializeProject } from './projectFile';

const sample = () => {
  const p = createProject('Test factory');
  p.layouts[0].machines.push(createMachine(CATALOGUE[3], 5, 5));
  return p;
};

describe('createProject', () => {
  test('has one active layout with default factory', () => {
    const p = createProject('A');
    expect(p.layouts).toHaveLength(1);
    expect(p.activeLayoutId).toBe(p.layouts[0].id);
    expect(p.layouts[0].factory).toMatchObject({ length: 40, width: 20, ceilingHeight: 6 });
    expect(p.layouts[0].factory.doors).toHaveLength(2);
    expect(p.typeModels).toEqual({});
  });
});

describe('serialize / parse', () => {
  test('round trip', () => {
    const p = sample();
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.project).toEqual(p);
  });

  test('rejects non-JSON', () => {
    expect(parseProjectFile('nope')).toEqual({ ok: false, errors: ['File is not valid JSON'] });
  });

  test('rejects unknown schema version', () => {
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 99, project: sample() }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/schemaVersion/);
  });

  test('lists field problems', () => {
    const p = sample();
    p.layouts[0].factory.length = -1;
    p.layouts[0].machines[0].width = 0.01;
    p.layouts[0].machines.push({ ...p.layouts[0].machines[0] });
    const r = parseProjectFile(serializeProject(p));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('factory.length'))).toBe(true);
      expect(r.errors.some((e) => e.includes('width'))).toBe(true);
      expect(r.errors.some((e) => e.includes('duplicate machine id'))).toBe(true);
    }
  });

  test('fills missing optional collections from older files', () => {
    const p: any = sample();
    delete p.typeModels;
    delete p.layouts[0].flows;
    delete p.layouts[0].factory.windows;
    const r = parseProjectFile(JSON.stringify({ schemaVersion: 1, project: p }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.project.typeModels).toEqual({});
      expect(r.file.project.layouts[0].flows).toEqual([]);
      expect(r.file.project.layouts[0].factory.windows).toEqual([]);
    }
  });
});

describe('asNewProject', () => {
  test('new id, keeps content', () => {
    const p = sample();
    const c = asNewProject(p, 'Copy');
    expect(c.id).not.toBe(p.id);
    expect(c.name).toBe('Copy');
    expect(c.layouts).toEqual(p.layouts);
    expect(c.layouts).not.toBe(p.layouts);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/domain/projectFile.test.ts`
Expected: FAIL, cannot resolve `./projectFile`.

- [ ] **Step 3: Implement**

`src/domain/projectFile.ts`:
```ts
import { newId } from './catalogue';
import type { Factory, Layout, Project, ProjectFile } from './types';

export const SCHEMA_VERSION = 1;
const MIN_DIM = 0.05;

export function createFactory(): Factory {
  return {
    length: 40, width: 20, ceilingHeight: 6, wallThickness: 0.3,
    internalWalls: [],
    doors: [
      { id: newId(), name: 'Loading door', wall: 'south', offset: 6, width: 4, height: 4.5, kind: 'loading', keepClear: 4 },
      { id: newId(), name: 'Staff entrance', wall: 'west', offset: 3, width: 1, height: 2.1, kind: 'personnel', keepClear: 1.5 },
    ],
    windows: [],
    pillars: [],
    restrictedZones: [],
  };
}

export function createLayout(name = 'Layout 1', factory: Factory = createFactory()): Layout {
  return { id: newId(), name, factory, machines: [], flows: [] };
}

export function createProject(name: string): Project {
  const layout = createLayout();
  const now = new Date().toISOString();
  return { id: newId(), name, createdAt: now, updatedAt: now, customTypes: [], typeModels: {}, layouts: [layout], activeLayoutId: layout.id };
}

export function asNewProject(project: Project, name = project.name): Project {
  const now = new Date().toISOString();
  return { ...structuredClone(project), id: newId(), name, createdAt: now, updatedAt: now };
}

export function serializeProject(project: Project, models?: ProjectFile['models']): string {
  const file: ProjectFile = { schemaVersion: SCHEMA_VERSION, project, ...(models ? { models } : {}) };
  return JSON.stringify(file, null, 2);
}

export type ParseResult = { ok: true; file: ProjectFile } | { ok: false; errors: string[] };

/** Fill collections added after a file was written. Bump SCHEMA_VERSION and add steps here for breaking changes. */
function migrate(raw: any): any {
  const p = raw.project;
  p.customTypes ??= [];
  p.typeModels ??= {};
  for (const l of p.layouts ?? []) {
    l.flows ??= [];
    l.machines ??= [];
    const f = l.factory ?? {};
    for (const k of ['internalWalls', 'doors', 'windows', 'pillars', 'restrictedZones']) f[k] ??= [];
  }
  return raw;
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function validateProject(p: any): string[] {
  const errors: string[] = [];
  if (typeof p?.id !== 'string' || typeof p?.name !== 'string') errors.push('project.id and project.name must be text');
  if (!Array.isArray(p?.layouts) || p.layouts.length === 0) return [...errors, 'project.layouts must contain at least one layout'];
  if (!p.layouts.some((l: any) => l.id === p.activeLayoutId)) errors.push('project.activeLayoutId does not match any layout');
  p.layouts.forEach((l: any, li: number) => {
    const at = `layouts[${li}]`;
    const f = l.factory;
    for (const k of ['length', 'width', 'ceilingHeight'] as const) {
      if (!num(f?.[k]) || f[k] <= 0) errors.push(`${at}.factory.${k} must be a positive number`);
    }
    const ids = new Set<string>();
    (l.machines as any[]).forEach((m, mi) => {
      const mat = `${at}.machines[${mi}]`;
      if (typeof m.id !== 'string') errors.push(`${mat}.id missing`);
      else if (ids.has(m.id)) errors.push(`${mat}: duplicate machine id ${m.id}`);
      else ids.add(m.id);
      for (const k of ['x', 'y', 'rotation'] as const) if (!num(m[k])) errors.push(`${mat}.${k} must be a number`);
      for (const k of ['length', 'width', 'height'] as const) {
        if (!num(m[k]) || m[k] < MIN_DIM) errors.push(`${mat}.${k} must be at least ${MIN_DIM} m`);
      }
    });
  });
  return errors;
}

export function parseProjectFile(text: string): ParseResult {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['File is not valid JSON'] };
  }
  if (raw?.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported schemaVersion ${raw?.schemaVersion}; this app reads version ${SCHEMA_VERSION}`] };
  }
  if (typeof raw.project !== 'object' || raw.project === null) return { ok: false, errors: ['File has no project'] };
  const errors = validateProject(migrate(raw).project);
  return errors.length ? { ok: false, errors } : { ok: true, file: raw as ProjectFile };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/domain/projectFile.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat(domain): add project creation, JSON serialisation and import validation"
```

---

### Task 6: Stores (project with undo/redo, UI)

**Files:**
- Create: `src/store/projectStore.ts`, `src/store/uiStore.ts`
- Test: `src/store/projectStore.test.ts`

**Interfaces:**
- Consumes: catalogue, projectFile, types.
- Produces:
  - `useProjectStore` (zustand hook, with `.temporal` from zundo) state:
    ```ts
    project: Project
    setProject(p: Project): void            // raw set; app code uses openProject()
    renameProject(name: string): void
    addMachine(typeId: string, x: number, y: number): string | null   // returns new id
    updateMachine(id: string, patch: Partial<Machine>): void
    deleteMachines(ids: string[]): void
    duplicateMachine(id: string): string | null   // +1 m in x
    updateFactory(patch: Partial<Factory>): void
    upsertFactoryItem<K extends FactoryItemKind>(kind: K, item: Factory[K][number]): void
    removeFactoryItem(kind: FactoryItemKind, id: string): void
    addLayout(name?: string): void          // new layout copies current factory, no machines
    duplicateLayout(id: string): void
    renameLayout(id: string, name: string): void
    deleteLayout(id: string): void          // no-op if it is the last layout
    setActiveLayout(id: string): void
    addCustomType(type: MachineType): void
    setTypeModel(typeId: string, modelKey: string | null): void
    ```
  - `activeLayout(p: Project): Layout`
  - `openProject(p: Project): void` — sets project and clears undo history. Use this everywhere a project is opened, imported or created.
  - `undo()`, `redo()`, `canUndo()`, `canRedo()` helpers exported from projectStore.
  - `useUiStore` state:
    ```ts
    selectedId: string | null; select(id: string | null): void
    viewMode: '3d' | '2d'; setViewMode(m): void
    cameraPreset: 'iso' | 'top' | 'front' | 'side'; cameraNonce: number; setCameraPreset(p): void
    showWalls: boolean; showLabels: boolean; showGrid: boolean; showModelsIn2d: boolean
    toggle(key: 'showWalls' | 'showLabels' | 'showGrid' | 'showModelsIn2d'): void
    snap: number; setSnap(v: number): void
    dragPreview: { id: string; x: number; y: number; rotation: number } | null; setDragPreview(p): void
    savedAt: string | null; saveError: string | null; setSaveStatus(s: { savedAt?: string | null; saveError?: string | null }): void
    dialog: 'factory' | 'projects' | 'customType' | null; openDialog(d): void
    ```

- [ ] **Step 1: Write the failing tests**

`src/store/projectStore.test.ts`:
```ts
import { beforeEach, describe, expect, test } from 'vitest';
import { createProject } from '../domain/projectFile';
import { activeLayout, canUndo, openProject, redo, undo, useProjectStore } from './projectStore';

const s = () => useProjectStore.getState();
const layout = () => activeLayout(s().project);

beforeEach(() => openProject(createProject('T')));

describe('machines', () => {
  test('addMachine uses type defaults', () => {
    const id = s().addMachine('bandsaw', 3, 4)!;
    expect(layout().machines).toHaveLength(1);
    expect(layout().machines[0]).toMatchObject({ id, x: 3, y: 4, length: 1.2 });
  });
  test('unknown type returns null', () => expect(s().addMachine('nope', 0, 0)).toBeNull());
  test('updateMachine patches one machine', () => {
    const id = s().addMachine('bandsaw', 3, 4)!;
    s().updateMachine(id, { rotation: 90, length: 1.5 });
    expect(layout().machines[0]).toMatchObject({ rotation: 90, length: 1.5, x: 3 });
  });
  test('duplicateMachine offsets by 1 m', () => {
    const id = s().addMachine('bandsaw', 3, 4)!;
    const copy = s().duplicateMachine(id)!;
    expect(copy).not.toBe(id);
    expect(layout().machines.find((m) => m.id === copy)).toMatchObject({ x: 4, y: 4, name: 'Bandsaw' });
  });
  test('deleteMachines', () => {
    const a = s().addMachine('bandsaw', 3, 4)!;
    s().addMachine('bandsaw', 8, 4);
    s().deleteMachines([a]);
    expect(layout().machines).toHaveLength(1);
  });
});

describe('factory', () => {
  test('updateFactory and items', () => {
    s().updateFactory({ length: 55 });
    s().upsertFactoryItem('pillars', { id: 'p', x: 1, y: 1, sizeX: 0.4, sizeY: 0.4 });
    s().upsertFactoryItem('pillars', { id: 'p', x: 2, y: 1, sizeX: 0.4, sizeY: 0.4 });
    expect(layout().factory.length).toBe(55);
    expect(layout().factory.pillars).toEqual([{ id: 'p', x: 2, y: 1, sizeX: 0.4, sizeY: 0.4 }]);
    s().removeFactoryItem('pillars', 'p');
    expect(layout().factory.pillars).toEqual([]);
  });
});

describe('layouts', () => {
  test('add, duplicate, switch, cannot delete last', () => {
    s().addMachine('bandsaw', 3, 4);
    const first = s().project.activeLayoutId;
    s().duplicateLayout(first);
    expect(s().project.layouts).toHaveLength(2);
    expect(s().project.layouts[1].machines).toHaveLength(1);
    expect(s().project.layouts[1].machines[0].id).toBe(s().project.layouts[0].machines[0].id);
    s().addLayout('Empty');
    expect(layout().name).toBe('Empty');
    expect(layout().machines).toHaveLength(0);
    s().deleteLayout(layout().id);
    expect(s().project.layouts).toHaveLength(2);
    expect(s().project.activeLayoutId).toBe(first);
    s().deleteLayout(s().project.layouts[1].id);
    s().deleteLayout(first);
    expect(s().project.layouts).toHaveLength(1);
  });
});

describe('undo / redo', () => {
  test('openProject clears history; undo/redo machine add', () => {
    expect(canUndo()).toBe(false);
    s().addMachine('bandsaw', 3, 4);
    expect(canUndo()).toBe(true);
    undo();
    expect(layout().machines).toHaveLength(0);
    redo();
    expect(layout().machines).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/store`
Expected: FAIL, cannot resolve `./projectStore`.

- [ ] **Step 3: Implement project store**

`src/store/projectStore.ts`:
```ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import { createMachine, findType, newId } from '../domain/catalogue';
import { createLayout, createProject } from '../domain/projectFile';
import type { Factory, FactoryItemKind, Layout, Machine, MachineType, Project } from '../domain/types';

export const activeLayout = (p: Project): Layout =>
  p.layouts.find((l) => l.id === p.activeLayoutId) ?? p.layouts[0];

interface ProjectState {
  project: Project;
  setProject(p: Project): void;
  renameProject(name: string): void;
  addMachine(typeId: string, x: number, y: number): string | null;
  updateMachine(id: string, patch: Partial<Machine>): void;
  deleteMachines(ids: string[]): void;
  duplicateMachine(id: string): string | null;
  updateFactory(patch: Partial<Factory>): void;
  upsertFactoryItem<K extends FactoryItemKind>(kind: K, item: Factory[K][number]): void;
  removeFactoryItem(kind: FactoryItemKind, id: string): void;
  addLayout(name?: string): void;
  duplicateLayout(id: string): void;
  renameLayout(id: string, name: string): void;
  deleteLayout(id: string): void;
  setActiveLayout(id: string): void;
  addCustomType(type: MachineType): void;
  setTypeModel(typeId: string, modelKey: string | null): void;
}

const touch = (p: Project): Project => ({ ...p, updatedAt: new Date().toISOString() });

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set, get) => {
      const setProj = (fn: (p: Project) => Project) => set((s) => ({ project: touch(fn(s.project)) }));
      const setLayout = (fn: (l: Layout) => Layout) =>
        setProj((p) => ({ ...p, layouts: p.layouts.map((l) => (l.id === activeLayout(p).id ? fn(l) : l)) }));
      const setMachines = (fn: (ms: Machine[]) => Machine[]) => setLayout((l) => ({ ...l, machines: fn(l.machines) }));
      const setFactory = (fn: (f: Factory) => Factory) => setLayout((l) => ({ ...l, factory: fn(l.factory) }));

      return {
        project: createProject('My Factory'),

        setProject: (p) => set({ project: p }),
        renameProject: (name) => setProj((p) => ({ ...p, name })),

        addMachine(typeId, x, y) {
          const type = findType(get().project, typeId);
          if (!type) return null;
          const m = createMachine(type, x, y);
          setMachines((ms) => [...ms, m]);
          return m.id;
        },
        updateMachine: (id, patch) => setMachines((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m))),
        deleteMachines: (ids) => setMachines((ms) => ms.filter((m) => !ids.includes(m.id))),
        duplicateMachine(id) {
          const src = activeLayout(get().project).machines.find((m) => m.id === id);
          if (!src) return null;
          const copy: Machine = { ...structuredClone(src), id: newId(), x: src.x + 1 };
          setMachines((ms) => [...ms, copy]);
          return copy.id;
        },

        updateFactory: (patch) => setFactory((f) => ({ ...f, ...patch })),
        upsertFactoryItem: (kind, item) =>
          setFactory((f) => {
            const list = f[kind] as { id: string }[];
            const next = list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
            return { ...f, [kind]: next };
          }),
        removeFactoryItem: (kind, id) =>
          setFactory((f) => ({ ...f, [kind]: (f[kind] as { id: string }[]).filter((x) => x.id !== id) })),

        addLayout(name) {
          const p = get().project;
          const l = createLayout(name ?? `Layout ${p.layouts.length + 1}`, structuredClone(activeLayout(p).factory));
          setProj((pp) => ({ ...pp, layouts: [...pp.layouts, l], activeLayoutId: l.id }));
        },
        duplicateLayout(id) {
          const src = get().project.layouts.find((l) => l.id === id);
          if (!src) return;
          const l: Layout = { ...structuredClone(src), id: newId(), name: `${src.name} (copy)` };
          setProj((p) => ({ ...p, layouts: [...p.layouts, l], activeLayoutId: l.id }));
        },
        renameLayout: (id, name) => setProj((p) => ({ ...p, layouts: p.layouts.map((l) => (l.id === id ? { ...l, name } : l)) })),
        deleteLayout(id) {
          const p = get().project;
          if (p.layouts.length <= 1) return;
          const layouts = p.layouts.filter((l) => l.id !== id);
          setProj((pp) => ({ ...pp, layouts, activeLayoutId: pp.activeLayoutId === id ? layouts[0].id : pp.activeLayoutId }));
        },
        setActiveLayout: (id) => setProj((p) => ({ ...p, activeLayoutId: id })),

        addCustomType: (type) => setProj((p) => ({ ...p, customTypes: [...p.customTypes, type] })),
        setTypeModel: (typeId, modelKey) =>
          setProj((p) => {
            const typeModels = { ...p.typeModels };
            if (modelKey) typeModels[typeId] = modelKey;
            else delete typeModels[typeId];
            return { ...p, typeModels };
          }),
      };
    },
    { limit: 200, partialize: (s) => ({ project: s.project }) },
  ),
);

export function openProject(p: Project): void {
  useProjectStore.getState().setProject(p);
  useProjectStore.temporal.getState().clear();
}

export const undo = () => useProjectStore.temporal.getState().undo();
export const redo = () => useProjectStore.temporal.getState().redo();
export const canUndo = () => useProjectStore.temporal.getState().pastStates.length > 0;
export const canRedo = () => useProjectStore.temporal.getState().futureStates.length > 0;
```

- [ ] **Step 4: Implement UI store**

`src/store/uiStore.ts`:
```ts
import { create } from 'zustand';

export type CameraPreset = 'iso' | 'top' | 'front' | 'side';
type ToggleKey = 'showWalls' | 'showLabels' | 'showGrid' | 'showModelsIn2d';
export type DialogName = 'factory' | 'projects' | 'customType';

interface UiState {
  selectedId: string | null;
  select(id: string | null): void;
  viewMode: '3d' | '2d';
  setViewMode(m: '3d' | '2d'): void;
  cameraPreset: CameraPreset;
  cameraNonce: number;
  setCameraPreset(p: CameraPreset): void;
  showWalls: boolean;
  showLabels: boolean;
  showGrid: boolean;
  showModelsIn2d: boolean;
  toggle(key: ToggleKey): void;
  snap: number;
  setSnap(v: number): void;
  dragPreview: { id: string; x: number; y: number; rotation: number } | null;
  setDragPreview(p: UiState['dragPreview']): void;
  savedAt: string | null;
  saveError: string | null;
  setSaveStatus(s: { savedAt?: string | null; saveError?: string | null }): void;
  dialog: DialogName | null;
  openDialog(d: DialogName | null): void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedId: null,
  select: (selectedId) => set({ selectedId }),
  viewMode: '3d',
  setViewMode: (viewMode) =>
    set((s) => ({ viewMode, cameraPreset: viewMode === '2d' ? 'top' : 'iso', cameraNonce: s.cameraNonce + 1 })),
  cameraPreset: 'iso',
  cameraNonce: 0,
  setCameraPreset: (cameraPreset) => set((s) => ({ cameraPreset, cameraNonce: s.cameraNonce + 1 })),
  showWalls: true,
  showLabels: true,
  showGrid: true,
  showModelsIn2d: false,
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<UiState>),
  snap: 0.1,
  setSnap: (snap) => set({ snap }),
  dragPreview: null,
  setDragPreview: (dragPreview) => set({ dragPreview }),
  savedAt: null,
  saveError: null,
  setSaveStatus: (s) => set(s),
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
}));
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test`
Expected: all passed.

- [ ] **Step 6: Commit**

```bash
git add src/store
git commit -m "feat(store): add project store with undo/redo and UI store"
```

---

### Task 7: Persistence (IndexedDB + autosave)

**Files:**
- Create: `src/store/persistence.ts`
- Test: `src/store/persistence.test.ts`

**Interfaces:**
- Consumes: `useProjectStore`, `useUiStore`, `Project`, `ModelFormat`.
- Produces:
  ```ts
  interface ProjectIndexEntry { id: string; name: string; updatedAt: string }
  interface StoredModel { name: string; format: ModelFormat; data: ArrayBuffer; fitMode?: 'stretch' | 'contain' }
  listProjects(): Promise<ProjectIndexEntry[]>          // newest first
  loadProject(id: string): Promise<Project | undefined>
  saveProject(p: Project): Promise<void>                 // also sets last-opened id
  deleteProject(id: string): Promise<void>
  lastProjectId(): Promise<string | undefined>
  saveModel(key: string, m: StoredModel): Promise<void>
  loadModel(key: string): Promise<StoredModel | undefined>
  startAutosave(delayMs?: number): () => void            // returns unsubscribe; default 1000 ms
  saveNow(): Promise<void>                               // saves current project, updates ui save status
  ```
  IndexedDB keys: `project:<id>`, `projects-index`, `last-project-id`, `model:<key>`.

- [ ] **Step 1: Write the failing tests**

`src/store/persistence.test.ts`:
```ts
import 'fake-indexeddb/auto';
import { describe, expect, test, vi } from 'vitest';
import { createProject } from '../domain/projectFile';
import { deleteProject, lastProjectId, listProjects, loadModel, loadProject, saveModel, saveProject, startAutosave } from './persistence';
import { openProject, useProjectStore } from './projectStore';
import { useUiStore } from './uiStore';

describe('persistence', () => {
  test('save, list, load, delete', async () => {
    const a = createProject('A');
    const b = { ...createProject('B'), updatedAt: '2099-01-01T00:00:00.000Z' };
    await saveProject(a);
    await saveProject(b);
    expect((await listProjects()).map((e) => e.name)).toEqual(['B', 'A']);
    expect(await loadProject(a.id)).toEqual(a);
    expect(await lastProjectId()).toBe(b.id);
    await saveProject({ ...a, name: 'A2' });
    expect((await listProjects()).filter((e) => e.id === a.id)).toHaveLength(1);
    await deleteProject(a.id);
    expect(await loadProject(a.id)).toBeUndefined();
    expect((await listProjects()).map((e) => e.name)).toEqual(['B']);
  });

  test('models stored as array buffers', async () => {
    await saveModel('k1', { name: 'saw.glb', format: 'glb', data: new TextEncoder().encode('abc').buffer });
    const m = await loadModel('k1');
    expect(m?.name).toBe('saw.glb');
    expect(new TextDecoder().decode(m!.data)).toBe('abc');
  });

  test('autosave debounces and records savedAt', async () => {
    openProject(createProject('Auto'));
    const stop = startAutosave(50);
    useProjectStore.getState().addMachine('bandsaw', 1, 1);
    useProjectStore.getState().addMachine('bandsaw', 5, 1);
    await vi.waitFor(() => expect(useUiStore.getState().savedAt).not.toBeNull(), { timeout: 2000 });
    const saved = await loadProject(useProjectStore.getState().project.id);
    expect(saved?.layouts[0].machines).toHaveLength(2);
    stop();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run src/store/persistence.test.ts`
Expected: FAIL, cannot resolve `./persistence`.

- [ ] **Step 3: Implement**

`src/store/persistence.ts`:
```ts
import { del, get, set } from 'idb-keyval';
import type { ModelFormat, Project } from '../domain/types';
import { useProjectStore } from './projectStore';
import { useUiStore } from './uiStore';

export interface ProjectIndexEntry { id: string; name: string; updatedAt: string }
export interface StoredModel { name: string; format: ModelFormat; data: ArrayBuffer; fitMode?: 'stretch' | 'contain' }

const INDEX = 'projects-index';
const LAST = 'last-project-id';

async function readIndex(): Promise<ProjectIndexEntry[]> {
  return (await get<ProjectIndexEntry[]>(INDEX)) ?? [];
}

export async function listProjects(): Promise<ProjectIndexEntry[]> {
  return (await readIndex()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const loadProject = (id: string) => get<Project>(`project:${id}`);
export const lastProjectId = () => get<string>(LAST);

export async function saveProject(p: Project): Promise<void> {
  await set(`project:${p.id}`, p);
  const index = (await readIndex()).filter((e) => e.id !== p.id);
  await set(INDEX, [...index, { id: p.id, name: p.name, updatedAt: p.updatedAt }]);
  await set(LAST, p.id);
}

export async function deleteProject(id: string): Promise<void> {
  await del(`project:${id}`);
  await set(INDEX, (await readIndex()).filter((e) => e.id !== id));
  if ((await lastProjectId()) === id) await del(LAST);
}

export const saveModel = (key: string, m: StoredModel) => set(`model:${key}`, m);
export const loadModel = (key: string) => get<StoredModel>(`model:${key}`);

export async function saveNow(): Promise<void> {
  try {
    await saveProject(useProjectStore.getState().project);
    useUiStore.getState().setSaveStatus({ savedAt: new Date().toISOString(), saveError: null });
  } catch (e) {
    useUiStore.getState().setSaveStatus({ saveError: `Could not save in this browser (${(e as Error).message}). Export JSON to keep your work.` });
  }
}

export function startAutosave(delayMs = 1000): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useProjectStore.subscribe((s, prev) => {
    if (s.project === prev.project) return;
    clearTimeout(timer);
    timer = setTimeout(saveNow, delayMs);
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat(store): add IndexedDB persistence and debounced autosave"
```

---

### Task 8: App shell and panels

**Files:**
- Create: `src/ui/TopToolbar.tsx`, `src/ui/LeftLibrary.tsx`, `src/ui/RightInspector.tsx` (placeholder body: "Select a machine"), `src/ui/BottomStatus.tsx`, `src/ui/NumberField.tsx`, `src/ui/Dialog.tsx`, `src/ui/shortcuts.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: both stores, persistence, catalogue.
- Produces: `NumberField` props `{ label: string; value: number; onCommit(v: number): void; min?: number; step?: number; unit?: string }` — commits on Enter/blur, rejects non-numbers and values below `min` (red border, value not committed). `Dialog` props `{ title: string; onClose(): void; children; footer?: ReactNode }`. `useShortcuts()` hook.

Details:
- `App.tsx` grid: top bar 48 px, left 280 px, right 320 px, bottom 120 px, centre canvas (placeholder div until Task 9). Dark slate theme.
- Bootstrap in `App` `useEffect`: `lastProjectId()` → `loadProject` → `openProject`; if none, keep the default project and `saveNow()`. Then `startAutosave()`; return its unsubscribe.
- `TopToolbar`: buttons Factory, Projects, Undo, Redo, Save, Export JSON, Import JSON, PNG, 2D/3D switch, camera presets (Iso/Top/Front/Side), toggles (Walls, Labels, Grid), snap select (0.01/0.05/0.1/0.25/0.5/1 m), layout dropdown (switch layout) + project name. Undo/redo disabled state via `useStore(useProjectStore.temporal, s => s.pastStates.length)`. Save shows `Saved hh:mm` from `savedAt`; `saveError` shows a red banner under the toolbar. Export/Import/PNG/Projects buttons wired in Task 14; Factory in Task 12.
- `LeftLibrary`: search input (filters by name, case-insensitive), categories collapsible using `CATEGORY_LABELS`, each item shows name, `L × W × H m`, and count placed in active layout. Items are `draggable` with `e.dataTransfer.setData('application/x-machine-type', type.id)`. Double-click adds at factory centre. "+ Custom machine" button opens `customType` dialog.
- `BottomStatus` (stats in this task; warnings list in Task 13): factory `L × W m`, total area, machine count, footprint area, utilisation % = Σ machine footprint ÷ (floor area − pillars − restricted zones), each to 2 decimals.
- `shortcuts.ts`: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo, Delete removes selected, Ctrl+D duplicates selected and selects copy, R rotates selected +90, Escape deselects. Ignore when focus is in an input/textarea/select.

- [ ] **Step 1: Implement files above.**
- [ ] **Step 2: Run `npm run typecheck` and `npm test`** — both clean.
- [ ] **Step 3: Browser check** (`npm run dev`, open http://localhost:5173): four panels visible; library search filters; categories collapse; status shows `40.00 × 20.00 m`, area `800.00 m²`; reload keeps project (autosave). Undo/Redo buttons disabled initially.
- [ ] **Step 4: Commit** `feat(ui): add app shell, toolbar, machine library and status bar`

---

### Task 9: 3D factory scene, cameras, 2D/3D

**Files:**
- Create: `src/scene/coords.ts`, `src/scene/FactoryCanvas.tsx`, `src/scene/FactoryShell.tsx`, `public/textures/concrete/*`
- Modify: `src/App.tsx` (centre = `<FactoryCanvas />`)

**Interfaces:**
- Produces:
  ```ts
  // coords.ts
  export const toThree = (x: number, y: number, h = 0): [number, number, number] => [x, h, -y];
  export const rotY = (deg: number) => (deg * Math.PI) / 180;
  ```
- `FactoryCanvas` renders `<Canvas shadows gl={{ preserveDrawingBuffer: true }}>` (needed for PNG export), `FactoryShell`, machines (Task 11), `DragController` (Task 11).

Details:
- Textures: download ambientCG `Concrete034` 1K JPG (CC0) once; put Color, NormalGL, Roughness as `color.jpg`, `normal.jpg`, `roughness.jpg`. Floor: plane sized `length × width`, `RepeatWrapping`, repeat = size / 4 (one tile per 4 m). Add a `CREDITS.md` line.
- Grid: drei `<Grid>` cellSize 1, sectionSize 5, sized to factory, positioned at floor centre, y = 0.002; hidden when `showGrid` false.
- Outer walls: for each side build wall segments around openings (sort openings on that wall by offset; a door creates a gap from floor to `height` with a lintel box above up to `ceilingHeight`; a window creates sill box below, lintel above). Wall boxes sit outside the inside footprint (south wall spans y from −t to 0). Material light grey, `transparent` opacity 0.9. Hidden when `showWalls` false or in 2D mode (in 2D draw outlines with drei `<Line>` at y = 0.01 instead).
- Internal walls: box from `wallRect`, height `w.height`.
- Pillars: concrete boxes `sizeX × ceilingHeight × sizeY` at `pillarRect` centre.
- Restricted zones: red plane at y = 0.005, opacity 0.35, with outline; label via drei `<Html>` (name).
- Door keep-clear: yellow plane at y = 0.004 from `doorKeepClearRect`, opacity 0.25, dashed outline.
- Lighting: `hemisphereLight` (sky #dfe8f0, ground #444, 0.6), `directionalLight` castShadow 1.2 from above south-east sized to cover the building (shadow camera bounds = max(L, W)/2 + 5), plus a grid of `pointLight` (intensity 0.4, distance 12) every 10 m at `ceilingHeight − 0.3`, max 24 lights; lamp fixtures as small emissive boxes.
- Cameras: drei `<PerspectiveCamera makeDefault>` in 3D, `<OrthographicCamera makeDefault>` in 2D (`up = [0,0,-1]` so north is up). `OrbitControls makeDefault` with `enableRotate={viewMode==='3d'}` and `screenSpacePanning`. Effect on `[cameraNonce, factory size]` positions the camera to frame the building: target = centre; iso = centre + (0.6·D, 0.7·D, 0.9·D) where D = max(L, W); top = centre + (0, 1.5·D, 0) (perspective) or ortho zoom = viewport / (1.1·max(L,W)); front = from south (0, 0.3·D, 1.2·D); side = from east (1.2·D, 0.3·D, 0).
- Background `#1e293b`; `fog` off.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: `npm run typecheck`, `npm test`** — clean.
- [ ] **Step 3: Browser check:** concrete floor with grid; walls with loading-door opening on south and staff door on west; rotate/zoom/pan work; Top/Front/Side/Iso buttons reframe; 2D shows flat plan with north up and +x to the right, rotation disabled; hide walls works.
- [ ] **Step 4: Commit** `feat(scene): render factory shell, lighting, cameras and 2D/3D views`

---

### Task 10: Procedural machine models

**Files:**
- Create: `src/scene/models/parts.tsx`, `src/scene/models/{saws,joinery,shaping,drilling,sanding,stations,rooms,storage,utilities}.tsx`, `src/scene/models/index.ts`
- Test: `src/scene/models/registry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // every model component
  export interface ModelProps { l: number; w: number; h: number; color?: string }   // l along local x, w along local z (three), h up; origin = footprint centre on floor
  // index.ts
  export const MODELS: Record<string, React.FC<ModelProps>>;
  export const MODEL_LABELS: Record<string, string>;   // for the custom-type picker
  export function getModel(key: string): React.FC<ModelProps>;   // falls back to MODELS['generic']
  ```
- `parts.tsx` exports materials (`steel`, `paintedGreen`, `paintedGrey`, `blade`, `wood`, `rubber`, `glass`, `yellowGuard`) as shared `MeshStandardMaterial` instances and part components that take positions in model-local metres: `Box({ p, s, m })`, `Cyl({ p, r, h, m, axis })`, `Legs({ l, w, h, inset, m })`, `Table({ l, w, y, t, m })`, `Cabinet({ ... })`, `Wheel`, `Belt`, `Hood`, `Duct`, `ShelfRack({ l, w, h, levels })`, `Enclosure({ l, w, h, doorSide })`. All parts `castShadow receiveShadow`.

Models — every part positioned and sized as a fraction of `l, w, h` so the result always fills exactly `l × w × h`:
- `bandsaw`: tall C-frame column at back, two wheel covers (upper/lower), table at 0.45·h, thin vertical blade strip, base cabinet.
- `table-saw`: cabinet base, cast-iron top, round blade protruding, rip fence, sliding carriage along one side, outfeed extension.
- `crosscut-saw` / `rip-saw`: long roller-conveyor bed (rollers as cylinders) with central saw housing/hood; rip saw has feed chain hood over bed.
- `mortiser`: column, head with chisel, clamp table, base.
- `tenoner`: long bed with sliding table, two motor/cutter heads with hoods.
- `spindle-moulder`: cabinet, table, spindle guard hood, fence.
- `router`: C-arm overhead with motor head, table, base.
- `cnc-router`: gantry over bed, bed with spoilboard grid, control panel pedestal, cable chain.
- `shaper`: like spindle moulder with copy-template table.
- `drill-press`: round base, column, head, chuck, small table.
- `multi-boring`: frame bed, row of drill heads beam, pneumatic clamps.
- `belt-sander`: long table, two end pulleys, long belt, overhead pressure beam.
- `wide-belt-sander`: tall boxed cabinet with infeed conveyor belt slot and control panel.
- `disc-sander`: pedestal, large disc, small table.
- `profile-sander`: bed with multiple brush/head units.
- `inspection-table` / `assembly-station` / `glue-station` / `packing-station`: worktables with legs; assembly adds clamp rails; glue adds glue tank + spreader rollers; packing adds roll stand + boxes; inspection adds light bar.
- `spray-booth`: open-front enclosure, back filter wall (dark grid), exhaust duct on roof, light panels.
- `drying-room`: closed room with door and racks visible through translucent glass panel.
- `raw-timber-rack` / `wip-rack` / `finished-goods-rack`: cantilever/shelf rack with timber stacks (wood material) or cartons.
- `dust-collector`: tall cyclone/filter silo, hopper, ducts, fan box.
- `air-compressor`: horizontal tank on skid with motor box.
- `generic`: base cabinet + top, used for unknown keys.
- Front of every model faces local −z in three (= floor +y local front), so the operator side matches `operatorArea.side = 'front'`.

- [ ] **Step 1: Write registry test**

`src/scene/models/registry.test.ts`:
```ts
import { expect, test } from 'vitest';
import { CATALOGUE } from '../../domain/catalogue';
import { MODELS, getModel } from './index';

test('every catalogue model key has a registered model', () => {
  for (const t of CATALOGUE) expect(MODELS[t.model], t.model).toBeTypeOf('function');
});

test('unknown key falls back to generic', () => {
  expect(getModel('does-not-exist')).toBe(MODELS.generic);
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/scene/models` fails (no index).
- [ ] **Step 3: Implement parts and models.**
- [ ] **Step 4: Run tests** — pass.
- [ ] **Step 5: Browser check:** temporary dev-only gallery (`?gallery` query param renders all 27 models in a row with labels; keep it — useful for future models). Each model recognisable and distinct; each model's bounding box matches its catalogue L × W × H (check with drei `<Box3Helper>` toggle in gallery).
- [ ] **Step 6: Commit** `feat(scene): add procedural models for all machine types`

---

### Task 11: Machine instances, selection, drag, rotate, drop from library

**Files:**
- Create: `src/scene/MachineInstance.tsx`, `src/scene/MachineOverlays.tsx`, `src/scene/DragController.tsx`
- Modify: `src/scene/FactoryCanvas.tsx`

**Interfaces:**
- Consumes: `activeLayout`, `updateMachine`, `addMachine`, `useUiStore` (`selectedId`, `dragPreview`, `snap`, view toggles), `validateLayout`, `getModel`, geometry rects.
- Produces: `MachineInstance` props `{ machine: Machine; error: boolean; warning: boolean; selected: boolean }`.

Details:
- `FactoryCanvas` computes `warnings = useMemo(() => validateLayout(layout), [layout])`, passes per-machine flags. Machine with `dragPreview.id === m.id` renders at preview x/y/rotation.
- `MachineInstance`: `<group position={toThree(x,y)} rotation-y={rotY(rotation)}>`; model = imported (Task 15) else `getModel(type.model)` with `{ l: length, w: width, h: height }`. 2D mode and `!showModelsIn2d`: flat footprint box (h 0.02) in category colour + outline. Error → red emissive tint overlay (transparent red box slightly larger than footprint, opacity 0.25); warning → amber outline. Click selects (`stopPropagation`); clicking empty floor deselects.
- `MachineOverlays` (selected only): drei `<Line>` dimension lines along length (front edge) and width (right edge) with `<Html>` labels `"2.00 m"`, a vertical height line with label; clearance outline (blue `#3b82f6`) from `clearanceRect`, operator area (green `#22c55e`, filled 0.2) from `operatorRect`; small arrows/spheres at input (blue) and output (orange) points. Labels (`showLabels`): drei `<Html center distanceFactor={12}>` name above the machine.
- `DragController`:
  - Floor plane `THREE.Plane(new Vector3(0,1,0), 0)`; raycast from pointer with `useThree` camera and `raycaster`.
  - Pointer down on a selected machine starts move: store grab offset (machine centre − hit point). `OrbitControls.enabled = false` while dragging (`useThree(s => s.controls)`).
  - Pointer move: hit → floor coords `(hit.x, -hit.z)`; new centre = hit + offset; snap each axis `Math.round(v / snap) * snap` unless Alt held; `setDragPreview({ id, x, y, rotation })`.
  - Pointer up: if preview differs from machine, `updateMachine(id, { x, y })` once (single undo entry), clear preview, re-enable controls.
  - Rotate handle: torus ring around selected machine (radius = half diagonal + 0.3) at y 0.05; dragging the ring sets rotation = angle of pointer around centre, snapped to 15° (1° with Shift); same preview/commit pattern.
  - Drop from library: canvas wrapper `onDragOver` (preventDefault) / `onDrop` reads `application/x-machine-type`, raycasts the drop point (convert client coords to NDC from the canvas rect), snaps, `addMachine(typeId, x, y)`, selects new id.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: `npm run typecheck`, `npm test`** — clean.
- [ ] **Step 3: Browser check:** drag Bandsaw from library onto floor → appears at drop point; click selects, shows dims `1.20 m`, `0.90 m`, `2.10 m`, clearance + operator outlines; drag moves on 0.1 m grid; ring rotates in 15° steps; Undo after a drag returns to the start position in one step; place two machines overlapping → both red; drag one into loading door area → amber; works in 2D mode too.
- [ ] **Step 4: Commit** `feat(scene): add machine rendering, selection, drag-move, rotate and library drop`

---

### Task 12: Inspector and factory configuration dialog

**Files:**
- Modify: `src/ui/RightInspector.tsx`
- Create: `src/ui/FactoryConfigDialog.tsx`
- Modify: `src/ui/TopToolbar.tsx` (Factory button → `openDialog('factory')`), `src/App.tsx` (render dialogs by `dialog`)

Details:
- Inspector (selected machine): Name (text), Type select (all types; changing keeps position and dimensions; button "Reset to type defaults" applies type defaults for L/W/H/clearance/operator area), L / W / H (`NumberField` min 0.05), X / Y, Rotation (degrees, normalised to 0–359.9), Clearance front/back/left/right (min 0), Operator area side select + depth + width (min 0), Input point x/y, Output point x/y, Colour (`<input type="color">`), Model (Task 15 adds import), footprint area read-out, warnings for this machine, buttons Duplicate / Delete. Each field commits via `updateMachine`.
- No selection: show active layout name, number of machines and hint text.
- Factory dialog: Building section (length, width, ceiling height, wall thickness via `updateFactory`), then tabbed lists Doors / Windows / Pillars / Internal walls / Restricted zones. Each row = inline `NumberField`s for every numeric field plus text name and select for wall side/kind; Add button creates item with sensible defaults (door: south, offset 2, width 1, height 2.1, personnel, keepClear 1.5; window: north, offset 2, width 2, height 1.2, sill 1.2, keepClear 0; pillar: centre, 0.4 × 0.4; wall: from (L/2,0) to (L/2,W/2), 0.2 thick, 3 high; zone: (1,1) 2 × 2); Delete per row. All via `upsertFactoryItem` / `removeFactoryItem`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: typecheck + tests** clean.
- [ ] **Step 3: Browser check:** change bandsaw length to 2 → model and dimension line show 2.00 m; type `-1` in width → red border, not committed; change factory length to 30 → walls move, machines beyond 30 m turn red; add pillar → appears, overlapping machine turns red; every change undoable.
- [ ] **Step 4: Commit** `feat(ui): add machine inspector and factory configuration dialog`

---

### Task 13: Warnings panel

**Files:**
- Modify: `src/ui/BottomStatus.tsx`

Details:
- Right side of bottom panel: counts `N errors, M warnings`; scrollable list of `validateLayout` results (error red, warning amber, message text). Click → `select(machineIds[0])` and `setCameraPreset` is NOT changed; instead the canvas focuses the machine: add `focusNonce`/`focusTarget` to `useUiStore` (`focus(id: string)`), and in `FactoryCanvas` move `OrbitControls.target` to the machine centre keeping the camera offset.
- Hovering a stat "Machines" shows per-category counts (title attribute is enough).

- [ ] **Step 1: Implement** (add `focusId: string | null; focusNonce: number; focus(id: string): void` to `uiStore`).
- [ ] **Step 2: typecheck + tests** clean.
- [ ] **Step 3: Browser check:** overlap two machines → list shows one error; click it → machine selected and centred.
- [ ] **Step 4: Commit** `feat(ui): add layout warnings list with click-to-focus`

---

### Task 14: Project manager, layouts, JSON export/import, PNG export

**Files:**
- Create: `src/ui/ProjectManagerDialog.tsx`, `src/ui/fileIO.ts`
- Modify: `src/ui/TopToolbar.tsx`

**Interfaces:**
- `fileIO.ts`:
  ```ts
  export function downloadText(filename: string, text: string): void      // Blob + <a download>
  export function downloadDataUrl(filename: string, url: string): void
  export function pickFile(accept: string): Promise<File | null>          // hidden <input type=file>
  export function bufferToBase64(buf: ArrayBuffer): string               // chunked String.fromCharCode + btoa
  export function base64ToBuffer(s: string): ArrayBuffer                 // atob + Uint8Array
  export const safeFilename = (s: string): string                          // replace [^\w\- ] with _
  ```

Details:
- Project manager dialog: list from `listProjects()` (name, last updated); actions per row: Open (`saveNow()` current, then `loadProject` + `openProject`, `select(null)`), Rename (inline text; if it is the current project use `renameProject`, else load–rename–save), Duplicate (`asNewProject(p, name + ' (copy)')` → `saveProject`), Delete (confirm dialog text "Delete project “X”? This cannot be undone."; cannot delete the open project — button disabled with tooltip). "New project" button → name field in the dialog → `createProject` → `openProject` → `saveNow`.
- Layout section in same dialog (current project): list layouts with Switch, Rename, Duplicate, Delete (disabled when only one).
- Export JSON: checkbox "Include imported 3D models" (default on). Collect model keys used (`modelOverride`s across all layouts + `typeModels` values), `loadModel` each, `bufferToBase64(data)` → `models`. `downloadText(safeFilename(name) + '.prodfloor.json', serializeProject(project, models))`.
- Import JSON: `pickFile('.json')` → `parseProjectFile`; on error show dialog listing first 5 errors; on success save embedded models via `saveModel(key, { name, format, data: base64ToBuffer(dataBase64) })`, then `asNewProject(file.project)` (name unchanged) → `saveProject` → `openProject`. Never overwrites an existing project.
- PNG: `gl.domElement.toDataURL('image/png')` — expose the canvas element by storing it in `uiStore` (`canvasEl: HTMLCanvasElement | null`, set in `FactoryCanvas` `onCreated`). Filename `<project>-<layout>.png`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Add test** `src/ui/fileIO.test.ts`:
  ```ts
  import { expect, test } from 'vitest';
  import { base64ToBuffer, bufferToBase64, safeFilename } from './fileIO';

  test('base64 round trip', () => {
    const b64 = bufferToBase64(new TextEncoder().encode('hello').buffer);
    expect(b64).toBe('aGVsbG8=');
    expect(new TextDecoder().decode(base64ToBuffer(b64))).toBe('hello');
  });

  test('safeFilename', () => expect(safeFilename('Plant A/B: v2')).toBe('Plant A_B_ v2'));
  ```
  `bufferToBase64` builds the binary string in 32 KB chunks so large models do not overflow the call stack.
- [ ] **Step 3: `npm test`, typecheck** clean.
- [ ] **Step 4: Browser check:** create second project, switch back and forth, rename, duplicate, delete (with confirm); add/duplicate/switch layouts; export JSON → re-import → appears as new project identical in content; import a broken file → error list shown, nothing changes; PNG downloads current view.
- [ ] **Step 5: Commit** `feat(ui): add project manager, layouts, JSON export/import and PNG export`

---

### Task 15: Imported 3D models

**Files:**
- Create: `src/scene/ImportedModel.tsx`
- Modify: `src/scene/MachineInstance.tsx`, `src/ui/RightInspector.tsx`

Details:
- Inspector "Model" section: radio "Built-in model" / "Imported file"; "Import file…" button (`pickFile('.glb,.gltf,.obj,.stl,.fbx')`), checkbox "Use for all <type name> machines" (sets `typeModels[typeId]` via `setTypeModel` instead of `modelOverride`), checkbox "Keep proportions" (sets the stored model's `fitMode`: checked = `contain` (default), unchecked = `stretch`).
- Format from file extension. Save as `saveModel(newId(), { name: file.name, format, data: await file.arrayBuffer(), fitMode })`. Note: `.gltf` files that reference external `.bin`/textures cannot load from a single file — show message "Use .glb (single file) for glTF models" when a .gltf fails.
- Resolution order in `MachineInstance`: `machine.modelOverride` → `project.typeModels[machine.typeId]` → procedural.
- `ImportedModel` props `{ modelKey: string; l: number; w: number; h: number; fallback: ReactNode }`:
  - Load with `loadModel`, parse `data` directly with the matching three loader from `three/examples/jsm/loaders/`: `GLTFLoader.parseAsync(data, '')`, `OBJLoader.parse(new TextDecoder().decode(data))`, `STLLoader.parse(data)` → `Mesh` with `steel` material, `FBXLoader.parse(data, '')`. Cache parsed objects per key in a module `Map<string, Promise<THREE.Object3D>>`; clone per instance (`object.clone(true)`).
  - Fit: compute `Box3` of the object; `size`; scale `stretch` = (l/size.x, h/size.y, w/size.z), `contain` = uniform min of the three; then translate so bbox is centred on x/z and sits on y = 0. Enable shadows on all meshes.
  - While loading render `fallback`; on error render `fallback` and push a toast (add `toast: string | null; showToast(msg)` to uiStore, toast auto-hides after 5 s in App).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: typecheck + tests** clean.
- [ ] **Step 3: Browser check:** download one CC-BY table saw GLB from Sketchfab (or export any test GLB from three.js examples) into a local test folder (do not commit), import on a table saw → replaces procedural model and fits 2.0 × 1.6 × 1.0; change L → model refits; "use for all" applies to a second table saw; reload page → still there; corrupt file → fallback + toast.
- [ ] **Step 4: Commit** `feat(scene): support imported GLB/GLTF/OBJ/STL/FBX machine models`

---

### Task 16: Custom machine types

**Files:**
- Create: `src/ui/CustomTypeDialog.tsx`
- Modify: `src/ui/LeftLibrary.tsx`

Details:
- Dialog fields: name (required), category (select, default `custom`), length/width/height (min 0.05), clearance (single value applied to all four sides, min 0), operator area depth (min 0), model (select from `MODEL_LABELS`, default `generic`). Save → `addCustomType({ id: 'custom-' + newId(), name, category, model, defaults })`, close.
- "Save selected machine as type" button in inspector also opens dialog pre-filled from the selected machine.
- Library lists custom types under their chosen category with a small "custom" badge.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: typecheck + tests** clean.
- [ ] **Step 3: Browser check:** create "Chair back clamp jig" 1.8 × 1.0 × 1.2 → appears in library, draggable, persists after reload and in JSON export/import.
- [ ] **Step 4: Commit** `feat(ui): add custom machine types`

---

### Task 17: Deployment config, README, final verification

**Files:**
- Create: `vercel.json`, `README.md`, `CREDITS.md` (if not created in Task 9)

`vercel.json`:
```json
{ "buildCommand": "npm run build", "outputDirectory": "dist", "framework": "vite" }
```

README sections: what it is; run locally (`npm install`, `npm run dev`); build (`npm run build`); deploy (Vercel: import repo, defaults; Netlify: build `npm run build`, publish `dist`); data note: "Projects are stored in your browser. Use Export JSON to back up or share."; coordinates and units; adding a machine type (catalogue entry + model in `src/scene/models` + register in `index.ts`); importing models.

- [ ] **Step 1: Write files.**
- [ ] **Step 2: Full verification:** `npm test` (all pass), `npm run build` (exit 0, no type errors), `npm run preview` and walk through the spec's §8 manual checklist end to end: place, drag, rotate, resize, duplicate, delete, undo/redo, 2D/3D, camera presets, hide walls, save/reload, export/import, model import, custom type, factory edits and warnings.
- [ ] **Step 3: Commit** `docs: add README, credits and Vercel config`

---

## Spec coverage check

| Spec section | Task |
|---|---|
| §3 data model, schemaVersion | 2, 5 |
| §4 catalogue | 2, 10 |
| §6.1 factory configuration | 12 (dialog), 9 (render) |
| §6.2 scene, labels, dimension lines, hide walls | 9, 11 |
| §6.3 cameras, 2D | 9 |
| §6.4 machine editing, shortcuts, custom types | 8, 11, 12, 16 |
| §6.5 collision/warnings | 4, 11, 13 |
| §6.6 bottom status | 8, 13 |
| §6.7 undo/redo | 6, 8, 11 |
| §6.8 projects, layouts, autosave, JSON, PNG | 5, 7, 14 |
| §6.9 model import | 15 |
| §7 error handling | 5, 7, 8 (NumberField), 14, 15; WebGL missing → `FactoryCanvas` `fallback` prop on `<Canvas>` shows message (Task 9) |
| §8 testing | every task; final run Task 17 |
| Hosting | 17 |
