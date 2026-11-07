import { B, C, Panel, RollerBed, mat, usePaint, type ModelProps } from './parts';

export function SurfacePlaner({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const topY = h * 0.85;
  return (
    <>
      <B p={[0, topY / 2, 0.05 * w]} s={[l * 0.5, topY, w * 0.6]} m={body} />
      <B p={[-l * 0.26, topY + 0.02, 0]} s={[l * 0.46, 0.05, w * 0.7]} m={mat.cast} />
      <B p={[l * 0.26, topY + 0.03, 0]} s={[l * 0.46, 0.05, w * 0.7]} m={mat.cast} />
      <C p={[0, topY, 0]} rad={0.05} len={w * 0.65} m={mat.blade} axis="z" />
      <B p={[0, topY + 0.07, -w * 0.1]} s={[0.18, 0.04, w * 0.45]} m={mat.yellow} />
      <B p={[l * 0.1, h - 0.05, w * 0.32]} s={[l * 0.6, 0.12, 0.04]} m={mat.steel} />
      <C p={[l * 0.1, topY * 0.4, w * 0.4]} rad={0.07} len={0.2} m={mat.grey} axis="z" />
      <Panel p={[-l * 0.2, topY * 0.6, -w * 0.26]} s={[0.15, 0.12, 0.04]} />
    </>
  );
}

export function ThicknessPlaner({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const tableY = h * 0.55;
  return (
    <>
      <B p={[0, tableY / 2, 0]} s={[l * 0.5, tableY, w * 0.8]} m={body} />
      <B p={[0, tableY + 0.02, 0]} s={[l, 0.04, w * 0.6]} m={mat.cast} />
      <B p={[0, tableY + (h - tableY) / 2 + 0.05, 0]} s={[l * 0.45, h - tableY - 0.1, w]} m={body} />
      <B p={[-l * 0.23, tableY + 0.12, 0]} s={[0.02, 0.1, w * 0.55]} m={mat.dark} />
      <C p={[0, h - 0.05, w * 0.25]} rad={0.08} len={0.1} m={mat.grey} />
      <C p={[l * 0.24, tableY + 0.3, -w * 0.45]} rad={0.1} len={0.03} m={mat.steel} axis="z" />
      <Panel p={[-l * 0.24, tableY + 0.3, -w * 0.45]} s={[0.12, 0.14, 0.04]} />
    </>
  );
}

export function FourSidedMoulder({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.cream);
  const bedY = h * 0.5;
  const heads = 5;
  return (
    <>
      <group position={[-l * 0.38, 0, 0]}>
        <RollerBed l={l * 0.24} w={w * 0.35} h={bedY} />
      </group>
      <B p={[l * 0.12, bedY / 2, 0]} s={[l * 0.76, bedY, w * 0.75]} m={body} />
      <B p={[l * 0.12, bedY + (h - bedY) / 2, w * 0.05]} s={[l * 0.76, h - bedY, w * 0.7]} m={body} />
      <B p={[l * 0.12, bedY + (h - bedY) * 0.45, -w * 0.31]} s={[l * 0.7, (h - bedY) * 0.6, 0.02]} m={mat.glass} />
      <B p={[l * 0.12, bedY + 0.03, -w * 0.2]} s={[l * 0.74, 0.04, w * 0.15]} m={mat.cast} />
      {Array.from({ length: heads }, (_, i) => (
        <C key={i} p={[-l * 0.18 + i * l * 0.14, h + 0.0 - 0.08, w * 0.15]} rad={0.07} len={0.16} m={mat.grey} />
      ))}
      <B p={[l * 0.12, h - 0.02, -w * 0.05]} s={[l * 0.74, 0.04, 0.12]} m={mat.yellow} />
      <Panel p={[l * 0.48, bedY + 0.35, -w * 0.4]} s={[0.25, 0.3, 0.06]} />
    </>
  );
}
