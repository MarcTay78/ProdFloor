import * as THREE from 'three';
import { B, C, Panel, mat, usePaint, type ModelProps } from './parts';

export function DrillPress({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const colR = Math.min(0.05, l * 0.07);
  return (
    <>
      <B p={[0, 0.03, 0.05 * w]} s={[l * 0.6, 0.06, w * 0.8]} m={mat.cast} />
      <C p={[0, h * 0.46, w * 0.25]} rad={colR} len={h * 0.88} m={mat.steel} />
      <C p={[0, h * 0.42, -w * 0.05]} rad={Math.min(0.2, l * 0.28)} len={0.04} m={mat.cast} />
      <B p={[0, h * 0.42 - 0.04, w * 0.12]} s={[0.12, 0.05, w * 0.3]} m={mat.cast} />
      <B p={[0, h * 0.8, w * 0.07]} s={[l * 0.45, h * 0.16, w * 0.55]} m={body} />
      <C p={[0, h * 0.95, w * 0.15]} rad={Math.min(0.1, l * 0.14)} len={h * 0.1} m={mat.grey} />
      <C p={[0, h * 0.68, -w * 0.08]} rad={0.035} len={h * 0.08} m={mat.steel} />
      <C p={[0, h * 0.62, -w * 0.08]} rad={0.006} len={0.08} m={mat.blade} />
      {[0, 1, 2].map((i) => (
        <C key={i} p={[l * 0.3, h * 0.8, w * 0.07 + (i - 1) * 0.06]} rad={0.008} len={0.22} m={mat.steel} axis="x" />
      ))}
    </>
  );
}

export function MultiBoring({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.blue);
  const tableY = h * 0.55;
  const heads = Math.max(3, Math.round(l / 0.3));
  return (
    <>
      <B p={[0, tableY / 2, w * 0.1]} s={[l, tableY, w * 0.7]} m={body} />
      <B p={[0, tableY + 0.02, -w * 0.1]} s={[l, 0.04, w * 0.55]} m={mat.cast} />
      <B p={[0, tableY + 0.08, w * 0.1]} s={[l * 0.95, 0.1, 0.04]} m={mat.steel} />
      <B p={[0, h - 0.07, w * 0.25]} s={[l * 0.95, 0.14, w * 0.3]} m={body} />
      {[-0.45, 0.45].map((f, i) => (
        <B key={i} p={[l * f, (tableY + h) / 2, w * 0.3]} s={[0.08, h - tableY, 0.12]} m={body} />
      ))}
      {Array.from({ length: heads }, (_, i) => {
        const x = -l * 0.42 + (i * l * 0.84) / (heads - 1);
        return (
          <group key={i}>
            <B p={[x, h - 0.2, w * 0.15]} s={[0.07, 0.12, 0.1]} m={mat.grey} />
            <C p={[x, h - 0.3, w * 0.15]} rad={0.006} len={0.08} m={mat.blade} />
          </group>
        );
      })}
      {Array.from({ length: 4 }, (_, i) => (
        <C key={i} p={[-l * 0.3 + i * l * 0.2, tableY + 0.22, -w * 0.05]} rad={0.025} len={0.16} m={mat.yellow} />
      ))}
      <Panel p={[l * 0.42, tableY + 0.2, -w * 0.4]} s={[0.2, 0.2, 0.05]} />
    </>
  );
}

const drillTeal = new THREE.MeshStandardMaterial({ color: '#2a9d8f', metalness: 0.25, roughness: 0.45 });
const frameGrey = new THREE.MeshStandardMaterial({ color: '#d9dcd8', metalness: 0.15, roughness: 0.55 });
const ruler = new THREE.MeshStandardMaterial({ color: '#c8402e', metalness: 0.1, roughness: 0.6 });

/** One station: teal pedestal and table, vertical drill column with tall motor, horizontal drill unit on the outer side (s = -1 left, 1 right). */
function DrillStation({ x, s, beamY, h, w }: { x: number; s: -1 | 1; beamY: number; h: number; w: number }) {
  const tableY = beamY + 0.3;
  const colZ = w * 0.18;
  return (
    <group position={[x, 0, 0]}>
      <B p={[0, beamY + 0.15, 0]} s={[0.32, 0.3, w * 0.45]} m={drillTeal} />
      <B p={[0, tableY + 0.02, -w * 0.05]} s={[0.42, 0.04, w * 0.4]} m={drillTeal} />
      <B p={[0, tableY + 0.045, -w * 0.05]} s={[0.36, 0.01, w * 0.34]} m={mat.steel} />
      <C p={[0, (tableY + h * 0.82) / 2, colZ]} rad={0.045} len={h * 0.82 - tableY} m={mat.steel} />
      <B p={[0, tableY + 0.35, colZ - 0.06]} s={[0.18, 0.2, 0.16]} m={drillTeal} />
      <B p={[0, tableY + 0.2, colZ - 0.17]} s={[0.16, 0.1, 0.1]} m={mat.grey} />
      {[-0.05, 0, 0.05].map((dx) => <C key={dx} p={[dx, tableY + 0.12, colZ - 0.17]} rad={0.008} len={0.06} m={mat.blade} />)}
      <C p={[0, h * 0.82 + 0.09, colZ]} rad={0.07} len={0.36} m={mat.dark} />
      <C p={[0.12, tableY + 0.5, colZ - 0.05]} rad={0.08} len={0.02} m={mat.dark} axis="x" />
      <group position={[s * 0.32, tableY - 0.05, -w * 0.05]}>
        <B p={[0, 0, 0]} s={[0.22, 0.16, 0.2]} m={drillTeal} />
        <C p={[s * 0.02, 0.15, 0]} rad={0.08} len={0.2} m={mat.grey} axis="x" />
        <C p={[-s * 0.14, 0.02, 0]} rad={0.025} len={0.1} m={mat.steel} axis="x" />
        <C p={[s * 0.25, -0.02, 0]} rad={0.05} len={0.28} m={frameGrey} axis="x" />
        <C p={[s * 0.42, -0.02, 0]} rad={0.035} len={0.06} m={mat.dark} axis="x" />
      </group>
    </group>
  );
}

/**
 * Multi-head (double-end) drilling machine: grey frame with open lower stretcher and red ruler strip along x,
 * two teal stations each drilling from above and from the outer side, control box and foot pedal.
 */
export function MultiHeadDrill({ l, w, h, color }: ModelProps) {
  const frame = usePaint(color, frameGrey);
  const beamY = Math.min(0.75, h * 0.4);
  const span = l * 0.86;
  // Mirrored in x so that, seen from the front, the control box is on the right as in the reference photo.
  return (
    <group scale={[-1, 1, 1]}>
      <B p={[0, beamY - 0.08, 0]} s={[span, 0.16, w * 0.4]} m={frame} />
      <B p={[0, beamY + 0.005, -w * 0.2 - 0.005]} s={[span * 0.98, 0.04, 0.01]} m={ruler} />
      {[-1, 1].map((e) => (
        <group key={e}>
          <B p={[e * span * 0.32, (beamY - 0.16) / 2, 0]} s={[0.16, beamY - 0.16, w * 0.3]} m={frame} />
          <B p={[e * span * 0.32, 0.04, 0]} s={[0.24, 0.08, w * 0.75]} m={frame} />
        </group>
      ))}
      <B p={[0, 0.2, 0]} s={[span * 0.64, 0.1, 0.12]} m={frame} />
      <DrillStation x={-l * 0.2} s={-1} beamY={beamY} h={h} w={w} />
      <DrillStation x={l * 0.15} s={1} beamY={beamY} h={h} w={w} />
      <B p={[l * 0.33, h * 0.72, w * 0.2]} s={[0.3, 0.24, 0.1]} m={frameGrey} />
      <B p={[l * 0.33, h * 0.72, w * 0.2 - 0.051]} s={[0.24, 0.18, 0.004]} m={mat.cream} />
      {Array.from({ length: 8 }, (_, i) => (
        <C key={i} p={[l * 0.33 - 0.08 + (i % 4) * 0.05, h * 0.75 - Math.floor(i / 4) * 0.06, w * 0.2 - 0.056]} rad={0.012} len={0.012} m={mat.dark} axis="z" />
      ))}
      <C p={[l * 0.33 + 0.1, h * 0.69, w * 0.2 - 0.056]} rad={0.02} len={0.014} m={mat.red} axis="z" />
      <C p={[l * 0.33, (h * 0.6 + beamY) / 2, w * 0.22]} rad={0.02} len={h * 0.6 - beamY} m={mat.steel} />
      <B p={[l * 0.05, 0.04, -w * 0.42]} s={[0.22, 0.08, 0.3]} m={drillTeal} r={[0.15, 0, 0]} />
    </group>
  );
}
