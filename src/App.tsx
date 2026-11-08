import { useEffect, useState } from 'react';
import { FactoryCanvas } from './scene/FactoryCanvas';
import { ModelGallery } from './scene/ModelGallery';
import { lastProjectId, loadProject, saveNow, startAutosave } from './store/persistence';
import { openProject } from './store/projectStore';
import { useUiStore } from './store/uiStore';
import { BottomStatus } from './ui/BottomStatus';
import { CompareDialog } from './ui/CompareDialog';
import { CustomTypeDialog } from './ui/CustomTypeDialog';
import { FactoryConfigDialog } from './ui/FactoryConfigDialog';
import { LeftPanel } from './ui/LeftPanel';
import { ProjectManagerDialog } from './ui/ProjectManagerDialog';
import { RightInspector } from './ui/RightInspector';
import { useShortcuts } from './ui/shortcuts';
import { TopToolbar } from './ui/TopToolbar';

const hasWebGL = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
})();

export default function App() {
  if (!hasWebGL) {
    return <div className="grid h-full place-items-center p-8 text-center text-slate-200">This app needs WebGL 2. Use a current Chrome, Edge or Firefox with hardware acceleration turned on.</div>;
  }
  if (new URLSearchParams(location.search).has('gallery')) return <ModelGallery />;
  return <Planner />;
}

function Planner() {
  const [ready, setReady] = useState(false);
  const { dialog, saveError, toast, showToast, showLeft, showRight, showBottom, toggle } = useUiStore();
  useShortcuts();

  useEffect(() => {
    let stop = () => {};
    (async () => {
      try {
        const id = await lastProjectId();
        const p = id && (await loadProject(id));
        if (p) openProject(p);
        else await saveNow();
      } catch {
        useUiStore.getState().setSaveStatus({ saveError: 'Browser storage is unavailable. Your work will not be saved — use Export JSON.' });
      }
      stop = startAutosave();
      setReady(true);
    })();
    return () => stop();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => showToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast, showToast]);

  if (!ready) return <div className="grid h-full place-items-center text-slate-400">Loading…</div>;

  return (
    <div
      className="grid h-full bg-slate-950"
      style={{
        gridTemplateColumns: `${showLeft ? 'clamp(180px,22vw,260px)' : '0px'} minmax(0,1fr) ${showRight ? 'clamp(200px,25vw,300px)' : '0px'}`,
        gridTemplateRows: `46px minmax(0,1fr) ${showBottom ? '118px' : '0px'}`,
      }}
    >
      <div className="col-span-3"><TopToolbar /></div>
      <div className="min-h-0 overflow-hidden">{showLeft && <LeftPanel />}</div>
      <div className="relative min-h-0">
        {saveError && <div className="absolute inset-x-0 top-0 z-10 bg-red-900/90 px-3 py-1 text-xs text-red-100">{saveError}</div>}
        <FactoryCanvas />
        {toast && <div className="absolute right-3 top-3 z-10 max-w-sm rounded bg-slate-800/95 px-3 py-2 text-xs text-slate-100 shadow">{toast}</div>}
        <PanelToggle className="left-0 top-1/2 -translate-y-1/2 rounded-r" open={showLeft} label="side panel" icons={['‹', '›']} onClick={() => toggle('showLeft')} />
        <PanelToggle className="right-0 top-1/2 -translate-y-1/2 rounded-l" open={showRight} label="inspector" icons={['›', '‹']} onClick={() => toggle('showRight')} />
        <PanelToggle className="bottom-0 left-1/2 -translate-x-1/2 rounded-t" open={showBottom} label="status bar" icons={['⌄', '⌃']} onClick={() => toggle('showBottom')} />
      </div>
      <div className="min-h-0 overflow-hidden">{showRight && <RightInspector />}</div>
      <div className="col-span-3 overflow-hidden">{showBottom && <BottomStatus />}</div>
      {dialog === 'factory' && <FactoryConfigDialog />}
      {dialog === 'projects' && <ProjectManagerDialog />}
      {dialog === 'customType' && <CustomTypeDialog />}
      {dialog === 'compare' && <CompareDialog />}
    </div>
  );
}

function PanelToggle({ className, open, label, icons, onClick }: { className: string; open: boolean; label: string; icons: [string, string]; onClick(): void }) {
  return (
    <button
      className={`absolute z-10 bg-slate-800/90 px-1.5 py-1 text-xs leading-none text-slate-300 hover:bg-slate-700 hover:text-white ${className}`}
      onClick={onClick}
      title={`${open ? 'Hide' : 'Show'} ${label}`}
      aria-label={`${open ? 'Hide' : 'Show'} ${label}`}
    >
      {open ? icons[0] : icons[1]}
    </button>
  );
}
