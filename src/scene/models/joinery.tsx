import * as THREE from 'three';
import { B, C, Panel, mat, usePaint, type ModelProps } from './parts';

export function Mortiser({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.green);
  const tableY = h * 0.5;
  return (
    <>
      <B p={[0, tableY * 0.45, 0.05 * w]} s={[l * 0.6, tableY * 0.9, w * 0.6]} m={body} />
      <B p={[0, (h * 0.95) / 2, w * 0.3]} s={[l * 0.22, h * 0.95, w * 0.28]} m={body} />
      <B p={[0, tableY, -w * 0.12]} s={[l, 0.05, w * 0.5]} m={mat.cast} />
      <B p={[0, tableY + 0.1, w * 0.05]} s={[l * 0.9, 0.15, 0.04]} m={mat.steel} />
      <B p={[l * 0.3, tableY + 0.1, -w * 0.25]} s={[0.12, 0.12, 0.1]} m={mat.yellow} />
      <B p={[0, h * 0.74, -w * 0.02]} s={[l * 0.35, h * 0.18, w * 0.4]} m={body} />
      <C p={[0, h * 0.62, -w * 0.12]} rad={0.015} len={h * 0.08} m={mat.blade} />
      <C p={[0, h * 0.9, -w * 0.02]} rad={Math.min(0.12, l * 0.12)} len={h * 0.14} m={mat.grey} />
      <C p={[l * 0.22, h * 0.75, -w * 0.15]} rad={0.012} len={0.35} m={mat.steel} axis="x" />
      <Panel p={[-l * 0.32, tableY * 0.8, -w * 0.2]} s={[0.14, 0.14, 0.05]} />
    </>
  );
}

/** CNC mortiser: white base with clamping table and yellow guard rail, orange spindle head, side electrical cabinet and arm-mounted control panel. */
export function CncMortiser({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.white);
  const tableY = h * 0.48;
  const baseL = l * 0.74, baseX = -l * 0.13;
  const cabX = l * 0.38;
  // Mirrored on x so, seen from the front (-z), the electrical cabinet sits on the operator's right as on the real machine.
  return (
    <group scale={[-1, 1, 1]}>
      {[-0.4, 0.4].map((f) => <B key={f} p={[baseX + baseL * f, 0.05, 0]} s={[0.12, 0.1, w * 0.9]} m={mat.grey} />)}
      <B p={[baseX, 0.1 + (tableY - 0.12) / 2, 0.02 * w]} s={[baseL, tableY - 0.12, w * 0.8]} m={body} />
      <B p={[baseX, tableY * 0.45, -w * 0.405]} s={[baseL * 0.7, tableY * 0.3, 0.01]} m={mat.grey} />
      <C p={[baseX + baseL * 0.15, tableY * 0.45, -w * 0.41]} rad={0.07} len={0.03} m={mat.dark} axis="z" />
      {/* clamping table */}
      <B p={[baseX, tableY - 0.03, -w * 0.05]} s={[baseL * 0.95, 0.04, w * 0.65]} m={mat.steel} />
      {Array.from({ length: 6 }, (_, i) => (
        <B key={i} p={[baseX, tableY + 0.01, -w * 0.32 + i * w * 0.11]} s={[baseL * 0.93, 0.03, 0.025]} m={mat.grey} />
      ))}
      {[-0.3, -0.1, 0.1, 0.3].map((f) => (
        <group key={f}>
          <B p={[baseX + baseL * f, tableY + 0.07, -w * 0.12]} s={[0.05, 0.1, 0.12]} m={mat.steel} />
          <C p={[baseX + baseL * f, tableY + 0.17, -w * 0.12]} rad={0.02} len={0.1} m={mat.steel} />
        </group>
      ))}
      <B p={[baseX, tableY + 0.06, -w * 0.12]} s={[baseL * 0.9, 0.025, 0.04]} m={mat.wood} />
      {/* yellow guard rail around the table */}
      <B p={[baseX, tableY + 0.04, -w * 0.47]} s={[baseL * 1.08, 0.05, 0.06]} m={mat.yellow} />
      {[-1, 1].map((s) => <B key={s} p={[baseX + s * baseL * 0.54, tableY + 0.04, -w * 0.15]} s={[0.06, 0.05, w * 0.64]} m={mat.yellow} />)}
      <B p={[baseX - baseL * 0.38, tableY + 0.02, -w * 0.44]} s={[0.25, 0.06, 0.08]} m={mat.grey} />
      {/* column and spindle head */}
      <B p={[baseX + baseL * 0.05, (tableY + h * 0.92) / 2, w * 0.3]} s={[0.3, h * 0.92 - tableY, 0.25]} m={body} />
      <B p={[baseX - baseL * 0.05, h * 0.74, w * 0.02]} s={[l * 0.24, h * 0.26, w * 0.4]} m={mat.orange} />
      <B p={[baseX + baseL * 0.18, h * 0.66, -w * 0.05]} s={[l * 0.08, h * 0.12, w * 0.2]} m={mat.blue} />
      {[-0.05, 0.05].map((dx) => (
        <C key={dx} p={[baseX - baseL * 0.05 + dx * l, h * 0.58, -w * 0.08]} rad={0.02} len={h * 0.06} m={mat.blade} />
      ))}
      <C p={[baseX - baseL * 0.05, h * 0.93, w * 0.1]} rad={0.04} len={h * 0.12} m={mat.steel} />
      {/* electrical cabinet, control arm and panel */}
      <B p={[cabX, (h * 0.75) / 2 + 0.05, w * 0.05]} s={[l * 0.22, h * 0.75, w * 0.6]} m={body} />
      <B p={[cabX - l * 0.04, h * 0.45, -w * 0.255]} s={[0.02, 0.12, 0.02]} m={mat.dark} />
      <B p={[cabX, h * 0.24, -w * 0.255]} s={[l * 0.1, h * 0.08, 0.01]} m={mat.grey} />
      <B p={[cabX - l * 0.02, (h * 0.8 + h) / 2, w * 0.2]} s={[0.08, h * 0.2, 0.08]} m={body} />
      <B p={[cabX - l * 0.1, h - 0.04, w * 0.05]} s={[l * 0.2, 0.08, 0.08]} m={body} />
      <Panel p={[cabX - l * 0.2, h * 0.84, -w * 0.1]} s={[l * 0.2, h * 0.14, 0.08]} />
    </group>
  );
}

