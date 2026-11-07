# ProdFloor — Factory Layout Planner

3D web app for recreating an existing dining-chair factory at real scale and experimenting with machine arrangements.

Phase 1 (this version): factory configuration (size, ceiling, walls, doors, windows, pillars, internal walls, restricted zones), library of 27 procedural woodworking machine models, drag / move / rotate / resize / duplicate / delete, 2D plan and 3D views with camera presets, collision and clearance warnings, space stats, undo/redo, multiple projects and layouts, JSON export/import, PNG export, imported 3D models (GLB/GLTF/OBJ/STL/FBX) and custom machine types.

Design and plan: `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Production flow and analysis (Phase 2)

- **Workflow tab** (left panel): ordered process steps per layout. Load the built-in "White part" or "Full chair" template (machines of matching type are assigned automatically), add, rename, reorder (↑ ↓) and delete steps, and assign the selected machine with "+ selected". Several machines in one step run in parallel. Save your own step list as a project template.
- Flow arrows are derived from the workflow, labelled with step number and Manhattan distance. Toggle them with **Flows**.
- **Distances**: between consecutive steps, from output point to input point, Manhattan with straight-line in brackets; parallel machines use the mean. **Total movement** appears in the Workflow tab and the status bar.
- **Space utilisation** bar: usable floor split into machine footprint, operator areas, clearance, door keep-clear and free space (hover for m², %, and footprint per category).
- **Checks**: operator area blocked (error), operator areas overlapping, clearance or operator area crossing a wall, operator area in a door access zone, workflow step without a machine. Listed in the status bar and per machine in the inspector; blocked operator areas show red in the scene.
- Projects from earlier versions open unchanged; flow links become one workflow step per machine.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. `http://localhost:5173/?gallery` shows every built-in model at its catalogue size with its L×W×H box.

```bash
npm test        # unit tests (domain logic, stores, persistence)
npm run build   # type-check and production build into dist/
```

## Deploy for the team

- **Vercel:** import the repository; `vercel.json` sets the build. No settings needed.
- **Netlify:** build command `npm run build`, publish directory `dist`.

## Where data lives

Projects are saved automatically in **each user's own browser** (IndexedDB). Colleagues do not see each other's projects. Use **Export JSON** to back up or share a project and **Import JSON** to open one (it is always added as a new project). Imported 3D model files can be embedded in the export.

## Units and coordinates

- Metres everywhere; rotation in degrees, counter-clockwise seen from above.
- Origin = south-west inside corner of the building. X runs east along the factory length, Y runs north along the width.
- Machine X/Y is the centre of its footprint. A machine's front (operator side, marked with a white triangle) faces +Y before rotation.
- Door/window offsets go to the opening centre: from the west end on north/south walls, from the south end on east/west walls.

## Controls

- Drag a machine from the left library onto the floor (or double-click to add at the centre).
- Drag a machine to move it (snap set in toolbar; hold Alt for free movement). Drag the blue ring to rotate (15° steps; Shift for 1°).
- R rotate 90°, Ctrl+D duplicate, Delete remove, Ctrl+Z / Ctrl+Y undo / redo, Esc deselect.
- Click a warning in the bottom panel to select and centre that machine.

## White-part production template

**+ White-part production line** (bottom of the machine library, or in Projects) adds a new layout in the current building with the machines needed to make white parts (machined, sanded chair components before assembly and finishing), linked in flow order and laid out as a U:

Raw timber rack → rip saw → crosscut saw → four-sided moulder → bandsaw → mortiser → tenoner → multi-boring → copy shaper → wide belt sander → profile sander → inspection table → WIP rack, with dust collector and air compressor in the south-east corner.

Everything stays editable afterwards. To change the default line, edit `WHITE_PART_STEPS` in `src/domain/templates.ts`.

## Extending

- **New machine type:** add an entry to `CATALOGUE` in `src/domain/catalogue.ts`; optionally add a model component in `src/scene/models/` and register it in `src/scene/models/index.ts`. Models get `{ l, w, h }` in metres and must fill that box (front faces −z).
- **Real 3D models:** select a machine → Appearance → Import. The file is scaled to the machine's entered L×W×H (keep proportions on by default). Use `.glb` for glTF (single file).
- **Analysis (Phase 2/3):** layout data already includes `flows`, clearances, operator areas and input/output points; add pure functions next to `src/domain/validation.ts`.
