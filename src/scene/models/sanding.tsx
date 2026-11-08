import * as THREE from 'three';
import { B, C, Legs, Panel, mat, usePaint, type ModelProps } from './parts';

const panelGrey = new THREE.MeshStandardMaterial({ color: '#bfc3bd', metalness: 0.2, roughness: 0.55 });
const tableBlue = new THREE.MeshStandardMaterial({ color: '#3a9ad0', metalness: 0.25, roughness: 0.45 });

/**
 * Wide-belt "master" sander: blue base, grey side columns and electrical cabinet, orange band over the feed
 * opening, blue infeed table sticking out at the input end (-x), control strip and e-stop on the operator side.
 */
export function MasterSander({ l, w, h, color }: ModelProps) {
  const base = usePaint(color, mat.blue);
  const tableL = l * 0.22;
  const x0 = -l / 2 + tableL, x1 = l / 2 - l * 0.04;
  const bd = x1 - x0, bx = (x0 + x1) / 2;
  const feedY = Math.min(h * 0.45, 0.95);
  const bandH = 0.14;
  const topY = feedY + 0.08 + bandH;
  const cabTop = h * 0.92;
  const cabH = cabTop - topY;
  return (
    <>
      <B p={[bx, feedY / 2, 0]} s={[bd, feedY, w]} m={base} />
      {[-1, 1].map((s) => <B key={s} p={[bx, (feedY + cabTop) / 2, s * w * 0.45]} s={[bd, cabTop - feedY, w * 0.1]} m={panelGrey} />)}
      {[-1, 1].map((s) => [0.2, 0.3, 0.4].map((f) => (
        <B key={`${s}${f}`} p={[bx + bd * 0.25, feedY + (cabTop - feedY) * f, s * w * 0.501]} s={[bd * 0.3, 0.03, 0.005]} m={mat.dark} />
      )))}
      <B p={[bx, feedY + 0.04, 0]} s={[bd * 1.01, 0.08, w * 0.8]} m={mat.rubber} />
      <B p={[bx, feedY + 0.08 + bandH / 2, 0]} s={[bd * 1.02, bandH, w * 0.8]} m={mat.orange} />
      <B p={[bx, topY + cabH / 2, 0]} s={[bd, cabH, w * 0.8]} m={panelGrey} />
      <B p={[x0 - 0.006, topY + cabH / 2, 0]} s={[0.012, cabH * 0.85, 0.015]} m={mat.dark} />
      <B p={[x0 - 0.02, topY + cabH / 2 - bandH / 2, -w * 0.45]} s={[0.04, cabH + bandH, w * 0.09]} m={mat.dark} />
      {[0.15, 0.35, 0.55].map((f) => <C key={f} p={[x0 - 0.045, topY + cabH * f, -w * 0.45]} rad={0.018} len={0.02} m={mat.grey} axis="x" />)}
      <C p={[x0 - 0.045, feedY + 0.3, -w * 0.45]} rad={0.035} len={0.03} m={mat.red} axis="x" />
      <B p={[-l / 2 + tableL / 2, feedY, 0]} s={[tableL, 0.14, w * 0.72]} m={tableBlue} />
      <B p={[-l / 2 + tableL / 2, feedY + 0.075, 0]} s={[tableL * 0.9, 0.01, w * 0.66]} m={mat.rubber} />
      <C p={[bx, cabTop + 0.04, w * 0.1]} rad={0.12} len={0.08} m={base} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <B key={`${sx}${sz}`} p={[bx + sx * bd * 0.45, 0.02, sz * w * 0.44]} s={[0.08, 0.04, 0.08]} m={mat.wood} />
      )))}
    </>
  );
}

