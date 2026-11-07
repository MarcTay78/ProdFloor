import { B, C, Panel, mat, usePaint, type ModelProps } from './parts';

export function Mortiser({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const tableY = h * 0.5;
  return (
    <>
      <B p={[0, tableY * 0.45, 0.05 * w]} s={[l * 0.6, tableY * 0.9, w * 0.6]} m={body} />
      <B p={[0, (h * 0.95) / 2, w * 0.3]} s={[l * 0.22, h * 0.95, w * 0.28]} m={body} />
      <B p={[0, tableY, -w * 0.12]} s={[l, 0.05, w * 0.5]} m={mat.cast} />
      <B p={[0, tableY + 0.1, w * 0.05]} s={[l * 0.9, 0.15, 0.04]} m={mat.steel} />
      <B p={[l * 0.3, tableY + 0.1, -w * 0.25]} s={[0.12, 0.12, 0.1]} m={mat.yellow} />
      <B p={[0, h * 0.74, -w * 0.02]} s={[l * 0.35, h * 0.18, w * 0.4]} m={body} />
      <C p={[0, h * 0.62, -w * 0.12]} rad={0.015} len={h * 0.08} m={mat.blade} />
      <C p={[0, h * 0.9, -w * 0.02]} rad={Math.min(0.12, l * 0.12)} len={h * 0.14} m={mat.grey} />
      <C p={[l * 0.22, h * 0.75, -w * 0.15]} rad={0.012} len={0.35} m={mat.steel} axis="x" />
      <Panel p={[-l * 0.32, tableY * 0.8, -w * 0.2]} s={[0.14, 0.14, 0.05]} />
    </>
  );
}

export function Tenoner({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.blue);
  const bedY = h * 0.5;
  return (
    <>
      <B p={[0, bedY / 2, w * 0.1]} s={[l, bedY, w * 0.55]} m={body} />
      <B p={[0, bedY + 0.03, -w * 0.32]} s={[l * 0.75, 0.06, w * 0.3]} m={mat.steel} />
      <B p={[0, bedY - 0.08, -w * 0.32]} s={[l * 0.8, 0.1, w * 0.1]} m={mat.dark} />
      <B p={[-l * 0.25, bedY + 0.12, -w * 0.3]} s={[0.05, 0.12, w * 0.32]} m={mat.yellow} />
      {[-0.22, 0.22].map((fx, i) => (
        <group key={i}>
          <B p={[l * fx, bedY + (h - bedY) * 0.42, w * 0.12]} s={[l * 0.24, (h - bedY) * 0.84, w * 0.5]} m={body} />
          <B p={[l * fx, bedY + (h - bedY) * 0.6, -w * 0.15]} s={[l * 0.2, (h - bedY) * 0.35, 0.05]} m={mat.yellow} />
          <C p={[l * fx, h - 0.08, w * 0.15]} rad={0.07} len={0.16} m={mat.grey} />
        </group>
      ))}
      <Panel p={[l * 0.45, bedY + 0.3, -w * 0.1]} s={[0.1, 0.3, 0.25]} />
    </>
  );
}
