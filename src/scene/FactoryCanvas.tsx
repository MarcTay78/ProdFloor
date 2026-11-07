import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type DragEvent } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { snapTo } from '../domain/geometry';
import type { Factory, Machine } from '../domain/types';
import { validateLayout } from '../domain/validation';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { MACHINE_TYPE_MIME } from '../ui/LeftLibrary';
import { toThree } from './coords';
import { SceneBridge, floorPoint } from './DragController';
import { FactoryShell } from './FactoryShell';
import { FlowArrows } from './FlowArrows';
import { MachineInstance, type MachineStatus } from './MachineInstance';

function CameraRig({ factory, machines }: { factory: Factory; machines: Machine[] }) {
  const { viewMode, cameraPreset, cameraNonce, focusId, focusNonce } = useUiStore();
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const L = factory.length, W = factory.width, D = Math.max(L, W);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const centre = new THREE.Vector3(L / 2, 0, -W / 2);
    const offsets = { iso: [0.55 * D, 0.65 * D, 0.85 * D], top: [0, 1.5 * D, 0.001], front: [0, 0.3 * D, 1.15 * D], side: [1.15 * D, 0.3 * D, 0] };
    const o = offsets[viewMode === '2d' ? 'top' : cameraPreset];
    camera.position.set(centre.x + o[0], centre.y + o[1], centre.z + o[2]);
    c.target.copy(centre);
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = Math.min(size.width / (1.15 * L), size.height / (1.15 * W));
      camera.updateProjectionMatrix();
    }
    c.update();
    // Re-frame only on explicit preset changes, view switches and building size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraNonce, viewMode, L, W, camera]);

  useEffect(() => {
    const c = controls.current;
    const m = machines.find((x) => x.id === focusId);
    if (!c || !m) return;
    const target = new THREE.Vector3(...toThree(m.x, m.y));
    const offset = camera.position.clone().sub(c.target);
    c.target.copy(target);
    camera.position.copy(target).add(offset);
    c.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  return (
    <>
      {viewMode === '3d'
        ? <PerspectiveCamera makeDefault fov={45} near={0.1} far={5000} />
        : <OrthographicCamera makeDefault near={0.1} far={10000} />}
      <OrbitControls
        ref={controls}
        makeDefault
        enableRotate={viewMode === '3d'}
        screenSpacePanning
        maxPolarAngle={Math.PI / 2 - 0.03}
        mouseButtons={viewMode === '2d' ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : undefined}
      />
    </>
  );
}

function Lights({ factory, flat }: { factory: Factory; flat: boolean }) {
  const { length: L, width: W, ceilingHeight: H } = factory;
  const D = Math.max(L, W);
  const sun = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const s = sun.current;
    if (!s) return;
    s.target.position.set(L / 2, 0, -W / 2);
    s.target.updateMatrixWorld();
  }, [L, W]);

  const lamps = useMemo(() => {
    const nx = Math.max(1, Math.round(L / 8)), ny = Math.max(1, Math.round(W / 8));
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push({ x: ((i + 0.5) * L) / nx, y: ((j + 0.5) * W) / ny });
    return out;
  }, [L, W]);
  // ponytail: real point lights only for up to 12 lamps (cost grows per light); the rest are emissive fixtures.
  const lit = lamps.filter((_, i) => i % Math.ceil(lamps.length / 12) === 0);

  return (
    <>
      <hemisphereLight args={['#e3ecf5', '#3f3f46', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={sun}
        castShadow
        position={[L / 2 + D * 0.35, D * 0.9, -W / 2 + D * 0.45]}
        intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-D * 0.75}
        shadow-camera-right={D * 0.75}
        shadow-camera-top={D * 0.75}
        shadow-camera-bottom={-D * 0.75}
        shadow-camera-near={1}
        shadow-camera-far={D * 4}
        shadow-bias={-0.0004}
      />
      {!flat && lamps.map((p, i) => (
        <mesh key={i} position={toThree(p.x, p.y, H - 0.15)} raycast={() => null}>
          <boxGeometry args={[1.2, 0.08, 0.3]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff4d6" emissiveIntensity={1.5} />
        </mesh>
      ))}
      {lit.map((p, i) => <pointLight key={i} position={toThree(p.x, p.y, H - 0.4)} intensity={25} distance={Math.max(12, H * 3)} decay={1.5} />)}
    </>
  );
}

export function FactoryCanvas() {
  const project = useProjectStore((s) => s.project);
  const addMachine = useProjectStore((s) => s.addMachine);
  const { viewMode, selectedId, dragPreview, showLabels, showModelsIn2d, select, setCanvasEl } = useUiStore();
  const layout = activeLayout(project);
  const flat = viewMode === '2d';
  const shownMachines = layout.machines.map((m) => (dragPreview?.id === m.id ? { ...m, ...dragPreview } : m));

  const status = useMemo(() => {
    const s = new Map<string, MachineStatus>();
    for (const w of validateLayout(layout)) {
      for (const id of w.machineIds) if (s.get(id) !== 'error') s.set(id, w.severity === 'error' ? 'error' : 'warning');
    }
    return s;
  }, [layout]);

  const onDrop = (e: DragEvent) => {
    const typeId = e.dataTransfer.getData(MACHINE_TYPE_MIME);
    if (!typeId) return;
    e.preventDefault();
    const p = floorPoint(e);
    if (!p) return;
    const snap = useUiStore.getState().snap;
    const id = addMachine(typeId, snapTo(p.x, snap), snapTo(p.y, snap));
    if (id) select(id);
  };

  return (
    <div
      className="relative h-full w-full"
      onDragOver={(e) => { if (e.dataTransfer.types.includes(MACHINE_TYPE_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
      onDrop={onDrop}
    >
      <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }} onCreated={({ gl }) => setCanvasEl(gl.domElement)}>
        <color attach="background" args={['#1e293b']} />
        <SceneBridge />
        <CameraRig factory={layout.factory} machines={layout.machines} />
        <Lights factory={layout.factory} flat={flat} />
        <FactoryShell factory={layout.factory} flat={flat} />
        <FlowArrows flows={layout.flows} machines={shownMachines} showNumbers={showLabels} />
        {layout.machines.map((m, i) => {
          const shown = shownMachines[i];
          return (
            <MachineInstance
              key={m.id}
              machine={shown}
              project={project}
              status={status.get(m.id) ?? null}
              selected={m.id === selectedId}
              flat={flat}
              showModel={!flat || showModelsIn2d}
              showLabel={showLabels}
            />
          );
        })}
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300">
        {flat ? 'Plan view · drag to pan · scroll to zoom · north is up' : 'Left-drag rotate · right-drag pan · scroll zoom'}
      </div>
    </div>
  );
}
