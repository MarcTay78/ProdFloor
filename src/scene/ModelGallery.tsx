import { Html, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { CATALOGUE } from '../domain/catalogue';
import { getModel } from './models';

/** Dev page (?gallery): every built-in model at its catalogue size, with a wire box showing the exact L×W×H. */
export function ModelGallery() {
  const [bounds, setBounds] = useState(true);
  // ?gallery=<type id> shows one model close up from the front (-z); ?gallery shows all.
  const only = new URLSearchParams(location.search).get('gallery');
  const types = only ? CATALOGUE.filter((t) => t.id === only) : CATALOGUE;
  const single = types.length === 1;
  const cols = 7, gap = 7;
  const target: [number, number, number] = single ? [0, 1, 0] : [gap * 3, 0, gap * 1.5];
  return (
    <div className="relative h-full">
      <Canvas shadows camera={{ position: single ? [2.6, 2.4, -3.6] : [22, 18, 30], fov: 45 }}>
        <color attach="background" args={['#1e293b']} />
        <hemisphereLight args={['#e3ecf5', '#3f3f46', 1]} />
        <directionalLight castShadow position={[20, 30, 15]} intensity={1.8} shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[gap * 3, 0, gap * 1.5]}>
          <planeGeometry args={[80, 60]} />
          <meshStandardMaterial color="#8c9094" />
        </mesh>
        {types.map((t, i) => {
          const Model = getModel(t.model);
          const { length: l, width: w, height: h } = t.defaults;
          return (
            <group key={t.id} position={[(i % cols) * gap, 0, Math.floor(i / cols) * gap]}>
              <Model l={l} w={w} h={h} />
              {bounds && (
                <mesh position={[0, h / 2, 0]}>
                  <boxGeometry args={[l, h, w]} />
                  <meshBasicMaterial color="#38bdf8" wireframe />
                </mesh>
              )}
              <Html position={[0, h + 0.4, 0]} center className="whitespace-nowrap text-[11px] text-slate-100">{t.name}</Html>
            </group>
          );
        })}
        <OrbitControls target={target} />
      </Canvas>
      <label className="absolute left-3 top-3 flex items-center gap-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-200">
        <input type="checkbox" checked={bounds} onChange={(e) => setBounds(e.target.checked)} /> Show L×W×H bounds
      </label>
    </div>
  );
}
