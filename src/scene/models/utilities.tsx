import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { activeLayout, useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { B, C, Legs, Panel, mat, usePaint, type ModelProps } from './parts';

export function DustCollector({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.grey);
  const r = Math.min(l * 0.2, w * 0.4);
  const cx = l * 0.25;
  return (
    <>
      <B p={[-l * 0.2, h * 0.55, 0]} s={[l * 0.5, h * 0.6, w * 0.85]} m={body} />
      {[-1, 1].map((s) => [-1, 1].map((t) => (
        <B key={`${s}${t}`} p={[-l * 0.2 + s * l * 0.22, h * 0.125, t * w * 0.38]} s={[0.08, h * 0.25, 0.08]} m={mat.dark} />
      )))}
      <C p={[-l * 0.2, h * 0.18, 0]} rad={l * 0.18} rad2={0.12} len={h * 0.1} m={body} />
      <B p={[-l * 0.2, 0.25, 0]} s={[0.5, 0.5, 0.5]} m={mat.dark} />
      <C p={[cx, h * 0.62, 0]} rad={r} len={h * 0.36} m={mat.steel} />
      <C p={[cx, h * 0.33, 0]} rad={0.08} rad2={r} len={h * 0.22} m={mat.steel} />
      <C p={[cx, h * 0.12, 0]} rad={0.25} len={h * 0.2} m={mat.dark} />
      <B p={[0, h - 0.15, 0]} s={[l * 0.4, 0.3, w * 0.4]} m={mat.blue} />
      <C p={[cx, h * 0.87, -w * 0.3]} rad={0.12} len={w * 0.4} m={mat.steel} axis="z" />
      <Panel p={[-l * 0.2, h * 0.4, -w * 0.45]} s={[0.25, 0.3, 0.05]} />
    </>
  );
}

export function AirCompressor({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.red);
  const r = Math.min(w * 0.4, h * 0.3);
  return (
    <>
      <B p={[0, 0.05, 0]} s={[l, 0.1, w * 0.9]} m={mat.dark} />
      <C p={[0, 0.12 + r, 0]} rad={r} len={l * 0.9} m={body} axis="x" seg={32} />
      <B p={[-l * 0.2, 0.12 + 2 * r + (h - 0.12 - 2 * r) / 2, 0]} s={[l * 0.3, h - 0.12 - 2 * r, w * 0.5]} m={mat.grey} />
      <C p={[l * 0.18, 0.12 + 2 * r + 0.1, 0]} rad={Math.min(0.12, w * 0.15)} len={0.2} m={mat.blue} />
      <B p={[0, 0.12 + 2 * r + 0.1, -w * 0.3]} s={[l * 0.5, 0.18, 0.04]} m={mat.yellow} />
      <C p={[l * 0.35, 0.12 + 2 * r + 0.06, w * 0.1]} rad={0.04} len={0.06} m={mat.white} />
    </>
  );
}

const ROOF_GAP = 0.5; // highest track: this far below the ceiling
const HOOK_PITCH = 0.5; // m between trolleys
const HOOK_SPEED = 0.3; // m/s along the track during Play
const PART_LEN = 1.0;
const V = (x: number, z: number, y = 0) => new THREE.Vector3(x, y, z);

/** Ceiling height of the active layout; overhead hangers run up to it. */
const useCeiling = () => useProjectStore((s) => activeLayout(s.project).factory.ceilingHeight);

/** Straight overhead conveyor segment along the length; entry at -x end, exit at +x end. */
export function OverheadConveyor({ l, w, h, color, reverse }: ModelProps) {
  const curve = useMemo(() => new THREE.LineCurve3(V(-l / 2, 0), V(l / 2, 0)), [l]);
  return <OverheadLine curve={curve} w={Math.min(w, 0.8)} h={h} color={color} reverse={reverse} />;
}

/** 90° overhead bend: enters at the middle of the left (-x) edge, leaves at the middle of the back (+z) edge. Rotate for other turns. */
export function OverheadConveyorBend({ l, w, h, color, reverse }: ModelProps) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => {
    const a = (i / 16) * (Math.PI / 2);
    return V(-l / 2 + (l / 2) * Math.sin(a), w / 2 - (w / 2) * Math.cos(a));
  })), [l, w]);
  return <OverheadLine curve={curve} w={0.6} h={h} color={color} reverse={reverse} />;
}

/** S-shaped slope along the length between track height h and h + rise (default: up to 0.5 m under the ceiling). */
function useSlope(l: number, h: number, down: boolean, riseSet?: number) {
  const ceiling = useCeiling(); // always called: hooks can't sit behind ??
  const rise = Math.max(0, riseSet ?? ceiling - ROOF_GAP - h);
  return useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => {
    const u = i / 16, s = u * u * (3 - 2 * u);
    return V(-l / 2 + u * l, 0, rise * (down ? 1 - s : s));
  })), [l, rise, down]);
}

/** Overhead drop: enters at the top level under the roof (-x end), comes down to track height h (+x end). */
export function OverheadConveyorDown({ l, w, h, color, rise, reverse }: ModelProps) {
  return <OverheadLine curve={useSlope(l, h, true, rise)} w={Math.min(w, 0.8)} h={h} color={color} reverse={reverse} />;
}

/** Overhead rise: enters at track height h (-x end), climbs to the top level under the roof (+x end). */
export function OverheadConveyorUp({ l, w, h, color, rise, reverse }: ModelProps) {
  return <OverheadLine curve={useSlope(l, h, false, rise)} w={Math.min(w, 0.8)} h={h} color={color} reverse={reverse} />;
}

