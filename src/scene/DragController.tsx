import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { normDeg, snapTo } from '../domain/geometry';
import type { Machine, Point2 } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();

/** Camera and canvas element, shared with DOM handlers (library drop) that live outside the Canvas. */
export const sceneRef: { camera?: THREE.Camera; el?: HTMLElement } = {};

/** Floor coordinates (metres) under a screen point, or null if the ray misses the floor plane. */
export function floorPoint(e: { clientX: number; clientY: number }, camera = sceneRef.camera, el = sceneRef.el): Point2 | null {
  if (!camera || !el) return null;
  const r = el.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(floorPlane, hit)) return null;
  return { x: hit.x, y: -hit.z };
}

/** Keeps sceneRef pointing at the current camera and canvas. Render once inside the Canvas. */
export function SceneBridge() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    sceneRef.camera = camera;
    sceneRef.el = gl.domElement;
  }, [camera, gl]);
  return null;
}

/**
 * Start moving or rotating a machine from a pointer-down. Updates a UI preview while dragging
 * and commits one store update (one undo step) on release.
 */
export function useMachineDrag() {
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  return useCallback(
    (m: Machine, mode: 'move' | 'rotate', e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const start = floorPoint(e.nativeEvent, camera, gl.domElement);
      if (!start) return;
      if (controls) controls.enabled = false;
      const ui = useUiStore.getState();
      ui.select(m.id);
      const offset = { x: m.x - start.x, y: m.y - start.y };
      const startAngle = Math.atan2(start.y - m.y, start.x - m.x);
      let preview = { id: m.id, x: m.x, y: m.y, rotation: m.rotation };

      const move = (ev: PointerEvent) => {
        const p = floorPoint(ev, camera, gl.domElement);
        if (!p) return;
        if (mode === 'move') {
          const step = ev.altKey ? 0 : useUiStore.getState().snap;
          preview = { ...preview, x: snapTo(p.x + offset.x, step), y: snapTo(p.y + offset.y, step) };
        } else {
          const delta = ((Math.atan2(p.y - m.y, p.x - m.x) - startAngle) * 180) / Math.PI;
          const step = ev.shiftKey ? 1 : 15;
          preview = { ...preview, rotation: normDeg(Math.round((m.rotation + delta) / step) * step) };
        }
        useUiStore.getState().setDragPreview(preview);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        useUiStore.getState().setDragPreview(null);
        if (controls) controls.enabled = true;
        if (preview.x !== m.x || preview.y !== m.y || preview.rotation !== m.rotation) {
          useProjectStore.getState().updateMachine(m.id, { x: preview.x, y: preview.y, rotation: preview.rotation });
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [camera, gl, controls],
  );
}
