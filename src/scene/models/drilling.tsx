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
