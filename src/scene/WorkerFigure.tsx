import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WALK_SPEED, walkLoop, walkPose } from '../domain/simulation';
import type { Machine, Worker } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { rotY, toThree } from './coords';
import { useMachineDrag } from './DragController';

interface Props {
  worker: Worker;
  machines: Machine[];
  selected: boolean;
  flat: boolean;
  showLabel: boolean;
}

/**
 * ~1.7 m person (disc with a front marker in plan view). Drag to move, drag the ring to rotate.
 * When selected: dashed lines to assigned machines and the walking loop. While Play is on, walks its loop.
 */
export function WorkerFigure({ worker: w, machines, selected, flat, showLabel }: Props) {
  const startDrag = useMachineDrag();
  const updateWorker = useProjectStore((s) => s.updateWorker);
  const animating = useUiStore((s) => s.animating);
  const speed = useUiStore((s) => s.animSpeed);
  const body = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const limbs = useRef<Limbs>({ legs: [], arm: null });
  const legs = useMemo(() => walkLoop(w), [w.x, w.y, w.path]); // eslint-disable-line react-hooks/exhaustive-deps
  const color = selected ? '#38bdf8' : '#f59e0b';
  const assigned = machines.filter((m) => w.machineIds.includes(m.id));
  const commit = (p: { x: number; y: number; rotation: number }) => updateWorker(w.id, p);

  // Pose is set here (not via props) so walking needs no React re-render; stopping snaps back to the saved pose.
  useFrame((_, dt) => {
    const g = body.current;
    if (!g) return;
    const pose = animating && legs.length ? walkPose(legs, (clock.current += Math.min(dt, 0.1) * speed)) : null;
    if (!pose) clock.current = 0;
    const p = pose ?? w;
    // Walk cycle: one leg swing per STEP metres walked; free arm swings opposite; small bob on each step.
    const phase = pose ? (clock.current * WALK_SPEED * Math.PI) / STEP : 0;
    const swing = Math.sin(phase) * 0.55;
    limbs.current.legs.forEach((leg, i) => { leg.rotation.x = i ? -swing : swing; });
    if (limbs.current.arm) limbs.current.arm.rotation.x = swing * 0.8;
    g.position.set(...toThree(p.x, p.y, pose && !flat ? Math.abs(Math.sin(phase)) * 0.025 : 0));
    g.rotation.y = rotY(p.rotation);
  });

  const loop = [{ x: w.x, y: w.y }, ...w.path, { x: w.x, y: w.y }];

  return (
    <>
      <group ref={body} onPointerDown={(e) => startDrag(w, 'move', e, commit)} onClick={(e) => e.stopPropagation()}>
        {flat ? (
          <>
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.3, 24]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Front marker so the facing shows in plan view. */}
            <mesh position={[0, 0.07, 0.17]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} raycast={() => null}>
              <circleGeometry args={[0.1, 3]} />
              <meshBasicMaterial color="#f8fafc" />
            </mesh>
          </>
        ) : (
          <group scale={1.1}><CuteWorker limbs={limbs} /></group>
        )}
        {selected && (
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={(e) => startDrag(w, 'rotate', e, commit)}>
            <torusGeometry args={[0.5, 0.05, 8, 48]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
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
      {selected && w.path.length > 0 && (
        <>
          <Line points={loop.map((p) => toThree(p.x, p.y, 0.04))} color="#e879f9" lineWidth={3} dashed dashSize={0.4} gapSize={0.2} raycast={() => null} />
          {w.path.map((p, i) => (
            <mesh key={i} position={toThree(p.x, p.y, 0.05)} raycast={() => null}>
              <sphereGeometry args={[0.25, 16, 10]} />
              <meshBasicMaterial color="#e879f9" />
            </mesh>
          ))}
        </>
      )}
    </>
  );
}

const HAT = '#2f7fe0', SUIT = '#2f6fd0', SKIN = '#f6d2b8', HAIR = '#5a3a22', TAN = '#d98a2b', BELT = '#c98a3a';
const BOOT = '#8b4a24', GREY = '#9aa0a8', EYE = '#4a2c1a', INK = '#1a1a1a';

function Mat({ color, rough = 0.55 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} />;
}

/** Hip height (model units) where the legs pivot. */
const HIP = 0.36;
/** Floor distance covered per step (m, at the 1.1 model scale): sets leg swing speed so feet don't slide. */
const STEP = 0.42;
interface Limbs { legs: THREE.Group[]; arm: THREE.Group | null }

/** Chibi worker (blue hard hat, coverall, tool belt, pliers), ~1.52 m tall at scale 1, facing south (+z). */
function CuteWorker({ limbs }: { limbs: React.MutableRefObject<Limbs> }) {
  return (
    <group>
      {/* Boots, legs: each pivots at the hip (y = HIP) so it can swing while walking */}
      {[-0.08, 0.08].map((x, i) => (
        <group key={x} position={[x, HIP, 0]} ref={(g) => { if (g) limbs.current.legs[i] = g; }}>
          <mesh position={[0, 0.05 - HIP, 0.02]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.18]} />
            <Mat color={BOOT} />
          </mesh>
          <mesh position={[0, 0.12 - HIP, 0]}>
            <cylinderGeometry args={[0.068, 0.068, 0.05, 16]} />
            <Mat color={TAN} />
          </mesh>
          <mesh position={[0, 0.25 - HIP, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.065, 0.22, 16]} />
            <Mat color={SUIT} />
          </mesh>
        </group>
      ))}
      {/* Coverall body */}
      <mesh position={[0, 0.56, 0]} scale={[1.05, 1, 0.85]} castShadow>
        <capsuleGeometry args={[0.17, 0.2, 8, 20]} />
        <Mat color={SUIT} />
      </mesh>
      {/* Suspenders and chest strap */}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.6, 0.142]} raycast={() => null}>
          <boxGeometry args={[0.04, 0.3, 0.02]} />
          <Mat color={TAN} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0.15]} raycast={() => null}>
        <boxGeometry args={[0.2, 0.025, 0.02]} />
        <Mat color={GREY} />
      </mesh>
      {/* Tool belt, buckle, pouches */}
      <mesh position={[0, 0.41, 0]} scale={[1.05, 1, 0.85]} raycast={() => null}>
        <cylinderGeometry args={[0.185, 0.185, 0.05, 24]} />
        <Mat color={BELT} />
      </mesh>
      <mesh position={[0, 0.41, 0.165]} raycast={() => null}>
        <boxGeometry args={[0.06, 0.05, 0.02]} />
        <Mat color="#e0b04a" rough={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, 0.35, 0.07]} rotation={[0, s * 0.5, 0]} castShadow>
          <boxGeometry args={[0.08, 0.11, 0.06]} />
          <Mat color="#e0a040" />
        </mesh>
      ))}
      {/* Raised arm holding pliers (viewer's left) */}
      <group position={[-0.17, 0.74, 0]} rotation={[0, 0, -2.3]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.16, 6, 12]} />
          <Mat color={SUIT} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.048, 16, 12]} />
          <Mat color={SKIN} />
        </mesh>
        <group position={[0, -0.27, 0.02]} rotation={[0, 0, 2.3]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.015, 0.0, 0]} rotation={[0, 0, s * -0.12]}>
              <cylinderGeometry args={[0.014, 0.012, 0.14, 8]} />
              <Mat color="#6b3a2a" />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.018, 0.11, 0]} rotation={[0, 0, s * 0.25]}>
              <boxGeometry args={[0.016, 0.1, 0.012]} />
              <Mat color={GREY} rough={0.25} />
            </mesh>
          ))}
        </group>
      </group>
      {/* Other arm down by the side */}
      <group position={[0.17, 0.74, 0]} rotation={[0, 0, 0.25]} ref={(g) => { limbs.current.arm = g; }}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.16, 6, 12]} />
          <Mat color={SUIT} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.048, 16, 12]} />
          <Mat color={SKIN} />
        </mesh>
      </group>
      {/* Head, ears */}
      <mesh position={[0, 1.1, 0]} scale={[1.05, 0.95, 1]} castShadow>
        <sphereGeometry args={[0.29, 32, 24]} />
        <Mat color={SKIN} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, 1.07, 0]} scale={[0.6, 1, 1]}>
          <sphereGeometry args={[0.06, 16, 12]} />
          <Mat color={SKIN} />
        </mesh>
      ))}
      {/* Hair cap showing as a fringe under the hat */}
      <mesh position={[0, 1.1, -0.01]}>
        <sphereGeometry args={[0.305, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        <Mat color={HAIR} rough={0.8} />
      </mesh>
      {/* Fringe tufts on the forehead and hair over the ears */}
      {[-0.13, -0.04, 0.05, 0.13].map((x, i) => (
        <mesh key={x} position={[x, 1.2 - (i % 2) * 0.01, 0.27 - Math.abs(x) * 0.3]} rotation={[0.3, 0, (x > 0 ? -1 : 1) * 0.5]} scale={[1, 0.65, 0.55]}>
          <sphereGeometry args={[0.065, 16, 12]} />
          <Mat color={HAIR} rough={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.265, 1.14, 0.02]} scale={[0.5, 1, 0.9]}>
          <sphereGeometry args={[0.08, 16, 12]} />
          <Mat color={HAIR} rough={0.8} />
        </mesh>
      ))}
      {/* Eyes: white, brown iris, pupil, sparkle; eyebrows */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 1.06, 0.245]}>
          <mesh scale={[1, 1.1, 0.5]}>
            <sphereGeometry args={[0.068, 20, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, -0.005, 0.025]} scale={[1, 1.1, 0.5]}>
            <sphereGeometry args={[0.054, 20, 16]} />
            <meshBasicMaterial color={EYE} />
          </mesh>
          <mesh position={[0, -0.005, 0.045]} scale={[1, 1.1, 0.5]}>
            <sphereGeometry args={[0.03, 16, 12]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          <mesh position={[s * -0.018, 0.02, 0.06]}>
            <sphereGeometry args={[0.014, 10, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.095, 0.02]} rotation={[0, 0, Math.PI / 2 + s * 0.15]}>
            <capsuleGeometry args={[0.011, 0.05, 4, 8]} />
            <Mat color={HAIR} />
          </mesh>
        </group>
      ))}
      {/* Rosy cheeks, nose, smile */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.17, 0.98, 0.225]} scale={[1, 0.7, 0.3]} raycast={() => null}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshBasicMaterial color="#f29b9b" transparent opacity={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, 0.285]}>
        <sphereGeometry args={[0.02, 12, 8]} />
        <Mat color="#efbfa2" />
      </mesh>
      <mesh position={[0, 0.95, 0.268]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.035, 0.007, 8, 16, Math.PI]} />
        <meshBasicMaterial color="#a0473a" />
      </mesh>
      {/* Hard hat: dome, ridge, brim, badge */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={HAT} rough={0.35} />
      </mesh>
      <mesh position={[0, 1.44, 0]} scale={[0.3, 1, 1]} raycast={() => null}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <Mat color={HAT} rough={0.35} />
      </mesh>
      <mesh position={[0, 1.2, 0.03]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.035, 32]} />
        <Mat color={HAT} rough={0.35} />
      </mesh>
      <mesh position={[0, 1.35, 0.288]} rotation={[-0.5, 0, 0]} raycast={() => null}>
        <circleGeometry args={[0.07, 24]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 1.351, 0.291]} rotation={[-0.5, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.035, 0.05, 24]} />
        <meshBasicMaterial color={HAT} />
      </mesh>
    </group>
  );
}
