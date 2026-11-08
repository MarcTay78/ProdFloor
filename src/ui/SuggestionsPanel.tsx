import { recommend, type Suggestion } from '../domain/recommend';
import type { Layout, MachineType } from '../domain/types';
import { activeLayout, useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { btn } from './Dialog';

const cache = new WeakMap<Layout, { types: MachineType[]; list: Suggestion[] }>();

/** recommend() for the active layout, cached per layout object so the tab badge and the panel share one run. */
export function useSuggestions(): Suggestion[] {
  const project = useProjectStore((s) => s.project);
  const layout = activeLayout(project);
  const hit = cache.get(layout);
  if (hit && hit.types === project.customTypes) return hit.list;
  const list = recommend(layout, project);
  cache.set(layout, { types: project.customTypes, list });
  return list;
}

export function SuggestionsPanel() {
  const list = useSuggestions();
  const { focus, select, showToast } = useUiStore();
  const autoArrangeLayout = useProjectStore((s) => s.autoArrangeLayout);
  const arrange = () => {
    const r = autoArrangeLayout();
    select(null);
    showToast(
      r.swaps
        ? `Auto-arranged: ${r.swaps} swap${r.swaps === 1 ? '' : 's'}, saves ${r.saved.toFixed(1)} m. Original kept — use Compare.`
        : 'No better arrangement found.',
    );
  };
  return (
    <div className="h-full overflow-y-auto border-r border-slate-700 bg-slate-900 p-2 text-slate-200">
      <button
        className={`${btn} mb-2 w-full py-1.5`}
        onClick={arrange}
        disabled={!list.some((s) => s.code === 'SWAP_SAVES')}
        title="Repeatedly applies the best machine swap and saves the result as a new layout"
      >
        Auto-arrange → new layout
      </button>
      {list.length === 0 ? (
        <p className="p-2 text-xs text-slate-400">No suggestions</p>
      ) : (
        <ul className="space-y-1">
          {list.map((s, i) => (
            <li key={i}>
              <button
                className="w-full rounded border border-slate-700 px-2 py-1.5 text-left text-xs hover:bg-slate-800 disabled:cursor-default disabled:hover:bg-transparent"
                disabled={!s.machineIds.length}
                onClick={() => focus(s.machineIds[0])}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