export function Tenoner({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.blue);
  const bedY = h * 0.5;
  return (
    <>
      <B p={[0, bedY / 2, w * 0.1]} s={[l, bedY, w * 0.55]} m={body} />
      <B p={[0, bedY + 0.03, -w * 0.32]} s={[l * 0.75, 0.06, w * 0.3]} m={mat.steel} />
      <B p={[0, bedY - 0.08, -w * 0.32]} s={[l * 0.8, 0.1, w * 0.1]} m={mat.dark} />
      <B p={[-l * 0.25, bedY + 0.12, -w * 0.3]} s={[0.05, 0.12, w * 0.32]} m={mat.yellow} />
      {[-0.22, 0.22].map((fx, i) => (
        <group key={i}>
          <B p={[l * fx, bedY + (h - bedY) * 0.42, w * 0.12]} s={[l * 0.24, (h - bedY) * 0.84, w * 0.5]} m={body} />
          <B p={[l * fx, bedY + (h - bedY) * 0.6, -w * 0.15]} s={[l * 0.2, (h - bedY) * 0.35, 0.05]} m={mat.yellow} />
          <C p={[l * fx, h - 0.08, w * 0.15]} rad={0.07} len={0.16} m={mat.grey} />
        </group>
      ))}
      <Panel p={[l * 0.45, bedY + 0.3, -w * 0.1]} s={[0.1, 0.3, 0.25]} />
    </>
  );
}

const tenonBlue = new THREE.MeshStandardMaterial({ color: '#2f6fbf', metalness: 0.25, roughness: 0.45 });

/**
 * CNC tenon machine: white cabinet with a red recessed work window holding two vertical cutter heads,
 * blue work table with hand wheels below, touchscreen, blue doors, tall blue electrical cabinet on the side.
 */
