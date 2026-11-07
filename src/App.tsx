import { useEffect, useState } from 'react';
import { FactoryCanvas } from './scene/FactoryCanvas';
import { ModelGallery } from './scene/ModelGallery';
import { lastProjectId, loadProject, saveNow, startAutosave } from './store/persistence';
import { openProject } from './store/projectStore';
import { useUiStore } from './store/uiStore';
import { BottomStatus } from './ui/BottomStatus';
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
  const { dialog, saveError, toast, showToast } = useUiStore();
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
    <div className="grid h-full grid-cols-[clamp(180px,22vw,260px)_minmax(0,1fr)_clamp(200px,25vw,300px)] grid-rows-[46px_minmax(0,1fr)_118px] bg-slate-950">
      <div className="col-span-3"><TopToolbar /></div>
      <LeftPanel />
      <div className="relative min-h-0">
        {saveError && <div className="absolute inset-x-0 top-0 z-10 bg-red-900/90 px-3 py-1 text-xs text-red-100">{saveError}</div>}
        <FactoryCanvas />
        {toast && <div className="absolute right-3 top-3 z-10 max-w-sm rounded bg-slate-800/95 px-3 py-2 text-xs text-slate-100 shadow">{toast}</div>}
      </div>
      <RightInspector />
      <div className="col-span-3"><BottomStatus /></div>
      {dialog === 'factory' && <FactoryConfigDialog />}
      {dialog === 'projects' && <ProjectManagerDialog />}
      {dialog === 'customType' && <CustomTypeDialog />}
    </div>
  );
}
