import { B, Bench, C, mat, usePaint, type ModelProps } from './parts';

export function InspectionTable({ l, w, h, color }: ModelProps) {
  const top = usePaint(color, mat.white);
  return (
    <>
      <Bench l={l} w={w} h={h} top={top} />
      {[-1, 1].map((s) => <B key={s} p={[s * l * 0.45, h + 0.35, w * 0.4]} s={[0.04, 0.7, 0.04]} m={mat.dark} />)}
      <B p={[0, h + 0.7, w * 0.4]} s={[l * 0.92, 0.04, 0.12]} m={mat.light} />
      <B p={[-l * 0.25, h + 0.04, 0]} s={[0.4, 0.04, 0.06]} m={mat.wood} />
      <B p={[-l * 0.25, h + 0.04, 0.12]} s={[0.4, 0.04, 0.06]} m={mat.wood} />
      <B p={[l * 0.3, h + 0.06, w * 0.15]} s={[0.25, 0.08, 0.18]} m={mat.blue} />
    </>
  );
}

export function AssemblyStation({ l, w, h, color }: ModelProps) {
  const top = usePaint(color, mat.wood);
  return (
    <>
      <Bench l={l} w={w} h={h} top={top} />
      <B p={[0, h + 0.03, -w * 0.3]} s={[l * 0.9, 0.05, 0.05]} m={mat.yellow} />
      <B p={[0, h + 0.03, w * 0.3]} s={[l * 0.9, 0.05, 0.05]} m={mat.yellow} />
      <B p={[-l * 0.1, h + 0.25, 0]} s={[0.04, 0.45, w * 0.45]} m={mat.woodDark} />
      <B p={[l * 0.1, h + 0.25, 0]} s={[0.04, 0.45, w * 0.45]} m={mat.woodDark} />
      <B p={[0, h + 0.47, 0]} s={[l * 0.24, 0.04, w * 0.45]} m={mat.woodDark} />
      <B p={[0, h + 0.4, w * 0.47]} s={[l * 0.8, 0.8, 0.03]} m={mat.grey} />
      {[-0.3, -0.15, 0.25].map((f) => <B key={f} p={[l * f, h + 0.45, w * 0.44]} s={[0.05, 0.25, 0.04]} m={mat.red} />)}
    </>
  );
}

export function GlueStation({ l, w, h, color }: ModelProps) {
  const top = usePaint(color, mat.steel);
  return (
    <>
      <Bench l={l} w={w} h={h * 0.85} top={top} />
      <C p={[l * 0.3, h * 0.85 + 0.12, w * 0.2]} rad={Math.min(0.14, w * 0.18)} len={0.24} m={mat.white} />
      <B p={[-l * 0.1, h * 0.85 + 0.08, 0]} s={[l * 0.45, 0.14, w * 0.6]} m={mat.grey} />
      <C p={[-l * 0.1, h * 0.85 + 0.16, -w * 0.08]} rad={0.04} len={w * 0.55} m={mat.rubber} axis="z" />
      <C p={[-l * 0.1, h * 0.85 + 0.16, w * 0.08]} rad={0.04} len={w * 0.55} m={mat.steel} axis="z" />
      <C p={[l * 0.42, h * 0.85 + 0.08, -w * 0.3]} rad={0.03} len={0.14} m={mat.orange} />
    </>
  );
}

export function PackingStation({ l, w, h, color }: ModelProps) {
  const top = usePaint(color, mat.wood);
  return (
    <>
      <Bench l={l} w={w} h={h} top={top} />
      <B p={[-l * 0.42, h + 0.25, w * 0.35]} s={[0.04, 0.5, 0.04]} m={mat.dark} />
      <C p={[-l * 0.3, h + 0.45, w * 0.35]} rad={0.08} len={l * 0.3} m={mat.carton} axis="x" />
      <B p={[l * 0.15, h + 0.15, 0]} s={[0.6, 0.3, 0.45]} m={mat.carton} />
      <B p={[l * 0.42, 0.25, w * 0.3]} s={[0.35, 0.5, 0.3]} m={mat.carton} />
      <B p={[l * 0.42, 0.65, w * 0.3]} s={[0.3, 0.3, 0.28]} m={mat.carton} />
    </>
  );
}

export function Generic({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.grey);
  return (
    <>
      <B p={[0, (h * 0.85) / 2, 0]} s={[l * 0.95, h * 0.85, w * 0.95]} m={body} />
      <B p={[0, h * 0.85 + 0.02, 0]} s={[l, 0.04, w]} m={mat.cast} />
      <B p={[0, h * 0.5, -w * 0.48]} s={[l * 0.5, h * 0.3, 0.02]} m={mat.dark} />
      <B p={[l * 0.3, h * 0.92 + 0.02, 0]} s={[l * 0.2, Math.max(0.02, h * 0.08), w * 0.4]} m={mat.yellow} />
    </>
  );
}
