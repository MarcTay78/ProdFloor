import { Html, Line } from '@react-three/drei';
import { useMemo } from 'react';
import { areaBounds } from '../domain/areas';
import type { Layout } from '../domain/types';
import { toThree } from './coords';

const Y = 0.012; // just above the floor, below flow arrows

/** Tinted floor patch with an outline and name around each process area's machines; follows them while dragging. */
export function AreaPatches({ layout }: { layout: Layout }) {
  const boxes = useMemo(() => areaBounds(layout), [layout]);
  return (
    <group raycast={() => null}>
      {boxes.map(({ area, count, minX, minY, maxX, maxY }) => {
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const corners = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]].map(([x, y]) => toThree(x, y, Y + 0.002));
        return (
          <group key={area.id}>
            <mesh position={toThree(cx, cy, Y)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <planeGeometry args={[maxX - minX, maxY - minY]} />
              <meshBasicMaterial color={area.color} transparent opacity={0.22} depthWrite={false} />
            </mesh>
            <Line points={corners} color={area.color} lineWidth={2} dashed dashSize={0.4} gapSize={0.2} raycast={() => null} />
            <Html zIndexRange={[4, 0]} position={toThree(minX + 0.2, maxY - 0.2, Y + 0.05)} className="pointer-events-none select-none whitespace-nowrap">
              <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white shadow" style={{ background: area.color }}>
                {area.name} · {count}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
