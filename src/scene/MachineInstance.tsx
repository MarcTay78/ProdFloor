import { Edges, Html, Line } from '@react-three/drei';
import { memo } from 'react';
import * as THREE from 'three';
import { findType } from '../domain/catalogue';
import { clearanceRect, operatorRect } from '../domain/geometry';
import type { Machine, MachineCategory, Project } from '../domain/types';
import { toThree, rotY } from './coords';
import { useMachineDrag } from './DragController';
import { FloorRect } from './FactoryShell';
import { ImportedModel } from './ImportedModel';
import { getModel } from './models';

const CATEGORY_COLOR: Record<MachineCategory, string> = {
  storage: '#64748b', cutting: '#0d9488', joinery: '#7c3aed', shaping: '#2563eb', drilling: '#0891b2',
  sanding: '#ca8a04', assembly: '#16a34a', finishing: '#ea580c', utilities: '#475569', custom: '#a21caf',
};

export type MachineStatus = 'error' | 'warning' | null;

interface Props {
  machine: Machine;
  project: Project;
  status: MachineStatus;
  selected: boolean;
  flat: boolean;
  showModel: boolean;
  showLabel: boolean;
}

export const MachineInstance = memo(function MachineInstance({ machine: m, project, status, selected, flat, showModel, showLabel }: Props) {
  const startDrag = useMachineDrag();
  const type = findType(project, m.typeId);
  const Model = getModel(type?.model ?? 'generic');
  const modelKey = m.modelOverride ?? project.typeModels[m.typeId];
  const builtIn = <Model l={m.length} w={m.width} h={m.height} color={m.color} />;
  const catColor = CATEGORY_COLOR[type?.category ?? 'custom'];
  const statusColor = status === 'error' ? '#ef4444' : status === 'warning' ? '#f59e0b' : null;
  const boxH = showModel ? m.height : 0.04;

  return (
    <>
      <group position={toThree(m.x, m.y)} rotation-y={rotY(m.rotation)} onPointerDown={(e) => startDrag(m, 'move', e)} onClick={(e) => e.stopPropagation()}>
        {showModel ? (
          modelKey ? <ImportedModel modelKey={modelKey} l={m.length} w={m.width} h={m.height} fallback={builtIn} /> : builtIn
        ) : (
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[m.length, 0.04, m.width]} />
            <meshBasicMaterial color={m.color ?? catColor} transparent opacity={0.75} />
          </mesh>
        )}
        <mesh position={[0, boxH / 2, 0]}>
          <boxGeometry args={[m.length + 0.02, boxH + 0.02, m.width + 0.02]} />
          <meshBasicMaterial color={statusColor ?? '#38bdf8'} transparent opacity={status === 'error' ? 0.22 : 0} depthWrite={false} />
          {(selected || statusColor || flat) && <Edges color={selected ? '#38bdf8' : statusColor ?? '#e2e8f0'} lineWidth={selected ? 2 : 1} />}
        </mesh>
        {/* Front marker so orientation is visible in 2D. */}
        <mesh position={[0, boxH + 0.01, -m.width / 2 + 0.08]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <circleGeometry args={[Math.min(0.08, m.width / 6), 3]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        {showLabel && (
          <Html zIndexRange={[5, 0]} position={[0, (flat ? 0.1 : m.height) + 0.25, 0]} center className="pointer-events-none select-none whitespace-nowrap rounded bg-slate-900/75 px-1.5 py-0.5 text-[11px] text-slate-100">
            {m.name}
          </Html>
        )}
        {selected && <LocalOverlays m={m} h={flat ? 0.05 : m.height} startDrag={startDrag} />}
      </group>
      {selected && <WorldOverlays m={m} />}
    </>
  );
});

function DimLine({ a, b, label }: { a: [number, number, number]; b: [number, number, number]; label: string }) {
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <>
      <Line points={[a, b]} color="#38bdf8" lineWidth={1.5} raycast={() => null} />
      <Html zIndexRange={[5, 0]} position={mid} center className="pointer-events-none select-none whitespace-nowrap rounded bg-sky-900/90 px-1 text-[11px] text-sky-100">{label}</Html>
    </>
  );
}

function LocalOverlays({ m, h, startDrag }: { m: Machine; h: number; startDrag: ReturnType<typeof useMachineDrag> }) {
  const hl = m.length / 2, hw = m.width / 2, o = 0.3, y = 0.03;
  const ring = Math.hypot(hl, hw) + 0.35;
  return (
    <>
      <DimLine a={[-hl, y, -hw - o]} b={[hl, y, -hw - o]} label={`L ${m.length.toFixed(2)} m`} />
      <DimLine a={[hl + o, y, -hw]} b={[hl + o, y, hw]} label={`W ${m.width.toFixed(2)} m`} />
      <DimLine a={[hl + o, 0, -hw - o]} b={[hl + o, h, -hw - o]} label={`H ${m.height.toFixed(2)} m`} />
      <mesh position={[m.inputPoint.x, 0.1, -m.inputPoint.y]} raycast={() => null}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[m.outputPoint.x, 0.1, -m.outputPoint.y]} raycast={() => null}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#f97316" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} onPointerDown={(e) => startDrag(m, 'rotate', e)}>
        <torusGeometry args={[ring, 0.06, 8, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function WorldOverlays({ m }: { m: Machine }) {
  const op = operatorRect(m);
  return (
    <>
      <FloorRect r={clearanceRect(m)} color="#3b82f6" opacity={0.08} dashed y={0.008} />
      {op && <FloorRect r={op} color="#22c55e" opacity={0.25} y={0.01} />}
    </>
  );
}
