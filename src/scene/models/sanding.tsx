import { B, C, Legs, Panel, mat, usePaint, type ModelProps } from './parts';

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
