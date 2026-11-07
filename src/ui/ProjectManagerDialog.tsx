import { useCallback, useEffect, useState } from 'react';
import { asNewProject, createProject } from '../domain/projectFile';
import { deleteProject, listProjects, loadProject, saveNow, saveProject, type ProjectIndexEntry } from '../store/persistence';
import { openProject, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Dialog, btn, input } from './Dialog';

export function ProjectManagerDialog() {
  const project = useProjectStore((s) => s.project);
  const store = useProjectStore();
  const close = () => useUiStore.getState().openDialog(null);
  const [list, setList] = useState<ProjectIndexEntry[]>([]);
  const [newName, setNewName] = useState('');
  const refresh = useCallback(async () => {
    await saveNow();
    setList(await listProjects());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const open = async (id: string) => {
    await saveNow();
    const p = await loadProject(id);
    if (!p) return;
    openProject(p);
    useUiStore.getState().select(null);
    await refresh();
  };
  const rename = async (e: ProjectIndexEntry, name: string) => {
    if (!name.trim() || name === e.name) return;
    if (e.id === project.id) store.renameProject(name.trim());
    else {
      const p = await loadProject(e.id);
      if (p) await saveProject({ ...p, name: name.trim(), updatedAt: new Date().toISOString() });
    }
    await refresh();
  };
  const duplicate = async (id: string) => {
    await saveNow();
    const p = await loadProject(id);
    if (p) await saveProject(asNewProject(p, `${p.name} (copy)`));
    await saveNow();
    await refresh();
  };
  const remove = async (e: ProjectIndexEntry) => {
    if (!confirm(`Delete project "${e.name}"? This can't be undone.`)) return;
    await deleteProject(e.id);
    await refresh();
  };
  const create = async () => {
    await saveNow();
    openProject(createProject(newName.trim() || 'New factory'));
    useUiStore.getState().select(null);
    setNewName('');
    await refresh();
  };

  return (
    <Dialog title="Projects and layouts" onClose={close} wide>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Projects saved in this browser</h3>
      <div className="space-y-1">
        {list.map((e) => (
          <div key={e.id} className={`flex items-center gap-2 rounded border px-2 py-1 ${e.id === project.id ? 'border-sky-600' : 'border-slate-700'}`}>
            <input key={e.name} className={`${input} w-64`} defaultValue={e.name} onBlur={(ev) => rename(e, ev.target.value)} />
            <span className="flex-1 text-[11px] text-slate-500">Updated {new Date(e.updatedAt).toLocaleString()}</span>
            {e.id === project.id ? <span className="text-xs text-sky-300">Open</span> : <button className={btn} onClick={() => open(e.id)}>Open</button>}
            <button className={btn} onClick={() => duplicate(e.id)}>Duplicate</button>
            <button className={`${btn} text-red-300`} disabled={e.id === project.id} title={e.id === project.id ? 'Open another project first' : undefined} onClick={() => remove(e)}>Delete</button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input className={`${input} w-64`} placeholder="New project name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className={btn} onClick={create}>New project</button>
      </div>

      <h3 className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-slate-500">Layouts in “{project.name}”</h3>
      <div className="space-y-1">
        {project.layouts.map((l) => (
          <div key={l.id} className={`flex items-center gap-2 rounded border px-2 py-1 ${l.id === project.activeLayoutId ? 'border-sky-600' : 'border-slate-700'}`}>
            <input key={l.name} className={`${input} w-64`} defaultValue={l.name} onBlur={(ev) => ev.target.value.trim() && ev.target.value !== l.name && store.renameLayout(l.id, ev.target.value.trim())} />
            <span className="flex-1 text-[11px] text-slate-500">{l.machines.length} machines · {l.factory.length} × {l.factory.width} m</span>
            {l.id === project.activeLayoutId ? <span className="text-xs text-sky-300">Active</span> : <button className={btn} onClick={() => store.setActiveLayout(l.id)}>Switch</button>}
            <button className={btn} onClick={() => store.duplicateLayout(l.id)}>Duplicate</button>
            <button className={`${btn} text-red-300`} disabled={project.layouts.length <= 1} onClick={() => confirm(`Delete layout "${l.name}"?`) && store.deleteLayout(l.id)}>Delete</button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button className={btn} onClick={() => store.addLayout()}>+ New empty layout (same building)</button>
        <button className={btn} onClick={() => store.addWhitePartLayout()}>+ White-part production line</button>
      </div>
    </Dialog>
  );
}