export function BeltSander({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const tableY = h * 0.5;
  const pr = Math.min(0.12, h * 0.1);
  const py = h - pr - 0.02;
  return (
    <>
      <Legs l={l * 0.9} w={w * 0.6} h={tableY} />
      <B p={[0, tableY, -w * 0.12]} s={[l * 0.85, 0.04, w * 0.55]} m={mat.wood} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <B p={[s * l * 0.46, py / 2, w * 0.3]} s={[0.12, py, 0.2]} m={body} />
          <C p={[s * l * 0.46, py, 0]} rad={pr} len={w * 0.4} m={mat.steel} axis="z" />
        </group>
      ))}
      <B p={[0, py + pr, 0]} s={[l * 0.92, 0.01, w * 0.38]} m={mat.rubber} />
      <B p={[0, py - pr, 0]} s={[l * 0.92, 0.01, w * 0.38]} m={mat.rubber} />
      <B p={[0, py, w * 0.3]} s={[l * 0.9, 0.08, 0.06]} m={body} />
      <B p={[0, py - pr - 0.06, 0]} s={[0.25, 0.08, w * 0.3]} m={mat.yellow} />
      <C p={[l * 0.46, h * 0.3, w * 0.3]} rad={0.12} len={0.25} m={mat.grey} axis="z" />
      <Panel p={[-l * 0.35, tableY + 0.2, -w * 0.42]} s={[0.18, 0.14, 0.05]} />
    </>
  );
}

export function WideBeltSander({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.cream);
  const feedY = Math.min(h * 0.42, 0.9);
  return (
    <>
      <B p={[0, feedY / 2, 0]} s={[l * 0.75, feedY, w * 0.6]} m={body} />
      <B p={[0, feedY + 0.03, 0]} s={[l * 0.62, 0.06, w]} m={mat.rubber} />
      <B p={[0, feedY + 0.1 + (h - feedY - 0.1) / 2, w * 0.02]} s={[l * 0.8, h - feedY - 0.1, w * 0.55]} m={body} />
      <B p={[0, feedY + 0.12, -w * 0.25]} s={[l * 0.62, 0.06, 0.02]} m={mat.dark} />
      <B p={[0, h * 0.75, -w * 0.255]} s={[l * 0.6, h * 0.25, 0.01]} m={mat.grey} />
      {[-0.3, 0, 0.3].map((f) => <C key={f} p={[l * f, h - 0.05, w * 0.15]} rad={0.08} len={0.1} m={mat.grey} />)}
      <B p={[l * 0.47, h * 0.6, -w * 0.3]} s={[0.05, 0.05, w * 0.35]} m={mat.dark} />
      <Panel p={[l * 0.47, h * 0.6, -w * 0.47]} s={[0.06, 0.35, 0.06]} />
    </>
  );
}

