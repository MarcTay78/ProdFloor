import { useStore } from 'zustand';
import { saveNow } from '../store/persistence';
import { redo, undo, useProjectStore } from '../store/projectStore';
import { useUiStore, type CameraPreset } from '../store/uiStore';
import { btn, btnOn, input } from './Dialog';
import { exportPng, exportProjectJson, importProjectJson } from './projectIO';

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'iso', label: 'Iso' }, { id: 'top', label: 'Top' }, { id: 'front', label: 'Front' }, { id: 'side', label: 'Side' },
];
const SNAPS = [0.01, 0.05, 0.1, 0.25, 0.5, 1];

export function TopToolbar() {
  const project = useProjectStore((s) => s.project);
  const setActiveLayout = useProjectStore((s) => s.setActiveLayout);
  const past = useStore(useProjectStore.temporal, (s) => s.pastStates.length);
  const future = useStore(useProjectStore.temporal, (s) => s.futureStates.length);
  const ui = useUiStore();
  const savedAt = ui.savedAt ? new Date(ui.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="flex h-full items-center gap-1.5 overflow-x-auto border-b border-slate-700 bg-slate-900 px-3 text-slate-200">
      <span className="mr-2 whitespace-nowrap text-sm font-semibold text-sky-300">ProdFloor</span>
      <span className="max-w-[160px] truncate text-xs text-slate-400" title={project.name}>{project.name}</span>
      <select className={input} value={project.activeLayoutId} onChange={(e) => setActiveLayout(e.target.value)} title="Active layout">
        {project.layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <Sep />
      <button className={btn} onClick={() => ui.openDialog('factory')}>Factory</button>
      <button className={btn} onClick={() => ui.openDialog('projects')}>Projects</button>
      <button
        className={btn}
        onClick={() => ui.openDialog('compare')}
        disabled={project.layouts.length < 2}
        title={project.layouts.length < 2 ? 'Add a second layout to compare' : 'Compare layouts side by side'}
      >
        Compare
      </button>
      <Sep />
      <button className={btn} onClick={undo} disabled={!past} title="Undo (Ctrl+Z)">↶ Undo</button>
      <button className={btn} onClick={redo} disabled={!future} title="Redo (Ctrl+Y)">↷ Redo</button>
      <Sep />
      <button className={btn} onClick={saveNow} title="Projects autosave in this browser">{savedAt ? `Saved ${savedAt}` : 'Save'}</button>
      <button className={btn} onClick={exportProjectJson}>Export JSON</button>
      <button className={btn} onClick={importProjectJson}>Import JSON</button>
      <button className={btn} onClick={exportPng}>PNG</button>
      <div className="flex-1" />
      <button className={ui.viewMode === '2d' ? btnOn : btn} onClick={() => ui.setViewMode('2d')}>2D</button>
      <button className={ui.viewMode === '3d' ? btnOn : btn} onClick={() => ui.setViewMode('3d')}>3D</button>
      <Sep />
      {PRESETS.map((p) => (
        <button
          key={p.id}
          className={ui.cameraPreset === p.id ? btnOn : btn}
          disabled={ui.viewMode === '2d' && p.id !== 'top'}
          onClick={() => ui.setCameraPreset(p.id)}
        >
          {p.label}
        </button>
      ))}
      <Sep />
      <button className={ui.showWalls ? btnOn : btn} onClick={() => ui.toggle('showWalls')}>Walls</button>
      <button className={ui.showLabels ? btnOn : btn} onClick={() => ui.toggle('showLabels')}>Labels</button>
      <button className={ui.showGrid ? btnOn : btn} onClick={() => ui.toggle('showGrid')}>Grid</button>
      <button className={ui.showFlows ? btnOn : btn} onClick={() => ui.toggle('showFlows')}>Flows</button>
      {ui.viewMode === '2d' && (
        <button className={ui.showModelsIn2d ? btnOn : btn} onClick={() => ui.toggle('showModelsIn2d')}>Models</button>
      )}
      <label className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-400">
        Snap
        <select className={input} value={ui.snap} onChange={(e) => ui.setSnap(Number(e.target.value))}>
          {SNAPS.map((s) => <option key={s} value={s}>{s} m</option>)}
        </select>
      </label>
    </div>
  );
}

const Sep = () => <span className="mx-0.5 h-5 w-px bg-slate-700" />;
