import { CATALOGUE, createMachine, findType } from './catalogue';
import { createLayout } from './projectFile';
import type { Factory, Layout, Machine, Project, WorkflowTemplate } from './types';
import { applyTemplate, deriveFlows } from './workflow';

/**
 * White-part production: timber in, machined and sanded chair components (unassembled, unfinished) out.
 * Order = material flow. Edit this list to change the default line.
 */
export const WHITE_PART_STEPS = [
  'raw-timber-rack',     // raw timber storage
  'rip-saw',             // cutting: rip boards to width
  'crosscut-saw',        // crosscutting: cut blanks to length
  'four-sided-moulder',  // plane all four faces to size
  'bandsaw',             // curved parts (back legs, rails)
  'mortiser',            // mortising
  'tenoner',             // tenoning
  'multi-boring',        // drilling (dowels, fittings)
  'shaper',              // shaping / profiling
  'wide-belt-sander',    // sanding flat parts (seats, rails)
  'profile-sander',      // sanding profiled parts (legs, spindles)
  'inspection-table',    // component inspection
  'wip-rack',            // white parts buffer before assembly
];

/** Support equipment placed off the line. */
export const WHITE_PART_SUPPORT = ['dust-collector', 'air-compressor'];

/** Whole chair: white parts, then glue-up, assembly, finishing and packing. */
export const FULL_CHAIR_STEPS = [
  ...WHITE_PART_STEPS,
  'glue-station',
  'assembly-station',
  'spray-booth',
  'drying-room',
  'packing-station',
  'finished-goods-rack',
];

const templateOf = (id: string, name: string, typeIds: string[]): WorkflowTemplate => ({
  id, name,
  steps: typeIds.map((t) => ({ name: CATALOGUE.find((c) => c.id === t)?.name ?? t, typeId: t })),
});

/** Built-in, read-only workflow templates. */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  templateOf('white-part', 'White part', WHITE_PART_STEPS),
  templateOf('full-chair', 'Full chair', FULL_CHAIR_STEPS),
];

export function allWorkflowTemplates(project: Pick<Project, 'workflowTemplates'>): WorkflowTemplate[] {
  return [...WORKFLOW_TEMPLATES, ...project.workflowTemplates];
}

const WALL_MARGIN = 1.0;   // free strip along walls
const WALKWAY = 0.6;       // extra gap between neighbouring machines beyond their clearance
const CENTRE_AISLE = 2.5;  // material / forklift aisle between lanes

const reach = (m: Machine) => Math.max(m.clearance.front, m.clearance.back, m.clearance.left, m.clearance.right);
const frontReach = (m: Machine) => Math.max(m.clearance.front, m.operatorArea.depth);

/**
 * Lay the white-part line out as a serpentine (U) inside the factory: first lane west→east along the
 * north wall, next lane east→west, and so on. Consecutive machines are linked with flows.
 * ponytail: greedy lane filling, ignores pillars/zones/internal walls; validation flags any clash.
 */
export function createWhitePartLayout(factory: Factory, project: Pick<Project, 'customTypes'>, name = 'White part production'): Layout {
  const layout = createLayout(name, structuredClone(factory));
  const L = factory.length, W = factory.width;
  const steps = WHITE_PART_STEPS.flatMap((id) => {
    const t = findType(project, id);
    return t ? [createMachine(t, 0, 0)] : [];
  });

  // 1. Fill lanes along x as if every lane ran west→east.
  const lanes: Machine[][] = [[]];
  let cursor = WALL_MARGIN;
  for (const m of steps) {
    const lane = lanes[lanes.length - 1];
    const prev = lane[lane.length - 1];
    let start = prev ? cursor + Math.max(reach(prev), reach(m)) + WALKWAY : cursor + reach(m);
    if (prev && start + m.length > L - WALL_MARGIN - reach(m)) {
      lanes.push([]);
      start = WALL_MARGIN + reach(m);
    }
    m.x = start + m.length / 2;
    cursor = start + m.length;
    lanes[lanes.length - 1].push(m);
  }

  // 2. Lane rows from the north wall down. Even lanes face north (rotation 0), odd lanes run back
  //    east→west (mirrored, rotation 180) so material keeps flowing input→output.
  let y = W;
  lanes.forEach((lane, i) => {
    const halfW = Math.max(...lane.map((m) => m.width)) / 2;
    const north = Math.max(...lane.map((m) => (i % 2 ? m.clearance.back : frontReach(m))));
    if (i === 0) y = W - WALL_MARGIN - north - halfW;
    else {
      const prev = lanes[i - 1];
      const prevHalfW = Math.max(...prev.map((m) => m.width)) / 2;
      const prevSouth = Math.max(...prev.map((m) => ((i - 1) % 2 ? frontReach(m) : m.clearance.back)));
      y -= prevHalfW + prevSouth + CENTRE_AISLE + north + halfW;
    }
    for (const m of lane) {
      m.y = +y.toFixed(2);
      if (i % 2) {
        m.x = L - m.x;
        m.rotation = 180;
      }
      m.x = +m.x.toFixed(2);
    }
  });

  // 3. Support equipment in the south-east corner, away from the line.
  let east = L - WALL_MARGIN;
  const support = WHITE_PART_SUPPORT.flatMap((id) => {
    const t = findType(project, id);
    if (!t) return [];
    const m = createMachine(t, 0, 0);
    m.x = +(east - reach(m) - m.length / 2).toFixed(2);
    m.y = +(WALL_MARGIN + reach(m) + m.width / 2).toFixed(2);
    east = m.x - m.length / 2 - reach(m) - WALKWAY;
    return [m];
  });

  layout.machines = [...steps, ...support];
  layout.workflow = applyTemplate(WORKFLOW_TEMPLATES[0], steps);
  layout.flows = deriveFlows(layout.workflow);
  return layout;
}
