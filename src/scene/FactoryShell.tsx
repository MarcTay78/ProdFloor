import { Grid, Html, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { rectCorners, snapTo, type Rect } from '../domain/geometry';
import type { Factory, Opening, WallSide } from '../domain/types';
import { doorKeepClearRect, pillarRect, wallRect, zoneRect } from '../domain/validation';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { toThree, rotY } from './coords';
import { mat } from './models/parts';

const wallMat = new THREE.MeshStandardMaterial({ color: '#c9ccc8', roughness: 0.9 });
const wallMatFlat = new THREE.MeshBasicMaterial({ color: '#cbd5e1' });
const pillarMat = new THREE.MeshStandardMaterial({ color: '#a3a39b', roughness: 0.85 });
const doorFrameMat = new THREE.MeshStandardMaterial({ color: '#e2b324', roughness: 0.5 });

/** Procedural concrete texture: one tile = 4 m with a saw-cut joint on its edge. No external asset needed. */
function useConcreteTexture(l: number, w: number) {
  const tex = useMemo(() => {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    g.fillStyle = '#8c9094';
    g.fillRect(0, 0, size, size);
    const img = g.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(55,55,55,${Math.random() * 0.06})`;
      g.beginPath();
      g.arc(Math.random() * size, Math.random() * size, 10 + Math.random() * 70, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(35,35,35,0.55)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  tex.repeat.set(l / 4, w / 4);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Flat rectangle on the floor (world coordinates) with outline. */
export function FloorRect({ r, color, opacity, y = 0.006, dashed, fill = true }: { r: Rect; color: string; opacity: number; y?: number; dashed?: boolean; fill?: boolean }) {
  const pts = rectCorners(r).map((p) => new THREE.Vector3(...toThree(p.x, p.y, y + 0.002)));
  pts.push(pts[0]);
  return (
    <group raycast={() => null}>
      {fill && (
        <mesh position={toThree(r.cx, r.cy, y)} rotation={[-Math.PI / 2, 0, rotY(r.rotation)]} raycast={() => null}>
          <planeGeometry args={[r.length, r.width]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      )}
      <Line points={pts} color={color} lineWidth={1.5} dashed={dashed} dashSize={0.25} gapSize={0.15} raycast={() => null} />
    </group>
  );
}

type Piece = { a: number; b: number; bottom: number; top: number; kind: 'wall' | 'glass' };

/** Split one wall into solid pieces around its doors and windows. a/b run along the wall in floor metres. */
function wallPieces(start: number, end: number, openings: (Opening & { isDoor: boolean })[], ceiling: number): Piece[] {
  const out: Piece[] = [];
  let cursor = start;
  for (const o of [...openings].sort((x, y) => x.offset - y.offset)) {
    const g0 = Math.max(start, o.offset - o.width / 2), g1 = Math.min(end, o.offset + o.width / 2);
    if (g1 <= g0) continue;
    if (g0 > cursor) out.push({ a: cursor, b: g0, bottom: 0, top: ceiling, kind: 'wall' });
    const sill = o.isDoor ? 0 : (o.sill ?? 1);
    const head = Math.min(ceiling, sill + o.height);
    if (sill > 0) out.push({ a: g0, b: g1, bottom: 0, top: sill, kind: 'wall' });
    if (!o.isDoor) out.push({ a: g0, b: g1, bottom: sill, top: head, kind: 'glass' });
    if (head < ceiling) out.push({ a: g0, b: g1, bottom: head, top: ceiling, kind: 'wall' });
    cursor = Math.max(cursor, g1);
  }
  if (cursor < end) out.push({ a: cursor, b: end, bottom: 0, top: ceiling, kind: 'wall' });
  return out;
}

function OuterWalls({ f, flat }: { f: Factory; flat: boolean }) {
  const t = f.wallThickness, L = f.length, W = f.width, H = f.ceilingHeight;
  const sides: { side: WallSide; start: number; end: number }[] = [
    { side: 'south', start: -t, end: L + t }, { side: 'north', start: -t, end: L + t },
    { side: 'west', start: 0, end: W }, { side: 'east', start: 0, end: W },
  ];
  const all = [...f.doors.map((d) => ({ ...d, isDoor: true })), ...f.windows.map((w) => ({ ...w, isDoor: false }))];

  return (
    <>
      {sides.map(({ side, start, end }) =>
        wallPieces(start, end, all.filter((o) => o.wall === side), H).map((p, i) => {
          if (flat && (p.bottom > 0 || p.kind === 'glass')) return null;
          const len = p.b - p.a, mid = (p.a + p.b) / 2;
          const top = flat ? 0.05 : p.top, bottom = flat ? 0 : p.bottom;
          const hgt = top - bottom, cy = (top + bottom) / 2;
          const alongX = side === 'south' || side === 'north';
          const fx = alongX ? mid : side === 'west' ? -t / 2 : L + t / 2;
          const fy = alongX ? (side === 'south' ? -t / 2 : W + t / 2) : mid;
          const size: [number, number, number] = alongX ? [len, hgt, p.kind === 'glass' ? 0.02 : t] : [p.kind === 'glass' ? 0.02 : t, hgt, len];
          return (
            <mesh key={`${side}${i}`} position={toThree(fx, fy, cy)} material={p.kind === 'glass' ? mat.glass : flat ? wallMatFlat : wallMat} castShadow={!flat} receiveShadow>
              <boxGeometry args={size} />
            </mesh>
          );
        }),
      )}
      {!flat && f.doors.map((d) => <DoorFrame key={d.id} f={f} d={d} />)}
    </>
  );
}

function DoorFrame({ f, d }: { f: Factory; d: Opening }) {
  const t = f.wallThickness;
  const alongX = d.wall === 'south' || d.wall === 'north';
  const wallPos = d.wall === 'south' ? -t / 2 : d.wall === 'north' ? f.width + t / 2 : d.wall === 'west' ? -t / 2 : f.length + t / 2;
  const posts = [d.offset - d.width / 2, d.offset + d.width / 2];
  const at = (along: number, h: number) => (alongX ? toThree(along, wallPos, h) : toThree(wallPos, along, h));
  const post: [number, number, number] = alongX ? [0.08, d.height, t + 0.04] : [t + 0.04, d.height, 0.08];
  const head: [number, number, number] = alongX ? [d.width + 0.16, 0.12, t + 0.04] : [t + 0.04, 0.12, d.width + 0.16];
  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} position={at(p, d.height / 2)} material={doorFrameMat} castShadow><boxGeometry args={post} /></mesh>
      ))}
      <mesh position={at(d.offset, Math.min(d.height, f.ceilingHeight - 0.06) + 0.06)} material={doorFrameMat} castShadow><boxGeometry args={head} /></mesh>
      <Html zIndexRange={[5, 0]} position={at(d.offset, d.height + 0.4)} center className="pointer-events-none select-none whitespace-nowrap rounded bg-amber-900/80 px-1 text-[10px] text-amber-100">
        {d.name}
      </Html>
    </group>
  );
}

export function FactoryShell({ factory: f, flat }: { factory: Factory; flat: boolean }) {
  const { showWalls, showGrid, select } = useUiStore();
  const tex = useConcreteTexture(f.length, f.width);
  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta >= 4) return; // a camera drag, not a click
    const { pathEditId, snap } = useUiStore.getState();
    if (!pathEditId) return select(null);
    const store = useProjectStore.getState();
    const w = activeLayout(store.project).workers.find((x) => x.id === pathEditId);
    if (w) store.updateWorker(w.id, { path: [...w.path, { x: snapTo(e.point.x, snap), y: snapTo(-e.point.z, snap) }] });
  };

  return (
    <group>
      <mesh position={toThree(f.length / 2, f.width / 2, 0)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onFloorClick} name="floor">
        <planeGeometry args={[f.length, f.width]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={toThree(f.length / 2, f.width / 2, -0.01)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[f.length + 60, f.width + 60]} />
        <meshStandardMaterial color="#4b5563" roughness={1} />
      </mesh>
      {showGrid && (
        <Grid
          position={toThree(f.length / 2, f.width / 2, 0.003)}
          args={[f.length, f.width]}
          cellSize={1}
          sectionSize={5}
          cellThickness={0.6}
          sectionThickness={1.2}
          cellColor="#5b6670"
          sectionColor="#38bdf8"
          fadeDistance={400}
          raycast={() => null}
        />
      )}
      {(showWalls || flat) && <OuterWalls f={f} flat={flat} />}
      {f.internalWalls.map((w) => {
        const r = wallRect(w);
        const h = flat ? 0.05 : w.height;
        return (
          <mesh key={w.id} position={toThree(r.cx, r.cy, h / 2)} rotation-y={rotY(r.rotation)} material={flat ? wallMatFlat : wallMat} castShadow receiveShadow>
            <boxGeometry args={[r.length, h, r.width]} />
          </mesh>
        );
      })}
      {f.pillars.map((p) => {
        const r = pillarRect(p);
        const h = flat ? 0.06 : f.ceilingHeight;
        return (
          <mesh key={p.id} position={toThree(r.cx, r.cy, h / 2)} material={pillarMat} castShadow receiveShadow>
            <boxGeometry args={[r.length, h, r.width]} />
          </mesh>
        );
      })}
      {f.restrictedZones.map((z) => {
        const r = zoneRect(z);
        return (
          <group key={z.id}>
            <FloorRect r={r} color="#ef4444" opacity={0.25} dashed />
            <Html zIndexRange={[5, 0]} position={toThree(r.cx, r.cy, 0.1)} center className="pointer-events-none select-none whitespace-nowrap text-[11px] text-red-200">{z.name}</Html>
          </group>
        );
      })}
      {f.doors.map((d) => d.keepClear > 0 && <FloorRect key={d.id} r={doorKeepClearRect(f, d)} color="#f59e0b" opacity={0.18} y={0.005} dashed />)}
    </group>
  );
}
