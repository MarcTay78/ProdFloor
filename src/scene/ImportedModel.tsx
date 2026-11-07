import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { loadModel, type StoredModel } from '../store/persistence';
import { useUiStore } from '../store/uiStore';
import { mat } from './models/parts';

type Loaded = { object: THREE.Object3D; fitMode: 'stretch' | 'contain' };
const cache = new Map<string, Promise<Loaded>>();

async function parse(m: StoredModel): Promise<THREE.Object3D> {
  switch (m.format) {
    case 'glb':
    case 'gltf':
      return (await new GLTFLoader().parseAsync(m.data, '')).scene;
    case 'obj':
      return new OBJLoader().parse(new TextDecoder().decode(m.data));
    case 'stl':
      return new THREE.Mesh(new STLLoader().parse(m.data), mat.steel);
    case 'fbx':
      return new FBXLoader().parse(m.data, '');
  }
}

function load(key: string): Promise<Loaded> {
  let p = cache.get(key);
  if (!p) {
    p = loadModel(key).then(async (m) => {
      if (!m) throw new Error('Model file not found in this browser');
      const object = await parse(m);
      object.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      return { object, fitMode: m.fitMode ?? 'contain' };
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

/**
 * Imported GLB/GLTF/OBJ/STL/FBX scaled to the machine's real L×W×H (stretch) or fitted inside it
 * keeping proportions (contain), centred on the footprint and standing on the floor.
 */
export function ImportedModel({ modelKey, l, w, h, fallback }: { modelKey: string; l: number; w: number; h: number; fallback: ReactNode }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setLoaded(null);
    setFailed(false);
    load(modelKey).then(
      (r) => live && setLoaded(r),
      (err: Error) => {
        if (!live) return;
        setFailed(true);
        useUiStore.getState().showToast(`Couldn't load 3D model (${err.message}). Using the built-in model. For glTF use a single .glb file.`);
      },
    );
    return () => { live = false; };
  }, [modelKey]);

  const fitted = useMemo(() => {
    if (!loaded) return null;
    const obj = loaded.object.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const sx = l / (size.x || 1), sy = h / (size.y || 1), sz = w / (size.z || 1);
    const s = loaded.fitMode === 'stretch' ? new THREE.Vector3(sx, sy, sz) : new THREE.Vector3().setScalar(Math.min(sx, sy, sz));
    const centre = box.getCenter(new THREE.Vector3());
    const wrapper = new THREE.Group();
    obj.position.set(-centre.x, -box.min.y, -centre.z);
    wrapper.add(obj);
    wrapper.scale.copy(s);
    return wrapper;
  }, [loaded, l, w, h]);

  if (failed || !fitted) return <>{fallback}</>;
  return <primitive object={fitted} />;
}