export function DiscSander({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const r = Math.min(l * 0.35, h * 0.3);
  const cy = h - r - 0.02;
  return (
    <>
      <B p={[0, 0.03, 0]} s={[l * 0.5, 0.06, w * 0.8]} m={mat.cast} />
      <B p={[0, cy / 2, w * 0.1]} s={[l * 0.28, cy, w * 0.4]} m={body} />
      <C p={[0, cy, w * 0.1]} rad={r * 0.45} len={w * 0.35} m={body} axis="z" />
      <C p={[0, cy, -w * 0.12]} rad={r} len={0.03} m={mat.carton} axis="z" seg={40} />
      <B p={[0, cy - r * 0.5, -w * 0.08]} s={[r * 2.1, r, 0.08]} m={body} />
      <B p={[0, cy - r * 0.35, -w * 0.32]} s={[l * 0.7, 0.03, w * 0.3]} m={mat.cast} />
      <C p={[l * 0.3, cy - r * 0.7, w * 0.15]} rad={0.05} len={0.25} m={mat.grey} axis="x" />
    </>
  );
}

export function ProfileSander({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.blue);
  const bedY = h * 0.55;
  const heads = Math.max(2, Math.round(l / 0.6));
  return (
    <>
      <B p={[0, bedY / 2, 0]} s={[l, bedY, w * 0.5]} m={body} />
      <B p={[0, bedY + 0.02, 0]} s={[l, 0.04, w * 0.4]} m={mat.rubber} />
      <B p={[0, h - h * 0.12, 0]} s={[l * 0.85, h * 0.24, w * 0.75]} m={body} />
      {Array.from({ length: heads }, (_, i) => {
        const x = -l * 0.35 + (i * l * 0.7) / (heads - 1);
        return (
          <group key={i}>
            <C p={[x, bedY + 0.18, (i % 2 ? 1 : -1) * w * 0.12]} rad={0.08} len={0.18} m={mat.carton} />
            <C p={[x, bedY + 0.37, (i % 2 ? 1 : -1) * w * 0.12]} rad={0.025} len={0.2} m={mat.steel} />
            <C p={[x, h + 0.0 - 0.03, w * 0.2]} rad={0.05} len={0.06} m={mat.grey} />
          </group>
        );
      })}
      <Panel p={[l * 0.45, bedY + 0.15, -w * 0.42]} s={[0.12, 0.2, 0.05]} />
    </>
  );
}

const abrasive = new THREE.MeshStandardMaterial({ color: '#7a2f22', metalness: 0, roughness: 0.95 });
const sisal = new THREE.MeshStandardMaterial({ color: '#d8c08a', metalness: 0, roughness: 0.95 });
const brushedSteel = new THREE.MeshStandardMaterial({ color: '#d3d7da', metalness: 0.15, roughness: 0.45 });

/**
 * Brush sander: white pedestal, stainless top housing with controls on the front (-z), one shaft along x
 * with a flap-brush drum on each end (abrasive flaps alternating with sisal bristles) and guards behind.
 */
export function BrushSander({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.white);
  const axisY = h * 0.78;
  const r = Math.min(h * 0.17, w * 0.42);
  const bl = l * 0.28;
  const housingTop = Math.min(h, axisY + r * 0.9);
  const housingBot = axisY - r * 0.75;
  const flaps = 16;
  return (
    <>
      <B p={[0, 0.025, 0]} s={[l * 0.36, 0.05, w * 0.85]} m={body} />
      <B p={[0, housingBot / 2, w * 0.05]} s={[l * 0.24, housingBot, w * 0.5]} m={body} />
      <B p={[0, housingBot * 0.45, -w * 0.205]} s={[l * 0.2, housingBot * 0.8, 0.01]} m={mat.cream} />
      <B p={[0, (housingBot + housingTop) / 2, 0]} s={[l * 0.34, housingTop - housingBot, w * 0.8]} m={brushedSteel} />
      <Panel p={[0, axisY, -w * 0.4 - 0.03]} s={[l * 0.14, (housingTop - housingBot) * 0.45, 0.05]} />
      <C p={[0, axisY, 0]} rad={0.025} len={l * 0.96} m={mat.steel} axis="x" />
      {[-1, 1].map((s) => {
        const cx = s * (l / 2 - bl / 2 - 0.02);
        return (
          <group key={s}>
            <C p={[cx, axisY, 0]} rad={r * 0.18} len={bl} m={mat.dark} axis="x" />
            {Array.from({ length: flaps }, (_, i) => (
              <group key={i} position={[cx, axisY, 0]} rotation={[(i * 2 * Math.PI) / flaps, 0, 0]}>
                <B p={[0, r * 0.58, 0]} s={[bl, r * 0.8, 0.018]} m={i % 2 ? sisal : abrasive} />
              </group>
            ))}
            <B p={[cx, axisY + r * 0.2, r + 0.04]} s={[bl * 1.02, r * 1.6, 0.02]} m={mat.dark} />
            <C p={[s * (l / 2 - 0.01), axisY, 0]} rad={r * 0.35} len={0.02} m={mat.red} axis="x" />
          </group>
        );
      })}
    </>
  );
}
