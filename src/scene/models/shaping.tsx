import { B, C, Panel, mat, usePaint, type ModelProps } from './parts';

export function SpindleMoulder({ l, w, h, color, copyArm }: ModelProps & { copyArm?: boolean }) {
  const body = usePaint(color, mat.green);
  const topY = Math.min(h * 0.78, 0.92);
  return (
    <>
      <B p={[0, topY / 2, 0]} s={[l * 0.75, topY, w * 0.75]} m={body} />
      <B p={[0, topY + 0.025, 0]} s={[l, 0.05, w]} m={mat.cast} />
      <B p={[0, topY + 0.1, 0]} s={[l * 0.2, 0.12, w * 0.2]} m={mat.yellow} />
      <B p={[-l * 0.22, topY + 0.08, w * 0.08]} s={[l * 0.32, 0.1, 0.04]} m={mat.steel} />
      <B p={[l * 0.22, topY + 0.08, w * 0.08]} s={[l * 0.32, 0.1, 0.04]} m={mat.steel} />
      <C p={[0, topY + (h - topY) * 0.6, w * 0.2]} rad={0.06} len={(h - topY) * 0.8} m={mat.grey} />
      {copyArm ? (
        <>
          <B p={[0, topY + 0.04, -w * 0.2]} s={[l * 0.5, 0.03, w * 0.35]} m={mat.wood} />
          <B p={[l * 0.4, (h + topY) / 2, w * 0.35]} s={[0.08, h - topY, 0.08]} m={mat.dark} />
          <B p={[l * 0.2, h - 0.04, w * 0.15]} s={[l * 0.45, 0.06, 0.06]} m={mat.dark} />
        </>
      ) : (
        <>
          <B p={[l * 0.35, topY + (h - topY) * 0.5, w * 0.35]} s={[0.06, h - topY, 0.06]} m={mat.dark} />
          <B p={[l * 0.15, h - 0.08, w * 0.1]} s={[l * 0.3, 0.14, 0.16]} m={mat.orange} />
        </>
      )}
      <Panel p={[-l * 0.3, topY * 0.6, -w * 0.38]} s={[0.15, 0.14, 0.04]} />
    </>
  );
}

export function Shaper(p: ModelProps) {
  return <SpindleMoulder {...p} copyArm />;
}

export function Router({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const tableY = h * 0.52;
  return (
    <>
      <B p={[0, tableY / 2, w * 0.05]} s={[l * 0.6, tableY, w * 0.6]} m={body} />
      <B p={[0, tableY + 0.02, -w * 0.05]} s={[l * 0.9, 0.04, w * 0.85]} m={mat.cast} />
      <B p={[0, (tableY + h) / 2, w * 0.38]} s={[l * 0.22, h - tableY, w * 0.22]} m={body} />
      <B p={[0, h - 0.07, w * 0.05]} s={[l * 0.22, 0.14, w * 0.85]} m={body} />
      <C p={[0, h - 0.25, -w * 0.25]} rad={0.08} len={0.3} m={mat.grey} />
      <C p={[0, h - 0.43, -w * 0.25]} rad={0.02} len={0.08} m={mat.blade} />
      <B p={[l * 0.35, tableY + 0.03, -w * 0.3]} s={[0.08, 0.02, 0.08]} m={mat.yellow} />
      <Panel p={[-l * 0.3, tableY * 0.7, -w * 0.28]} s={[0.14, 0.14, 0.04]} />
    </>
  );
}

export function CncRouter({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.white);
  const bedY = h * 0.42;
  const gx = -l * 0.05;
  return (
    <>
      <B p={[0, bedY / 2 - 0.02, 0]} s={[l * 0.92, bedY - 0.04, w * 0.8]} m={mat.blue} />
      <B p={[0, bedY - 0.02, 0]} s={[l * 0.9, 0.04, w * 0.78]} m={mat.cream} />
      {Array.from({ length: 6 }, (_, i) => (
        <B key={i} p={[0, bedY + 0.001, -w * 0.33 + i * w * 0.13]} s={[l * 0.88, 0.003, 0.01]} m={mat.dark} />
      ))}
      <B p={[0, bedY + 0.03, -w * 0.42]} s={[l * 0.92, 0.06, 0.06]} m={mat.steel} />
      <B p={[0, bedY + 0.03, w * 0.42]} s={[l * 0.92, 0.06, 0.06]} m={mat.steel} />
      <B p={[gx, (bedY + h) / 2, -w * 0.43]} s={[l * 0.08, h - bedY, w * 0.07]} m={body} />
      <B p={[gx, (bedY + h) / 2, w * 0.43]} s={[l * 0.08, h - bedY, w * 0.07]} m={body} />
      <B p={[gx, h - 0.1, 0]} s={[l * 0.09, 0.2, w * 0.92]} m={body} />
      <B p={[gx - l * 0.06, h - 0.32, 0]} s={[0.18, 0.4, 0.2]} m={mat.grey} />
      <C p={[gx - l * 0.06, h - 0.62, 0]} rad={0.05} len={0.22} m={mat.steel} />
      <C p={[gx - l * 0.06, bedY + 0.13, 0]} rad={0.012} len={0.06} m={mat.blade} />
      <B p={[0, h - 0.03, w * 0.47]} s={[l * 0.8, 0.06, 0.05]} m={mat.dark} />
      <Panel p={[l * 0.48, h * 0.55, -w * 0.45]} s={[0.04, 0.35, 0.1]} />
      <B p={[l * 0.48, h * 0.25, -w * 0.45]} s={[0.04, h * 0.5, 0.06]} m={mat.dark} />
    </>
  );
}