/**
 * Overhead hanging conveyor: red track at height h (plus the curve's own y on slopes) following `curve`, hanger rods
 * up to the ceiling, trolleys every 0.5 m carrying hooks with parts (e.g. chair legs) hanging 1.2 m below the track.
 * During Play the trolleys run along the track from the curve's start to its end (end to start when reversed).
 */
function OverheadLine({ curve, w, h, color, reverse }: { curve: THREE.Curve<THREE.Vector3>; w: number; h: number; color?: string; reverse?: boolean }) {
  const track = usePaint(color, mat.red);
  const animating = useUiStore((s) => s.animating);
  const speed = useUiStore((s) => s.animSpeed);
  const ceiling = useCeiling();
  const trackY = h, barY = trackY - 1.2;
  const len = curve.getLength();
  const n = Math.max(1, Math.floor(len / HOOK_PITCH));
  const hangers = Math.max(2, Math.ceil(len / 2) + 1);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.06, 8), [curve]);
  const trolleys = useRef<(THREE.Group | null)[]>([]);
  const clock = useRef(0);

  // Positions set per frame (no React re-render); stopped = clock 0 = rest positions. Hooks hang plumb on slopes.
  useFrame((_, dt) => {
    clock.current = animating ? clock.current + Math.min(dt, 0.1) * speed : 0;
    const shift = ((clock.current * HOOK_SPEED) % (len / n)) / len;
    trolleys.current.forEach((g, i) => {
      if (!g) return;
      const u = ((i + 0.5) / n + (reverse ? 1 - shift : shift)) % 1;
      const p = curve.getPointAt(u), t = curve.getTangentAt(u);
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = Math.atan2(-t.z, t.x);
    });
  });

  return (
    <>
      {/* Roof hangers: plate on the ceiling, rod down to a clamp on the track */}
      {Array.from({ length: hangers }, (_, i) => {
        const p = curve.getPointAt(0.03 + (i * 0.94) / (hangers - 1));
        const top = trackY + p.y + 0.1, rod = Math.max(0.05, ceiling - top);
        return (
          <group key={i} position={[p.x, 0, p.z]}>
            <B p={[0, ceiling - 0.01, 0]} s={[0.2, 0.02, 0.2]} m={mat.grey} />
            <C p={[0, top + rod / 2, 0]} rad={0.012} len={rod} m={mat.steel} seg={8} />
            <B p={[0, top - 0.02, 0]} s={[0.12, 0.04, 0.12]} m={mat.grey} />
          </group>
        );
      })}
      <mesh geometry={tube} material={track} position={[0, trackY, 0]} castShadow />
      {/* Trolleys, hook rods, cross bars and hanging parts */}
      {Array.from({ length: n }, (_, i) => (
        <group key={i} ref={(g) => { trolleys.current[i] = g; }}>
          <B p={[0, trackY - 0.09, 0]} s={[0.1, 0.06, 0.06]} m={mat.dark} />
          <C p={[0, (trackY - 0.12 + barY) / 2, 0]} rad={0.008} len={trackY - 0.12 - barY} m={mat.steel} seg={6} />
          <B p={[0, barY, 0]} s={[0.03, 0.03, w * 0.8]} m={mat.steel} />
          {[-1, 0, 1].map((s) => (
            <B key={s} p={[0, barY - 0.02 - PART_LEN / 2, s * w * 0.3]} s={[0.04, PART_LEN, 0.03]} m={mat.dark} r={[s * 0.06, 0, 0]} />
          ))}
        </group>
      ))}
    </>
  );
}

/** Gravity/powered roller conveyor: galvanised side rails, rollers across the width, legs with braces, drive box below. Flow runs along the length. */
export function RollerConveyor({ l, w, h, color }: ModelProps) {
  const frame = usePaint(color, mat.grey);
  const top = h - 0.03; // roller tops
  const pitch = 0.1;
  const n = Math.max(2, Math.floor((l - 0.06) / pitch));
  const railH = 0.14, legH = h - railH;
  return (
    <>
      {/* Side rails (channels) */}
      {[-1, 1].map((s) => (
        <B key={s} p={[0, h - railH / 2, s * (w / 2 - 0.025)]} s={[l, railH, 0.05]} m={frame} />
      ))}
      {/* Rollers across the width */}
      {Array.from({ length: n }, (_, i) => (
        <C key={i} p={[-l / 2 + 0.03 + pitch / 2 + i * ((l - 0.06 - pitch) / Math.max(1, n - 1)), top - 0.03, 0]} rad={0.03} len={w - 0.1} m={mat.steel} axis="z" seg={16} />
      ))}
      {/* Legs with foot plates, side and cross braces */}
      <Legs l={l * 0.85} w={w - 0.02} h={legH} t={0.05} inset={0.03} m={frame} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <B key={`${sx}${sz}`} p={[sx * (l * 0.425 - 0.055), 0.005, sz * (w / 2 - 0.055)]} s={[0.12, 0.01, 0.12]} m={mat.dark} />
      )))}
      {[-1, 1].map((s) => <B key={`b${s}`} p={[0, 0.2, s * (w / 2 - 0.055)]} s={[l * 0.85 - 0.06, 0.04, 0.04]} m={frame} />)}
      <B p={[l * 0.425 - 0.055, 0.2, 0]} s={[0.04, 0.04, w - 0.1]} m={frame} />
      {/* Drive box under one end and a black end-stop roller */}
      <B p={[-l * 0.15, h - railH - 0.13, 0]} s={[l * 0.35, 0.2, w * 0.55]} m={mat.grey} />
      <C p={[l / 2 - 0.08, top + 0.07, -w / 2 + 0.12]} rad={0.05} len={0.22} m={mat.rubber} axis="z" />
    </>
  );
}
