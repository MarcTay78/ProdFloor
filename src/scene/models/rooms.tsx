import { B, C, ShelfRack, mat, usePaint, type ModelProps } from './parts';

const T = 0.06;

export function SprayBooth({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.white);
  const roofY = h - 0.4;
  return (
    <>
      <B p={[0, 0.01, 0]} s={[l, 0.02, w]} m={mat.filter} />
      <B p={[0, roofY / 2, w / 2 - T / 2]} s={[l, roofY, T]} m={body} />
      <B p={[-l / 2 + T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[l / 2 - T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[0, roofY + T / 2, 0]} s={[l, T, w]} m={body} />
      <B p={[0, roofY * 0.5, w / 2 - T - 0.05]} s={[l * 0.9, roofY * 0.85, 0.08]} m={mat.filter} />
      {[-1, 1].map((s) => <B key={s} p={[s * (l / 2 - T - 0.01), roofY * 0.6, 0]} s={[0.02, roofY * 0.5, w * 0.5]} m={mat.light} />)}
      <B p={[0, roofY + 0.18, w * 0.25]} s={[l * 0.3, 0.3, w * 0.3]} m={mat.grey} />
      <C p={[l * 0.3, roofY + 0.2, w * 0.25]} rad={0.18} len={0.4} m={mat.steel} />
      <B p={[0, roofY * 0.5, -w / 2 + 0.02]} s={[l, 0.04, 0.04]} m={mat.yellow} />
    </>
  );
}

export function DryingRoom({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.grey);
  const roofY = h - 0.35;
  const doorW = Math.min(1.6, l * 0.3);
  const frontSeg = (l - doorW) / 2;
  return (
    <>
      <B p={[0, roofY / 2, w / 2 - T / 2]} s={[l, roofY, T]} m={body} />
      <B p={[-l / 2 + T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[l / 2 - T / 2, roofY / 2, 0]} s={[T, roofY, w]} m={body} />
      <B p={[-l / 2 + frontSeg / 2, roofY / 2, -w / 2 + T / 2]} s={[frontSeg, roofY, T]} m={body} />
      <B p={[l / 2 - frontSeg / 2, roofY / 2, -w / 2 + T / 2]} s={[frontSeg, roofY, T]} m={mat.glass} />
      <B p={[-l * 0.0, roofY * 0.5, -w / 2 + T / 2]} s={[doorW, roofY, T * 0.8]} m={mat.orange} />
      <B p={[0, roofY + T / 2, 0]} s={[l, T, w]} m={body} />
      <group position={[l * 0.22, 0, 0]}>
        <ShelfRack l={l * 0.4} w={w * 0.6} h={roofY * 0.9} levels={5} frame={mat.steel} beam={mat.steel} />
      </group>
      <B p={[-l * 0.25, roofY + 0.17, w * 0.2]} s={[l * 0.25, 0.28, w * 0.35]} m={mat.steel} />
      <C p={[-l * 0.25, roofY + 0.2, -w * 0.15]} rad={0.15} len={0.3} m={mat.grey} />
    </>
  );
}
