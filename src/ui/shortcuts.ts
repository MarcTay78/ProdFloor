import { useEffect } from 'react';
import { normDeg } from '../domain/geometry';
import { activeLayout, redo, undo, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const ui = useUiStore.getState();
      const store = useProjectStore.getState();
      const id = ui.selectedId;
      const key = e.key.toLowerCase();
      if (ctrl && key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (e.key === 'Escape') { ui.select(null); return; }
      if (!id) return;
      const m = activeLayout(store.project).machines.find((x) => x.id === id);
      if (!m) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { store.deleteMachines([id]); ui.select(null); }
      else if (ctrl && key === 'd') { e.preventDefault(); const copy = store.duplicateMachine(id); if (copy) ui.select(copy); }
      else if (!ctrl && key === 'r') store.updateMachine(id, { rotation: normDeg(m.rotation + (e.shiftKey ? -90 : 90)) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
