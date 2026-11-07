import { B, C, Panel, RollerBed, mat, usePaint, type ModelProps } from './parts';

export function Bandsaw({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const tableY = h * 0.45;
  const r = Math.min(l * 0.38, h * 0.16);
  const lowY = tableY - r - 0.03, upY = h - r;
  return (
    <>
      <B p={[0.05 * l, lowY / 2 + 0.01, 0.05 * w]} s={[l * 0.6, lowY, w * 0.6]} m={body} />
      <C p={[0, lowY, 0.05 * w]} rad={r} len={w * 0.35} m={body} axis="z" seg={32} />
      <C p={[0, upY, 0.05 * w]} rad={r} len={w * 0.35} m={body} axis="z" seg={32} />
      <B p={[r * 0.7, (lowY + upY) / 2, 0.12 * w]} s={[l * 0.16, upY - lowY, w * 0.22]} m={body} />
      <B p={[0, tableY, -0.05 * w]} s={[l, 0.04, w * 0.8]} m={mat.cast} />
      <B p={[-r, (tableY + upY) / 2, -0.12 * w]} s={[0.012, upY - tableY, 0.03]} m={mat.blade} />
      <B p={[-r, tableY + 0.18, -0.12 * w]} s={[0.05, 0.2, 0.07]} m={mat.yellow} />
      <B p={[l * 0.25, tableY + 0.03, -0.05 * w]} s={[0.03, 0.05, w * 0.7]} m={mat.steel} />
      <C p={[l * 0.25, lowY * 0.5, w * 0.42]} rad={Math.min(0.12, w * 0.14)} len={0.3} m={mat.grey} axis="z" />
      <Panel p={[l * 0.35, tableY + 0.25, -0.2 * w]} s={[0.12, 0.14, 0.05]} />
    </>
  );
}

export function TableSaw({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const topY = h * 0.88;
  const rad = Math.min(0.15, h * 0.2, l * 0.08);
  return (
    <>
      <B p={[0, topY / 2, 0.05 * w]} s={[l * 0.42, topY, w * 0.5]} m={body} />
      <B p={[0, topY + 0.025, 0.05 * w]} s={[l * 0.55, 0.05, w * 0.6]} m={mat.cast} />
      <C p={[0, topY + 0.02, 0]} rad={rad} len={0.006} m={mat.blade} axis="z" seg={40} />
      <B p={[0, h - 0.04, 0]} s={[rad * 2.2, 0.06, 0.08]} m={mat.yellow} />
      <B p={[0, topY - 0.05, -w * 0.38]} s={[l, 0.06, w * 0.2]} m={mat.steel} />
      <B p={[-l * 0.2, topY - 0.01, -w * 0.38]} s={[l * 0.45, 0.04, w * 0.22]} m={mat.grey} />
      <B p={[l * 0.1, topY + 0.07, 0.25 * w]} s={[l * 0.5, 0.08, 0.04]} m={mat.steel} />
      <B p={[l * 0.38, topY + 0.02, 0.05 * w]} s={[l * 0.24, 0.04, w * 0.55]} m={mat.cast} />
      <B p={[l * 0.47, topY / 2, 0.05 * w]} s={[0.05, topY, 0.05]} m={mat.dark} />
      <B p={[-l * 0.45, (topY - 0.08) / 2, -w * 0.38]} s={[0.06, topY - 0.08, 0.06]} m={mat.dark} />
      <Panel p={[-l * 0.12, topY * 0.7, -w * 0.21]} s={[0.18, 0.14, 0.05]} />
    </>
  );
}

export function CrosscutSaw({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.yellow);
  const bedH = h * 0.55;
  return (
    <>
      <RollerBed l={l} w={w} h={bedH} />
      <B p={[0, bedH + (h - bedH) / 2, 0]} s={[l * 0.16, h - bedH, w * 0.9]} m={body} />
      <B p={[0, bedH + 0.05, 0]} s={[l * 0.2, 0.1, w * 0.95]} m={mat.dark} />
      <C p={[l * 0.06, h - 0.12, w * 0.3]} rad={0.08} len={0.22} m={mat.grey} axis="y" />
      <B p={[0, bedH + 0.06, w * 0.4]} s={[l * 0.9, 0.12, 0.04]} m={mat.steel} />
      <Panel p={[-l * 0.12, bedH + 0.3, -w * 0.45]} s={[0.25, 0.2, 0.06]} />
    </>
  );
}

export function RipSaw({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.blue);
  const bedH = h * 0.5;
  return (
    <>
      <B p={[0, bedH / 2, 0]} s={[l * 0.9, bedH, w * 0.75]} m={body} />
      <B p={[0, bedH + 0.02, 0]} s={[l, 0.04, w * 0.6]} m={mat.cast} />
      <B p={[0, bedH + 0.05, 0]} s={[l * 0.95, 0.03, w * 0.2]} m={mat.rubber} />
      <B p={[0, bedH + (h - bedH) * 0.45, 0]} s={[l * 0.38, (h - bedH) * 0.9, w * 0.85]} m={body} />
      {[-1, 0, 1].map((i) => (
        <C key={i} p={[i * l * 0.12, bedH + 0.12, 0]} rad={0.08} len={w * 0.3} m={mat.steel} axis="z" />
      ))}
      <C p={[0, h - 0.06, w * 0.2]} rad={0.1} len={0.12} m={mat.grey} />
      <C p={[l * 0.12, h - 0.15, -w * 0.25]} rad={0.07} len={0.3} m={mat.steel} axis="x" />
      <Panel p={[l * 0.3, bedH + 0.35, -w * 0.45]} s={[0.25, 0.25, 0.06]} />
    </>
  );
}
