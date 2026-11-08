import { create } from 'zustand';

export type CameraPreset = 'iso' | 'top' | 'front' | 'side';
type ToggleKey = 'showWalls' | 'showLabels' | 'showGrid' | 'showModelsIn2d' | 'showFlows' | 'showLeft' | 'showRight' | 'showBottom' | 'animating' | 'showAreas';
export type DialogName = 'factory' | 'projects' | 'customType' | 'compare';
export type LeftTab = 'library' | 'workflow' | 'suggestions';

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
  showFlows: boolean;
  showAreas: boolean;
  showLeft: boolean;
  showRight: boolean;
  showBottom: boolean;
  setPanels(open: boolean): void;
  /** Parts animation along the workflow (display only). */
  animating: boolean;
  animSpeed: number;
  setAnimSpeed(v: number): void;
  /** single: next part starts when the previous one has finished; stream: a new part every few seconds. */
  animMode: 'single' | 'stream';
  setAnimMode(m: 'single' | 'stream'): void;
  leftTab: LeftTab;
  setLeftTab(t: LeftTab): void;
  /** Library categories the user has expanded (all start collapsed). */
  openCategories: Record<string, boolean>;
  toggleCategory(cat: string): void;
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
  showFlows: true,
  showAreas: true,
  showLeft: true,
  showRight: true,
  showBottom: true,
  setPanels: (open) => set({ showLeft: open, showRight: open, showBottom: open }),
  animating: false,
  animSpeed: 5,
  setAnimSpeed: (animSpeed) => set({ animSpeed }),
  animMode: 'single',
  setAnimMode: (animMode) => set({ animMode }),
  leftTab: 'library',
  setLeftTab: (leftTab) => set({ leftTab }),
  openCategories: {},
  toggleCategory: (cat) => set((s) => ({ openCategories: { ...s.openCategories, [cat]: !s.openCategories[cat] } })),
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

export const isFullView = (s: Pick<UiState, 'showLeft' | 'showRight' | 'showBottom'>) => !s.showLeft && !s.showRight && !s.showBottom;

/** Full view: hide every panel and ask the browser for full screen; calling again restores both. */
export function toggleFullView(): void {
  const ui = useUiStore.getState();
  const enter = !isFullView(ui);
  ui.setPanels(!enter);
  if (enter) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// Leaving browser full screen (Esc) also brings the panels back.
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullView(useUiStore.getState())) useUiStore.getState().setPanels(true);
  });
}
