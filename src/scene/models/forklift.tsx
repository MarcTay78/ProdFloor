import type { ReactNode } from 'react';
import * as THREE from 'three';
import { mat, type V3 } from './parts';

const body = new THREE.MeshStandardMaterial({ color: '#e5481c', metalness: 0.25, roughness: 0.4 });
const frame = new THREE.MeshStandardMaterial({ color: '#3b4046', metalness: 0.5, roughness: 0.45 });
const seat = new THREE.MeshStandardMaterial({ color: '#1f2226', roughness: 0.7 });

/** Overall size of the forklift model, metres (forks included). */
export const FORKLIFT_SIZE = { length: 3.3, width: 1.2, height: 2.2 };

function Box({ at, size, m, cast = true }: { at: V3; size: V3; m: THREE.Material; cast?: boolean }) {
  return (
    <mesh position={at} material={m} castShadow={cast}>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Wheel({ at, r }: { at: V3; r: number }) {
  return (
    <group position={at} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={mat.rubber} castShadow>
        <cylinderGeometry args={[r, r, 0.22, 24]} />
      </mesh>
      <mesh material={mat.steel}>
        <cylinderGeometry args={[r * 0.5, r * 0.5, 0.24, 16]} />
      </mesh>
    </group>
  );
}

/**
 * Counterbalance forklift, forks pointing +z (the way it drives), origin at the middle of the body on the floor.
 * `driver` is drawn on the seat (legs hidden inside the body).
 */
export function Forklift({ driver }: { driver?: ReactNode }) {
  const postH = 1.0, roofY = 2.15;
  return (
    <group>
      {/* Rear hood with the seat on top, open low deck for the driver's feet, dashboard, counterweight */}
      <Box at={[0, 0.7, -0.65]} size={[1.15, 0.85, 0.8]} m={body} />
      <Box at={[0, 0.5, 0.3]} size={[1.15, 0.45, 1.1]} m={body} />
      <Box at={[0, 0.95, 0.65]} size={[0.9, 0.5, 0.35]} m={body} />
      <Box at={[0, 0.75, -1.0]} size={[1.15, 1.0, 0.35]} m={body} />
      <Box at={[0, 0.32, -0.1]} size={[1.17, 0.16, 2.2]} m={frame} />
      {/* Wheels: big front pair, smaller rear pair */}
      {[-0.5, 0.5].map((x) => <Wheel key={`f${x}`} at={[x, 0.3, 0.6]} r={0.3} />)}
      {[-0.5, 0.5].map((x) => <Wheel key={`r${x}`} at={[x, 0.25, -0.85]} r={0.25} />)}
      {/* Seat and steering wheel */}
      <Box at={[0, 1.17, -0.45]} size={[0.5, 0.1, 0.45]} m={seat} />
      <Box at={[0, 1.42, -0.68]} size={[0.5, 0.45, 0.08]} m={seat} />
      <group position={[0, 1.45, 0.2]} rotation={[-0.9, 0, 0]}>
        <mesh material={seat}>
          <torusGeometry args={[0.14, 0.02, 8, 24]} />
        </mesh>
      </group>
      <Box at={[0, 1.3, 0.28]} size={[0.05, 0.3, 0.05]} m={frame} cast={false} />
      {/* Driver sitting on the seat */}
      {driver && <group position={[0, 0.86, -0.42]} scale={0.8}>{driver}</group>}
      {/* Overhead guard: four posts and a slatted roof */}
      {[-0.52, 0.52].flatMap((x) => [0.4, -0.85].map((z) => (
        <Box key={`${x}${z}`} at={[x, roofY - postH / 2, z]} size={[0.06, postH, 0.06]} m={frame} />
      )))}
      <Box at={[0, roofY, -0.22]} size={[1.12, 0.05, 1.32]} m={frame} />
      {[-0.6, -0.3, 0, 0.3].map((z) => (
        <Box key={z} at={[0, roofY + 0.03, z - 0.07]} size={[1.0, 0.03, 0.06]} m={mat.dark} cast={false} />
      ))}
      {/* Mast: two uprights with cross bars */}
      {[-0.35, 0.35].map((x) => <Box key={x} at={[x, 1.15, 0.95]} size={[0.09, 2.1, 0.12]} m={frame} />)}
      {[0.35, 1.2, 2.1].map((y) => <Box key={y} at={[0, y, 0.95]} size={[0.79, 0.07, 0.08]} m={frame} cast={false} />)}
      {/* Carriage, load backrest bars, forks */}
      <Box at={[0, 0.45, 1.04]} size={[1.0, 0.45, 0.06]} m={frame} />
      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <Box key={x} at={[x, 0.95, 1.04]} size={[0.04, 0.6, 0.04]} m={frame} cast={false} />
      ))}
      <Box at={[0, 1.25, 1.04]} size={[1.0, 0.05, 0.05]} m={frame} cast={false} />
      {[-0.28, 0.28].map((x) => (
        <group key={x}>
          <Box at={[x, 0.33, 1.1]} size={[0.11, 0.55, 0.05]} m={mat.dark} />
          <Box at={[x, 0.06, 1.65]} size={[0.11, 0.04, 1.1]} m={mat.dark} />
        </group>
      ))}
      {/* Warning light on the roof */}
      <mesh position={[0.4, roofY + 0.08, -0.75]}>
        <cylinderGeometry args={[0.04, 0.05, 0.08, 12]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}