export function CncTenoner({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mat.white);
  const fz = -w * 0.3; // cabinet front face
  const top = h * 0.95, base = 0.12;
  const tableY = h * 0.56;
  // Mirrored in x so that, seen from the front, the electrical cabinet is on the right as in the reference photo.
  return (
    <group scale={[-1, 1, 1]}>
      {[-0.42, 0.22].map((f) => <B key={f} p={[l * f, base / 2, -w * 0.02]} s={[l * 0.1, base, w * 0.75]} m={mat.grey} />)}
      <B p={[-l * 0.095, (base + top) / 2, w * 0.05]} s={[l * 0.77, top - base, w * 0.7]} m={body} />
      <B p={[-l * 0.18, h * 0.69, fz - 0.005]} s={[l * 0.34, h * 0.24, 0.01]} m={mat.red} />
      <B p={[-l * 0.18, h * 0.69, fz - 0.002]} s={[l * 0.2, h * 0.2, 0.01]} m={mat.dark} />
      {[-0.23, -0.13].map((f) => (
        <group key={f}>
          <C p={[l * f, h * 0.83, fz - 0.12]} rad={0.06} len={0.16} m={mat.steel} />
          <C p={[l * f, h * 0.72, fz - 0.12]} rad={0.035} len={0.12} m={mat.dark} />
          <C p={[l * f, h * 0.64, fz - 0.12]} rad={0.07} len={0.02} m={mat.blade} />
        </group>
      ))}
      <B p={[-l * 0.18, tableY, fz - 0.2]} s={[l * 0.38, 0.04, 0.4]} m={tenonBlue} />
      <B p={[-l * 0.18, tableY + 0.04, fz - 0.05]} s={[l * 0.38, 0.05, 0.03]} m={mat.steel} />
      {[-0.23, -0.13].map((f) => (
        <group key={f}>
          <B p={[l * f, (base + tableY) / 2 + 0.05, fz - 0.06]} s={[0.1, tableY - base - 0.1, 0.12]} m={body} />
          <C p={[l * f, h * 0.45, fz - 0.16]} rad={0.08} len={0.015} m={mat.steel} axis="z" />
        </group>
      ))}
      {[-0.36, 0.13].map((f) => (
        <B key={f} p={[l * f, h * 0.3, fz - 0.005]} s={[l * 0.13, h * 0.3, 0.01]} m={tenonBlue} />
      ))}
      <B p={[l * 0.12, h * 0.77, fz - 0.02]} s={[l * 0.16, h * 0.16, 0.04]} m={mat.grey} />
      <B p={[l * 0.11, h * 0.77, fz - 0.045]} s={[l * 0.1, h * 0.12, 0.01]} m={mat.screen} />
      <C p={[l * 0.18, h * 0.74, fz - 0.05]} rad={0.015} len={0.02} m={mat.red} axis="z" />
      <B p={[l * 0.4, (0.1 + top) / 2, w * 0.15]} s={[l * 0.19, top - 0.1, w * 0.6]} m={tenonBlue} />
      <B p={[l * 0.4, h * 0.25, -w * 0.27]} s={[l * 0.18, h * 0.28, w * 0.24]} m={mat.white} />
      <C p={[-l * 0.485, h * 0.45, w * 0.05]} rad={0.07} len={0.06} m={tenonBlue} axis="x" />
      <C p={[l * 0.3, h * 0.45, -w * 0.05]} rad={0.07} len={0.06} m={tenonBlue} axis="x" />
    </group>
  );
}

const mortWhite = new THREE.MeshStandardMaterial({ color: '#eceeef', metalness: 0.15, roughness: 0.5 });
const clampOrange = new THREE.MeshStandardMaterial({ color: '#e8742a', metalness: 0.1, roughness: 0.6 });
const windowBlue = new THREE.MeshStandardMaterial({ color: '#2d7fd6', metalness: 0.1, roughness: 0.15, transparent: true, opacity: 0.75 });

/**
 * CNC back leg mortiser: white base cabinet with two angled clamping fixtures (pneumatic clamps, orange pads)
 * either side of a black centre chute, overhead gantry with a centre head behind a blue window and side
 * spindle units, motors and cable chains on top, and a separate control console on castors at the -x end
 * (seen from the front, -z, the console is on the right).
 */
