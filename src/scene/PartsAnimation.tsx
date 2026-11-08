import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Mesh, MeshBasicMaterial } from 'three';
import { partRoute, positionAt, routeDuration } from '../domain/simulation';
import type { Layout } from '../domain/types';
import { useUiStore } from '../store/uiStore';
import { toThree } from './coords';

const POOL = 60; // most parts drawn at once
const STREAM_EVERY = 3; // simulated seconds between new parts in stream mode
const SINGLE_GAP = 1; // simulated seconds between one part finishing and the next starting in single mode
const Y = 0.4; // just above the flow arrows

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Display-only stream of parts following the workflow along the flow arrows; positions updated per frame, no React re-render. */
export function PartsAnimation({ layout }: { layout: Layout }) {
  const speed = useUiStore((s) => s.animSpeed);
  const mode = useUiStore((s) => s.animMode);
  const meshes = useRef<(Mesh | null)[]>([]);
  const clock = useRef(0);
  useEffect(() => { clock.current = 0; }, [mode]); // restart from step 1 when the mode changes

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
    const every = mode === 'single' ? maxDur + SINGLE_GAP : STREAM_EVERY;
    let slot = 0;
    for (let k = Math.floor(t / every); k >= 0 && slot < POOL; k--) {
      const age = t - k * every;
      if (age > maxDur) break;
      const p = positionAt(routes[k % routes.length], age);
      const mesh = meshes.current[slot];
      if (!p || !mesh) continue;
      mesh.visible = true;
      mesh.position.set(...toThree(p.x, p.y, Y));
      // Colour follows the part (not the slot) so the eye can track each one.
      (mesh.material as MeshBasicMaterial).color.setHSL(((k * 0.17) % 1 + 1) % 1, 0.9, 0.55);
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
          <meshBasicMaterial depthTest={false} />
        </mesh>
      ))}
    </group>
  );
}
