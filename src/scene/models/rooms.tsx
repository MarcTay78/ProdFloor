import { useMemo } from 'react';
import * as THREE from 'three';
import { B, C, Panel, ShelfRack, mat, usePaint, type ModelProps } from './parts';

const T = 0.06;

export function SprayBooth({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.white);
  const roofY = h - 0.4;
  return (
    <>
      <B p={[0, 0.01, 0]} s={[l, 0.02, w]} m={mat.filter} />
      <B p={[0, roofY / 2, w / 2 - T / 2]} s={[l, roofY, T]} m={body} />
      <B p={[-l / 2 + T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[l / 2 - T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[0, roofY + T / 2, 0]} s={[l, T, w]} m={body} />
      <B p={[0, roofY * 0.5, w / 2 - T - 0.05]} s={[l * 0.9, roofY * 0.85, 0.08]} m={mat.filter} />
      {[-1, 1].map((s) => <B key={s} p={[s * (l / 2 - T - 0.01), roofY * 0.6, 0]} s={[0.02, roofY * 0.5, w * 0.5]} m={mat.light} />)}
      <B p={[0, roofY + 0.18, w * 0.25]} s={[l * 0.3, 0.3, w * 0.3]} m={mat.grey} />
      <C p={[l * 0.3, roofY + 0.2, w * 0.25]} rad={0.18} len={0.4} m={mat.steel} />
      <B p={[0, roofY * 0.5, -w / 2 + 0.02]} s={[l, 0.04, 0.04]} m={mat.yellow} />
    </>
  );
}

export function DryingRoom({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.grey);
  const roofY = h - 0.35;
  const doorW = Math.min(1.6, l * 0.3);
  const frontSeg = (l - doorW) / 2;
  return (
    <>
      <B p={[0, roofY / 2, w / 2 - T / 2]} s={[l, roofY, T]} m={body} />
      <B p={[-l / 2 + T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[l / 2 - T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[-l / 2 + frontSeg / 2, roofY / 2, -w / 2 + T / 2]} s={[frontSeg, roofY, T]} m={body} />
      <B p={[l / 2 - frontSeg / 2, roofY / 2, -w / 2 + T / 2]} s={[frontSeg, roofY, T]} m={mat.glass} />
      <B p={[-l * 0.0, roofY * 0.5, -w / 2 + T / 2]} s={[doorW, roofY, T * 0.8]} m={mat.orange} />
      <B p={[0, roofY + T / 2, 0]} s={[l, T, w]} m={body} />
      <group position={[l * 0.22, 0, 0]}>
        <ShelfRack l={l * 0.4} w={w * 0.6} h={roofY * 0.9} levels={5} frame={mat.steel} beam={mat.steel} />
      </group>
      <B p={[-l * 0.25, roofY + 0.17, w * 0.2]} s={[l * 0.25, 0.28, w * 0.35]} m={mat.steel} />
      <C p={[-l * 0.25, roofY + 0.2, -w * 0.15]} rad={0.15} len={0.3} m={mat.grey} />
    </>
  );
}

const boothBeige = new THREE.MeshStandardMaterial({ color: '#e4ddcb', metalness: 0.2, roughness: 0.55 });
const galvanised = new THREE.MeshStandardMaterial({ color: '#c3c8cc', metalness: 0.7, roughness: 0.35 });

/** Perforated filter-panel material: light board with a grid of dark holes (canvas texture, made on first render). */
function usePerforated(): THREE.Material {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e9e4d6';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#4a4a46';
    for (let y = 4; y < 64; y += 8) for (let x = 4; x < 64; x += 8) { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 5);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  }, []);
}

/**
 * Open-front hand spray booth (dry filter wall): beige cabinet open at the front (-z), galvanised side linings,
 * perforated filter back wall with a middle rail, extraction fan and duct elbow on the roof, control panel on the right post.
 */
export function HandSprayBooth({ l, w, h, color }: ModelProps) {
  const frame = usePaint(color, boothBeige);
  const holes = usePerforated();
  const hb = Math.max(1.6, h - 0.5); // cabinet height; fan sits on top
  const post = 0.32; // right post holding the control panel
  const fz = -w / 2; // open front plane
  const px = -(l / 2 - post / 2); // control post: -x is the viewer's right when facing the open front
  return (
    <>
      {/* Back, sides and roof of the cabinet */}
      <B p={[0, hb / 2, w / 2 - T / 2]} s={[l, hb, T]} m={frame} />
      {[-1, 1].map((s) => <B key={s} p={[s * (l / 2 - T / 2), hb / 2, 0]} s={[T, hb, w]} m={frame} />)}
      <B p={[0, hb - T / 2, 0]} s={[l, T, w]} m={frame} />
      {/* Galvanised linings inside the side walls and under the roof */}
      {[-1, 1].map((s) => <B key={`g${s}`} p={[s * (l / 2 - T - 0.01), hb / 2, 0]} s={[0.02, hb - 0.1, w - 0.1]} m={galvanised} />)}
      <B p={[0, hb - T - 0.01, 0]} s={[l - 0.1, 0.02, w - 0.1]} m={galvanised} />
      {/* Front frame: top header and side posts (the right one wider, with the control panel) */}
      <B p={[0, hb - 0.12, fz + 0.03]} s={[l, 0.24, 0.06]} m={frame} />
      <B p={[l / 2 - 0.05, hb / 2, fz + 0.03]} s={[0.1, hb, 0.06]} m={frame} />
      <B p={[px, hb / 2, fz + 0.03]} s={[post, hb, 0.06]} m={frame} />
      <B p={[px, 1.35, fz - 0.07]} s={[post * 0.8, 0.45, 0.14]} m={mat.white} />
      <B p={[px, 1.42, fz - 0.145]} s={[post * 0.5, 0.12, 0.01]} m={mat.screen} />
      <C p={[px - 0.06, 1.22, fz - 0.16]} rad={0.035} len={0.04} m={mat.red} axis="z" />
      <C p={[px + 0.06, 1.22, fz - 0.16]} rad={0.025} len={0.04} m={mat.yellow} axis="z" />
      {/* Perforated filter wall with a horizontal steel rail and an upper intake slot */}
      <mesh position={[post / 2 - 0.05, hb * 0.45 + 0.05, w / 2 - T - 0.04]} material={holes} receiveShadow>
        <boxGeometry args={[l - post - 0.3, hb * 0.72, 0.03]} />
      </mesh>
      <B p={[post / 2 - 0.05, hb * 0.45 + 0.05, w / 2 - T - 0.07]} s={[l - post - 0.3, 0.05, 0.04]} m={galvanised} />
      <B p={[post / 2 - 0.05, hb * 0.86, w / 2 - T - 0.06]} s={[l - post - 0.3, hb * 0.08, 0.05]} m={galvanised} />
      {/* Floor drip tray */}
      <B p={[0, 0.02, 0.05]} s={[l - 0.15, 0.04, w - 0.2]} m={galvanised} />
      {/* Extraction fan housing, motor and duct elbow on the roof */}
      <B p={[-l * 0.05, hb + 0.2, w * 0.1]} s={[Math.min(1.0, l * 0.32), 0.4, Math.min(0.8, w * 0.5)]} m={mat.dark} />
      <C p={[-l * 0.05, hb + 0.47, w * 0.1]} rad={0.1} len={0.14} m={mat.blue} />
      <C p={[-l * 0.05 + Math.min(0.5, l * 0.16) + 0.2, hb + 0.25, w * 0.1]} rad={0.2} len={0.45} m={galvanised} axis="x" />
    </>
  );
}

const scaffoldRed = new THREE.MeshStandardMaterial({ color: '#c0392b', metalness: 0.3, roughness: 0.5 });
const conveyorBlue = new THREE.MeshStandardMaterial({ color: '#1f4fa8', metalness: 0.4, roughness: 0.4 });

/**
 * Electrostatic disc spray room: tall galvanised panelled room on a plinth (set back from the front),
 * vertical disc reciprocator column in front reaching above the roof with a blue drum at its base,
 * white control cabinet beside it, red access scaffold on the roof and overhead conveyor rails entering
 * the side. Front (operator side) is -z; seen from the front the cabinet is on the left.
 */
export function DiscSprayRoom({ l, w, h, color }: ModelProps) {
  const panels = usePaint(color, galvanised);
  const base = 0.25;
  const hr = Math.min(h * 0.75, h - 1.0); // room height above the plinth
  const roomTop = base + hr;
  const setBack = Math.min(0.9, w * 0.25); // space in front for the column and cabinet
  const rd = w - setBack, rz = setBack / 2; // room depth and centre z
  const front = rz - rd / 2;
  const ribs = Math.max(2, Math.round(l / 0.6));
  const colR = Math.min(0.32, l * 0.08), colZ = -w / 2 + colR + 0.1;
  return (
    <>
      {/* Plinth under the whole room */}
      <B p={[0, base / 2, rz]} s={[l, base, rd]} m={mat.cast} />
      {/* Walls and roof */}
      <B p={[0, base + hr / 2, rz + rd / 2 - T / 2]} s={[l, hr, T]} m={panels} />
      <B p={[0, base + hr / 2, front + T / 2]} s={[l, hr, T]} m={panels} />
      {[-1, 1].map((s) => <B key={s} p={[s * (l / 2 - T / 2), base + hr / 2, rz]} s={[T, hr, rd]} m={panels} />)}
      <B p={[0, roomTop + T / 2, rz]} s={[l, T, rd]} m={panels} />
      {/* Panel seams on the front and sides */}
      {Array.from({ length: ribs - 1 }, (_, i) => -l / 2 + ((i + 1) * l) / ribs).map((x) => (
        <B key={x} p={[x, base + hr / 2, front - 0.01]} s={[0.04, hr, 0.03]} m={mat.steel} />
      ))}
      {[-1, 1].flatMap((s) => [0.33, 0.66].map((k) => (
        <B key={`${s}${k}`} p={[s * (l / 2 + 0.01), base + hr / 2, front + rd * k]} s={[0.03, hr, 0.04]} m={mat.steel} />
      )))}
      {/* Disc reciprocator column with bands, blue drum at its base */}
      <C p={[0, (base + h) / 2, colZ]} rad={colR} len={h - base} m={mat.steel} seg={32} />
      {Array.from({ length: Math.floor(h - base) }, (_, i) => (
        <C key={i} p={[0, base + 0.8 + i, colZ]} rad={colR + 0.015} len={0.04} m={mat.cast} seg={32} />
      ))}
      <C p={[0, base + 0.2, colZ]} rad={colR * 1.35} len={0.4} m={mat.blue} seg={32} />
      <B p={[0, base / 2, colZ]} s={[colR * 3, base, colR * 3]} m={mat.cast} />
      {/* Control cabinet beside the column */}
      <B p={[l / 2 - 0.35, 0.85, -w / 2 + 0.3]} s={[0.6, 1.7, 0.45]} m={mat.white} />
      <Panel p={[l / 2 - 0.35, 1.3, -w / 2 + 0.3 - 0.2]} s={[0.45, 0.3, 0.06]} />
      {/* Access scaffold on the roof (back, viewer's right) */}
      {[0, 1].flatMap((i) => [0, 1].map((j) => (
        <B key={`${i}${j}`} p={[-l / 2 + 0.3 + i * 0.9, roomTop + 0.6, rz + rd / 2 - 0.3 - j * 0.9]} s={[0.05, 1.2, 0.05]} m={scaffoldRed} />
      )))}
      {[0.4, 1.15].map((y) => (
        <group key={y}>
          {[0, 0.9].map((dz) => <B key={`x${dz}`} p={[-l / 2 + 0.75, roomTop + y, rz + rd / 2 - 0.3 - dz]} s={[0.95, 0.04, 0.04]} m={scaffoldRed} />)}
          {[0, 0.9].map((dx) => <B key={`z${dx}`} p={[-l / 2 + 0.3 + dx, roomTop + y, rz + rd / 2 - 0.75]} s={[0.04, 0.04, 0.95]} m={scaffoldRed} />)}
        </group>
      ))}
      {/* Overhead conveyor rails entering through the side wall */}
      {[-0.35, 0.35].map((dz) => (
        <C key={dz} p={[l / 2 + 0.4, roomTop - 0.4, rz + dz]} rad={0.04} len={0.9} m={conveyorBlue} axis="x" />
      ))}
    </>
  );
}
