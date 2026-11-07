import { create } from 'zustand';

export type CameraPreset = 'iso' | 'top' | 'front' | 'side';
type ToggleKey = 'showWalls' | 'showLabels' | 'showGrid' | 'showModelsIn2d';
export type DialogName = 'factory' | 'projects' | 'customType';

interface UiState {
  selectedId: string | null;
  select(id: string | null): void;
  viewMode: '3d' | '2d';
  setViewMode(m: '3d' | '2d'): void;
  cameraPreset: CameraPreset;
  cameraNonce: number;
  setCameraPreset(p: CameraPreset): void;
  focusId: string | null;
  focusNonce: number;
  focus(id: string): void;
  showWalls: boolean;
  showLabels: boolean;
  showGrid: boolean;
  showModelsIn2d: boolean;
  toggle(key: ToggleKey): void;
  snap: number;
  setSnap(v: number): void;
  dragPreview: { id: string; x: number; y: number; rotation: number } | null;
  setDragPreview(p: UiState['dragPreview']): void;
  savedAt: string | null;
  saveError: string | null;
  setSaveStatus(s: { savedAt?: string | null; saveError?: string | null }): void;
  dialog: DialogName | null;
  openDialog(d: DialogName | null): void;
  toast: string | null;
  showToast(msg: string | null): void;
  canvasEl: HTMLCanvasElement | null;
  setCanvasEl(el: HTMLCanvasElement | null): void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedId: null,
  select: (selectedId) => set({ selectedId }),
  viewMode: '3d',
  setViewMode: (viewMode) =>
    set((s) => ({ viewMode, cameraPreset: viewMode === '2d' ? 'top' : 'iso', cameraNonce: s.cameraNonce + 1 })),
  cameraPreset: 'iso',
  cameraNonce: 0,
  setCameraPreset: (cameraPreset) => set((s) => ({ cameraPreset, cameraNonce: s.cameraNonce + 1 })),
  focusId: null,
  focusNonce: 0,
  focus: (focusId) => set((s) => ({ focusId, selectedId: focusId, focusNonce: s.focusNonce + 1 })),
  showWalls: true,
  showLabels: true,
  showGrid: true,
  showModelsIn2d: false,
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<UiState>),
  snap: 0.1,
  setSnap: (snap) => set({ snap }),
  dragPreview: null,
  setDragPreview: (dragPreview) => set({ dragPreview }),
  savedAt: null,
  saveError: null,
  setSaveStatus: (s) => set(s),
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  toast: null,
  showToast: (toast) => set({ toast }),
  canvasEl: null,
  setCanvasEl: (canvasEl) => set({ canvasEl }),
}));
