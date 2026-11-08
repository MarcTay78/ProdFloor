import { Html, Line } from '@react-three/drei';
import type { Machine, Worker } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { toThree } from './coords';
import { useMachineDrag } from './DragController';

interface Props {
  worker: Worker;
  machines: Machine[];
  selected: boolean;
  flat: boolean;
  showLabel: boolean;
}

/** ~1.7 m person (disc in plan view). Drag to move; when selected, dashed lines to each assigned machine. */
export function WorkerFigure({ worker: w, machines, selected, flat, showLabel }: Props) {
  const startDrag = useMachineDrag();
  const updateWorker = useProjectStore((s) => s.updateWorker);
  const color = selected ? '#38bdf8' : '#f59e0b';
  const assigned = machines.filter((m) => w.machineIds.includes(m.id));

  return (
    <>
      <group
        position={toThree(w.x, w.y)}
        onPointerDown={(e) => startDrag(w, 'move', e, (p) => updateWorker(w.id, { x: p.x, y: p.y }))}
        onClick={(e) => e.stopPropagation()}
      >
        {flat ? (
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 24]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ) : (
          <>
            <mesh position={[0, 0.75, 0]} castShadow>
              <capsuleGeometry args={[0.18, 1.0, 4, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 1.55, 0]} castShadow>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshStandardMaterial color="#fcd9b6" />
            </mesh>
          </>
        )}
        {showLabel && (
          <Html zIndexRange={[5, 0]} position={[0, (flat ? 0.1 : 1.7) + 0.25, 0]} center className="pointer-events-none select-none whitespace-nowrap rounded bg-amber-900/80 px-1.5 py-0.5 text-[11px] text-amber-100">
            {w.name}
          </Html>
        )}
      </group>
      {selected && assigned.map((m) => (
        <Line
          key={m.id}
          points={[toThree(w.x, w.y, 0.05), toThree(m.x, m.y, 0.05)]}
          color="#f59e0b"
          lineWidth={1.5}
          dashed
          dashSize={0.3}
          gapSize={0.2}
          raycast={() => null}
        />
      ))}
    </>
  );
}
