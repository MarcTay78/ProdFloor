import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { partRoute, positionAt, routeDuration } from '../domain/simulation';
import type { Layout } from '../domain/types';
import { useUiStore } from '../store/uiStore';
import { toThree } from './coords';

const POOL = 60; // most parts drawn at once
const SPAWN_EVERY = 3; // simulated seconds between new parts
const Y = 0.4; // just above the flow arrows

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Display-only stream of parts following the workflow along the flow arrows; positions updated per frame, no React re-render. */
export function PartsAnimation({ layout }: { layout: Layout }) {
  const speed = useUiStore((s) => s.animSpeed);
  const meshes = useRef<(Mesh | null)[]>([]);
  const clock = useRef(0);

  // Part n's route only depends on n modulo each step's parallel count, so one cycle of routes covers every part.
  const { routes, maxDur } = useMemo(() => {
    const placed = new Set(layout.machines.map((m) => m.id));
    const cycle = Math.min(
      POOL,
      layout.workflow.reduce((p, s) => {
        const k = s.machineIds.filter((id) => placed.has(id)).length || 1;
        return (p * k) / gcd(p, k);
      }, 1),
    );
    const routes = Array.from({ length: cycle }, (_, n) => partRoute(layout, n));
    return { routes, maxDur: Math.max(0, ...routes.map(routeDuration)) };
  }, [layout]);

  useFrame((_, dt) => {
    clock.current += Math.min(dt, 0.1) * speed;
    const t = clock.current;
    let slot = 0;
    for (let k = Math.floor(t / SPAWN_EVERY); k >= 0 && slot < POOL; k--) {
      const age = t - k * SPAWN_EVERY;
      if (age > maxDur) break;
      const p = positionAt(routes[k % routes.length], age);
      const mesh = meshes.current[slot];
      if (!p || !mesh) continue;
      mesh.visible = true;
      mesh.position.set(...toThree(p.x, p.y, Y));
      slot++;
    }
    for (; slot < POOL; slot++) {
      const mesh = meshes.current[slot];
      if (mesh) mesh.visible = false;
    }
  });

  return (
    <group>
      {Array.from({ length: POOL }, (_, i) => (
        // Drawn on top (no depth test) so parts stay visible while passing through a machine.
        <mesh key={i} ref={(m) => { meshes.current[i] = m; }} visible={false} raycast={() => null} renderOrder={10}>
          <boxGeometry args={[0.6, 0.2, 0.6]} />
          <meshBasicMaterial color="#facc15" depthTest={false} />
        </mesh>
      ))}
    </group>
  );
}
