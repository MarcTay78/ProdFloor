import { B, C, Panel, mat, usePaint, type ModelProps } from './parts';

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
