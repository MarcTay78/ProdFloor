import { Html, Line } from '@react-three/drei';
import { localToWorld } from '../domain/geometry';
import type { FlowLink, Machine } from '../domain/types';
import { toThree } from './coords';

const COLOR = '#f97316';
const Y = 0.25;

/** Material-flow arrows from each machine's output point to the next machine's input point, numbered in order. */
export function FlowArrows({ flows, machines, showNumbers }: { flows: FlowLink[]; machines: Machine[]; showNumbers: boolean }) {
  const byId = new Map(machines.map((m) => [m.id, m]));
  return (
    <group raycast={() => null}>
      {flows.map((f, i) => {
        const a = byId.get(f.fromMachineId), b = byId.get(f.toMachineId);
        if (!a || !b) return null;
        const p = localToWorld(a, a.outputPoint), q = localToWorld(b, b.inputPoint);
        const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
        if (len < 0.01) return null;
        const head = Math.min(0.5, len * 0.4);
        const tip = toThree(q.x - (dx / len) * (head / 2), q.y - (dy / len) * (head / 2), Y);
        const angle = Math.atan2(dy, dx);
        return (
          <group key={f.id}>
            <Line points={[toThree(p.x, p.y, Y), toThree(q.x - (dx / len) * head, q.y - (dy / len) * head, Y)]} color={COLOR} lineWidth={3} raycast={() => null} />
            <mesh position={tip} rotation={[0, angle, -Math.PI / 2]} raycast={() => null}>
              <coneGeometry args={[0.18, head, 12]} />
              <meshBasicMaterial color={COLOR} />
            </mesh>
            {showNumbers && (
              <Html zIndexRange={[5, 0]} position={toThree(p.x, p.y, Y + 0.3)} center className="pointer-events-none select-none rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
                {i + 1}
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
