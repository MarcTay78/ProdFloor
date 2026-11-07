import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Model-local frame: length along x (-l/2..l/2), width along z (-w/2..w/2), height along y (0..h).
 * The machine front (operator side) faces -z.
 */
export interface ModelProps { l: number; w: number; h: number; color?: string }
export type V3 = [number, number, number];

const std = (color: string, metalness = 0.2, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

export const mat = {
  steel: std('#a7afb6', 0.75, 0.32),
  dark: std('#2d3237', 0.4, 0.55),
  cast: std('#5b6166', 0.6, 0.45),
  green: std('#3d6b52', 0.25, 0.5),
  grey: std('#7b858c', 0.3, 0.5),
  cream: std('#d9d3c1', 0.1, 0.6),
  blue: std('#2c5b88', 0.3, 0.45),
  white: std('#e6e9ec', 0.1, 0.5),
  yellow: std('#e2b324', 0.2, 0.45),
  orange: std('#d9772b', 0.2, 0.5),
  red: std('#b8322a', 0.2, 0.5),
  blade: std('#cfd4d8', 0.95, 0.2),
  wood: std('#b88b57', 0, 0.8),
  woodDark: std('#8c6239', 0, 0.85),
  rubber: std('#1c1e20', 0, 0.9),
  carton: std('#b8936a', 0, 0.9),
  filter: std('#3a4046', 0.1, 0.95),
  glass: std('#9cc7e6', 0.1, 0.05, { transparent: true, opacity: 0.3 }),
  light: std('#ffffff', 0, 0.4, { emissive: new THREE.Color('#fff6dd'), emissiveIntensity: 1.2 }),
  screen: std('#0e2433', 0.2, 0.3, { emissive: new THREE.Color('#1f6f9a'), emissiveIntensity: 0.6 }),
};

const paintCache = new Map<string, THREE.MeshStandardMaterial>();
/** Main body material: the machine's custom colour if set, else the model's default. */
export function usePaint(color: string | undefined, fallback: THREE.Material): THREE.Material {
  return useMemo(() => {
    if (!color) return fallback;
    let m = paintCache.get(color);
    if (!m) paintCache.set(color, (m = std(color, 0.25, 0.5)));
    return m;
  }, [color, fallback]);
}

export function B({ p, s, m, r }: { p: V3; s: V3; m: THREE.Material; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

const AXIS_ROT: Record<'x' | 'y' | 'z', V3> = { x: [0, 0, Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };

/** Cylinder of radius rad and length len along the given axis. rad2 makes a cone. */
export function C({ p, rad, len, m, axis = 'y', rad2, seg = 24 }: { p: V3; rad: number; len: number; m: THREE.Material; axis?: 'x' | 'y' | 'z'; rad2?: number; seg?: number }) {
  return (
    <mesh position={p} rotation={AXIS_ROT[axis]} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[rad, rad2 ?? rad, len, seg]} />
    </mesh>
  );
}

/** Four legs from the floor to height h, inset from the footprint corners. */
export function Legs({ l, w, h, t = 0.06, inset = 0.05, m = mat.dark }: { l: number; w: number; h: number; t?: number; inset?: number; m?: THREE.Material }) {
  const x = l / 2 - inset - t / 2, z = w / 2 - inset - t / 2;
  return (
    <>
      {[[-x, -z], [x, -z], [-x, z], [x, z]].map(([px, pz], i) => <B key={i} p={[px, h / 2, pz]} s={[t, h, t]} m={m} />)}
    </>
  );
}

/** Workbench: legs, stretcher and top. */
export function Bench({ l, w, h, top = mat.wood, frame = mat.dark }: { l: number; w: number; h: number; top?: THREE.Material; frame?: THREE.Material }) {
  const t = Math.min(0.05, h * 0.06);
  return (
    <>
      <Legs l={l} w={w} h={h - t} m={frame} />
      <B p={[0, h * 0.2, 0]} s={[l * 0.9, 0.04, w * 0.85]} m={frame} />
      <B p={[0, h - t / 2, 0]} s={[l, t, w]} m={top} />
    </>
  );
}

/** Upright shelf rack with `levels` shelves, open front. */
export function ShelfRack({ l, w, h, levels, frame = mat.blue, beam = mat.orange }: { l: number; w: number; h: number; levels: number; frame?: THREE.Material; beam?: THREE.Material }) {
  const bays = Math.max(1, Math.round(l / 2.7));
  const xs = Array.from({ length: bays + 1 }, (_, i) => -l / 2 + 0.04 + (i * (l - 0.08)) / bays);
  const ys = Array.from({ length: levels }, (_, i) => 0.12 + (i * (h - 0.2)) / levels);
  return (
    <>
      {xs.map((x, i) => (
        <group key={i}>
          <B p={[x, h / 2, -w / 2 + 0.04]} s={[0.07, h, 0.07]} m={frame} />
          <B p={[x, h / 2, w / 2 - 0.04]} s={[0.07, h, 0.07]} m={frame} />
        </group>
      ))}
      {ys.map((y, i) => (
        <group key={i}>
          <B p={[0, y, -w / 2 + 0.04]} s={[l - 0.04, 0.08, 0.05]} m={beam} />
          <B p={[0, y, w / 2 - 0.04]} s={[l - 0.04, 0.08, 0.05]} m={beam} />
          <B p={[0, y + 0.045, 0]} s={[l - 0.1, 0.02, w - 0.1]} m={mat.grey} />
        </group>
      ))}
    </>
  );
}

/** Control panel box with screen and red stop button, facing front (-z). */
export function Panel({ p, s }: { p: V3; s: V3 }) {
  const [x, y, z] = p;
  const [sx, sy, sz] = s;
  return (
    <>
      <B p={p} s={s} m={mat.grey} />
      <B p={[x, y + sy * 0.12, z - sz / 2 - 0.005]} s={[sx * 0.7, sy * 0.45, 0.01]} m={mat.screen} />
      <C p={[x + sx * 0.3, y - sy * 0.3, z - sz / 2 - 0.02]} rad={Math.min(sx, sy) * 0.08} len={0.04} m={mat.red} axis="z" />
    </>
  );
}

/** Roller conveyor bed along x at height h. */
export function RollerBed({ l, w, h, pitch = 0.3 }: { l: number; w: number; h: number; pitch?: number }) {
  const n = Math.max(2, Math.floor(l / pitch));
  return (
    <>
      <B p={[0, h - 0.06, -w / 2 + 0.03]} s={[l, 0.08, 0.05]} m={mat.grey} />
      <B p={[0, h - 0.06, w / 2 - 0.03]} s={[l, 0.08, 0.05]} m={mat.grey} />
      {Array.from({ length: n }, (_, i) => (
        <C key={i} p={[-l / 2 + (i + 0.5) * (l / n), h - 0.04, 0]} rad={0.035} len={w - 0.08} m={mat.steel} axis="z" seg={12} />
      ))}
      {Array.from({ length: Math.max(2, Math.ceil(l / 1.5)) }, (_, i) => i).map((i, _, arr) => {
        const x = -l / 2 + 0.1 + (i * (l - 0.2)) / (arr.length - 1);
        return <B key={i} p={[x, (h - 0.1) / 2, 0]} s={[0.06, h - 0.1, w * 0.8]} m={mat.dark} />;
      })}
    </>
  );
}
