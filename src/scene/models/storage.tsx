import { B, ShelfRack, mat, usePaint, type ModelProps } from './parts';

export function TimberRack({ l, w, h, color }: ModelProps) {
  const frame = usePaint(color, mat.blue);
  const cols = Math.max(2, Math.round(l / 1.5) + 1);
  const levels = Math.max(2, Math.round(h / 0.8));
  const xs = Array.from({ length: cols }, (_, i) => -l / 2 + 0.06 + (i * (l - 0.12)) / (cols - 1));
  return (
    <>
      {xs.map((x, i) => (
        <group key={i}>
          <B p={[x, h / 2, w / 2 - 0.08]} s={[0.12, h, 0.16]} m={frame} />
          <B p={[x, 0.05, 0]} s={[0.14, 0.1, w]} m={frame} />
          {Array.from({ length: levels }, (_, j) => (
            <B key={j} p={[x, 0.3 + (j * (h - 0.4)) / levels, -0.02]} s={[0.08, 0.06, w - 0.16]} m={frame} />
          ))}
        </group>
      ))}
      {Array.from({ length: levels }, (_, j) => (
        <group key={j}>
          {Array.from({ length: 4 }, (_, k) => (
            <B
              key={k}
              p={[0, 0.3 + (j * (h - 0.4)) / levels + 0.06 + k * 0.045, -0.04]}
              s={[l * 0.97 - (k % 2) * 0.2, 0.04, (w - 0.3) * 0.95]}
              m={k % 2 ? mat.woodDark : mat.wood}
            />
          ))}
        </group>
      ))}
    </>
  );
}

export function WipRack({ l, w, h, color }: ModelProps) {
  const frame = usePaint(color, mat.blue);
  const levels = Math.max(2, Math.round(h / 0.5));
  return (
    <>
      <ShelfRack l={l} w={w} h={h} levels={levels} frame={frame} />
      {Array.from({ length: levels }, (_, j) => (
        <group key={j}>
          {Array.from({ length: Math.max(1, Math.floor(l / 0.6)) }, (_, k) => (
            <B
              key={k}
              p={[-l / 2 + 0.35 + k * 0.6, 0.12 + (j * (h - 0.2)) / levels + 0.13, 0]}
              s={[0.45, 0.16 + ((j + k) % 3) * 0.03, w * 0.6]}
              m={(j + k) % 2 ? mat.wood : mat.orange}
            />
          ))}
        </group>
      ))}
    </>
  );
}

export function FinishedGoodsRack({ l, w, h, color }: ModelProps) {
  const frame = usePaint(color, mat.blue);
  const levels = Math.max(2, Math.round(h / 1.0));
  const bays = Math.max(1, Math.round(l / 2.7));
  const bayL = l / bays;
  return (
    <>
      <ShelfRack l={l} w={w} h={h} levels={levels} frame={frame} />
      {Array.from({ length: levels }, (_, j) => {
        const y = 0.12 + (j * (h - 0.2)) / levels + 0.06;
        const boxH = Math.min(0.6, (h - 0.2) / levels - 0.2);
        return Array.from({ length: bays * 2 }, (_, k) => {
          const x = -l / 2 + (k + 0.5) * (bayL / 2);
          return (
            <group key={`${j}-${k}`}>
              <B p={[x, y + 0.07, 0]} s={[bayL / 2 - 0.15, 0.12, w - 0.15]} m={mat.wood} />
              <B p={[x, y + 0.13 + boxH / 2, 0]} s={[bayL / 2 - 0.2, boxH, w - 0.25]} m={mat.carton} />
            </group>
          );
        });
      })}
    </>
  );
}
