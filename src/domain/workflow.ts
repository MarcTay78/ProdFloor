import { newId } from './catalogue';
import type { FlowLink, Machine, WorkflowStep, WorkflowTemplate } from './types';

/**
 * Link every machine of each non-empty step to every machine of the next non-empty step.
 * Empty steps are skipped; label = 1-based number of the source step.
 */
export function deriveFlows(workflow: WorkflowStep[]): FlowLink[] {
  const out: FlowLink[] = [];
  let prev: WorkflowStep | undefined;
  let prevNo = 0;
  workflow.forEach((step, i) => {
    if (!step.machineIds.length) return;
    for (const a of prev?.machineIds ?? []) {
      for (const b of step.machineIds) {
        if (a !== b) out.push({ id: newId(), fromMachineId: a, toMachineId: b, label: String(prevNo) });
      }
    }
    prev = step;
    prevNo = i + 1;
  });
  return out;
}

export function applyTemplate(template: WorkflowTemplate, machines: Machine[]): WorkflowStep[] {
  return template.steps.map((s) => ({
    id: newId(),
    name: s.name,
    typeId: s.typeId,
    machineIds: s.typeId ? machines.filter((m) => m.typeId === s.typeId).map((m) => m.id) : [],
  }));
}

export function removeMachineFromWorkflow(workflow: WorkflowStep[], ids: string[]): WorkflowStep[] {
  return workflow.map((s) => ({ ...s, machineIds: s.machineIds.filter((id) => !ids.includes(id)) }));
}

/**
 * Migration for files written before workflows existed: one step per linked machine, in topological
 * order of the flow graph (ties and cycles broken by machine order). Links that are not consecutive
 * in that order are counted as dropped.
 */
export function workflowFromFlows(machines: Machine[], flows: FlowLink[]): { workflow: WorkflowStep[]; dropped: number } {
  const linked = new Set(flows.flatMap((f) => [f.fromMachineId, f.toMachineId]));
  const left = machines.filter((m) => linked.has(m.id));
  const indeg = new Map(left.map((m) => [m.id, 0]));
  for (const f of flows) if (indeg.has(f.fromMachineId) && indeg.has(f.toMachineId)) indeg.set(f.toMachineId, indeg.get(f.toMachineId)! + 1);

  const order: Machine[] = [];
  while (left.length) {
    const i = Math.max(0, left.findIndex((m) => indeg.get(m.id) === 0));
    const [m] = left.splice(i, 1);
    order.push(m);
    for (const f of flows) if (f.fromMachineId === m.id && indeg.has(f.toMachineId)) indeg.set(f.toMachineId, indeg.get(f.toMachineId)! - 1);
  }

  const chain = new Set(order.slice(1).map((m, i) => `${order[i].id}>${m.id}`));
  return {
    workflow: order.map((m) => ({ id: newId(), name: m.name, typeId: m.typeId, machineIds: [m.id] })),
    dropped: flows.filter((f) => !chain.has(`${f.fromMachineId}>${f.toMachineId}`)).length,
  };
}
