import * as THREE from 'three';
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

const pine = new THREE.MeshStandardMaterial({ color: '#d9a77c', metalness: 0, roughness: 0.85 });
const endGrain = new THREE.MeshStandardMaterial({ color: '#cf9468', metalness: 0, roughness: 0.9 });
const groove = new THREE.MeshStandardMaterial({ color: '#7a5233', metalness: 0, roughness: 0.95 });
const strap = new THREE.MeshStandardMaterial({ color: '#2f8f4e', metalness: 0.1, roughness: 0.6 });
const label = new THREE.MeshStandardMaterial({ color: '#f4f4f0', metalness: 0, roughness: 0.7 });

/**
 * Sawn timber bundles stacked on a pallet: boards run along x (length), bundles ~1.1 m wide x ~0.5 m high,
 * spacer sticks between layers, end grain with board joints on both ends, white tags and green straps.
 */
export function TimberPalletStack({ l, w, h, color }: ModelProps) {
  const palletMat = usePaint(color, mat.woodDark);
  const palletH = 0.14, stick = 0.04;
  const nz = Math.max(1, Math.round(w / 1.1));
  const ny = Math.max(1, Math.floor((h - palletH) / 0.55));
  const bw = (w - 0.04 * (nz - 1)) / nz;
  const bh = (h - palletH - stick * (ny - 1)) / ny;
  const cols = Math.max(2, Math.round(bw / 0.1));
  const rows = Math.max(2, Math.round(bh / 0.05));
  const slats = Math.max(3, Math.round(l / 0.4));
  return (
    <>
      {[-1, 0, 1].map((k) => <B key={k} p={[0, palletH * 0.35, k * (w / 2 - 0.08)]} s={[l, palletH * 0.7, 0.1]} m={palletMat} />)}
      {Array.from({ length: slats }, (_, i) => (
        <B key={i} p={[-l / 2 + 0.06 + (i * (l - 0.12)) / (slats - 1), palletH - 0.012, 0]} s={[0.1, 0.024, w]} m={palletMat} />
      ))}
      {Array.from({ length: ny }, (_, j) => {
        const y0 = palletH + j * (bh + stick);
        return (
          <group key={j}>
            {j > 0 && [-0.4, 0, 0.4].map((f) => <B key={f} p={[l * f, y0 - stick / 2, 0]} s={[0.05, stick, w]} m={mat.woodDark} />)}
            {Array.from({ length: nz }, (_, k) => {
              const z = -w / 2 + bw / 2 + k * (bw + 0.04);
              return (
                <group key={k}>
                  <B p={[0, y0 + bh / 2, z]} s={[l - 0.02, bh, bw]} m={pine} />
                  {[-1, 1].map((s) => (
                    <group key={s}>
                      <B p={[s * (l / 2 - 0.004), y0 + bh / 2, z]} s={[0.012, bh, bw]} m={endGrain} />
                      {Array.from({ length: cols - 1 }, (_, c) => (
                        <B key={`c${c}`} p={[s * (l / 2 + 0.003), y0 + bh / 2, z - bw / 2 + ((c + 1) * bw) / cols]} s={[0.004, bh, 0.006]} m={groove} />
                      ))}
                      {Array.from({ length: rows - 1 }, (_, r) => (
                        <B key={`r${r}`} p={[s * (l / 2 + 0.003), y0 + ((r + 1) * bh) / rows, z]} s={[0.004, 0.006, bw]} m={groove} />
                      ))}
                      <B p={[s * (l / 2 + 0.006), y0 + bh * 0.62, z - bw * 0.15]} s={[0.004, 0.12, 0.09]} m={label} />
                    </group>
                  ))}
                  {[-0.3, 0.3].map((f) => (
                    <group key={f}>
                      <B p={[l * f, y0 + bh + 0.002, z]} s={[0.03, 0.004, bw + 0.01]} m={strap} />
                      {[-1, 1].map((s) => <B key={s} p={[l * f, y0 + bh / 2, z + s * (bw / 2 + 0.003)]} s={[0.03, bh, 0.004]} m={strap} />)}
                    </group>
                  ))}
                </group>
              );
            })}
          </group>
        );
      })}
    </>
  );
}