export function CncBackLegMortiser({ l, w, h, color }: ModelProps) {
  const body = usePaint(color, mortWhite);
  const con = Math.min(0.6, l * 0.18); // console length along x
  const x0 = -l / 2 + con + 0.1, x1 = l / 2;
  const bl = x1 - x0, bx = (x0 + x1) / 2;
  const baseH = 0.85, bw = w * 0.62, bz = w * 0.08;
  const fixY = baseH + 0.12, fixZ = bz - bw * 0.15;
  const gY = Math.min(h - 0.55, 1.9), gZ = bz + bw * 0.28;
  return (
    <>
      {/* Base cabinet with feet, vent and label */}
      <B p={[bx, baseH / 2, bz]} s={[bl, baseH, bw]} m={body} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <B key={`${sx}${sz}`} p={[bx + sx * (bl / 2 - 0.1), 0.03, bz + sz * (bw / 2 - 0.08)]} s={[0.22, 0.06, 0.18]} m={body} />
      )))}
      <B p={[bx - bl * 0.12, baseH * 0.55, bz - bw / 2 - 0.005]} s={[0.12, 0.18, 0.01]} m={mat.yellow} />
      {/* Two clamping fixtures, slightly angled, with clamps and orange pads */}
      {[-1, 1].map((s) => {
        const fx = bx + s * bl * 0.25;
        return (
          <group key={s} position={[fx, fixY, fixZ]} rotation={[0, s * -0.12, 0]}>
            <B p={[0, 0, 0]} s={[bl * 0.42, 0.08, 0.35]} m={mat.steel} />
            <B p={[0, 0.1, -0.12]} s={[bl * 0.42, 0.12, 0.05]} m={mat.steel} />
            {Array.from({ length: 5 }, (_, i) => {
              const x = -bl * 0.18 + (i * bl * 0.36) / 4;
              return (
                <group key={i}>
                  <C p={[x, 0.2, 0.05]} rad={0.03} len={0.25} m={mat.steel} />
                  <B p={[x, 0.08, 0.05]} s={[0.08, 0.04, 0.1]} m={clampOrange} />
                </group>
              );
            })}
          </group>
        );
      })}
      {/* Black centre chute between the fixtures */}
      <B p={[bx, fixY + 0.05, fixZ - 0.05]} s={[0.3, 0.25, 0.5]} m={mat.dark} r={[0.4, 0, 0]} />
      {/* Gantry: side columns and beam behind the work area */}
      {[-1, 1].map((s) => (
        <B key={s} p={[bx + s * (bl / 2 - 0.12), (baseH + gY) / 2, gZ]} s={[0.22, gY - baseH, 0.3]} m={body} />
      ))}
      <B p={[bx, gY, gZ]} s={[bl, 0.3, 0.32]} m={body} />
      {/* Side spindle units on the beam */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <B p={[bx + s * bl * 0.3, gY, gZ - 0.25]} s={[bl * 0.25, 0.28, 0.2]} m={body} />
          <C p={[bx + s * bl * 0.3, gY - 0.3, gZ - 0.3]} rad={0.05} len={0.3} m={mat.steel} />
        </group>
      ))}
      {/* Centre head housing with a blue window */}
      <B p={[bx, gY + 0.05, gZ - 0.3]} s={[0.85, 0.6, 0.35]} m={body} />
      <B p={[bx + 0.04, gY + 0.05, gZ - 0.48]} s={[0.6, 0.42, 0.01]} m={windowBlue} />
      <C p={[bx, gY - 0.35, gZ - 0.35]} rad={0.04} len={0.2} m={mat.blade} />
      {/* Motors and cable chains on top */}
      <C p={[bx, gY + 0.5, gZ - 0.25]} rad={0.1} len={0.3} m={mat.dark} />
      {[-0.3, 0.3].map((dx) => <C key={dx} p={[bx + dx, gY + 0.45, gZ - 0.2]} rad={0.06} len={0.3} m={mat.steel} />)}
      {[-1, 1].map((s) => <B key={`ch${s}`} p={[bx + s * 0.55, gY + 0.4, gZ]} s={[0.08, 0.5, 0.08]} m={mat.rubber} />)}
      {/* Control console on castors */}
      <group position={[-l / 2 + con / 2, 0, -w / 2 + 0.35]}>
        <B p={[0, 0.05, 0]} s={[con, 0.06, 0.45]} m={mortWhite} />
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
          <C key={`w${sx}${sz}`} p={[sx * con * 0.4, 0.03, sz * 0.18]} rad={0.03} len={0.03} m={mat.rubber} axis="x" />
        )))}
        <B p={[0, 0.55, 0.05]} s={[0.18, 0.95, 0.18]} m={mortWhite} />
        <B p={[0, 1.08, 0]} s={[con, 0.1, 0.35]} m={mortWhite} />
        <B p={[0, 1.32, 0.08]} s={[con * 0.85, 0.4, 0.06]} m={mortWhite} r={[-0.3, 0, 0]} />
        <B p={[0, 1.33, 0.04]} s={[con * 0.7, 0.3, 0.01]} m={mat.screen} r={[-0.3, 0, 0]} />
      </group>
    </>
  );
}
