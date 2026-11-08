import { useUiStore } from '../store/uiStore';
import { LeftLibrary } from './LeftLibrary';
import { SuggestionsPanel, useSuggestions } from './SuggestionsPanel';
import { WorkflowPanel } from './WorkflowPanel';

const tab = (on: boolean) =>
  `min-w-0 flex-auto truncate px-1.5 py-1.5 text-xs ${on ? 'border-b-2 border-sky-500 text-sky-200' : 'border-b border-slate-700 text-slate-400 hover:text-slate-200'}`;

export function LeftPanel() {
  const { leftTab, setLeftTab } = useUiStore();
  const count = useSuggestions().length;
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900">
      <div className="flex border-r border-slate-700">
        <button className={tab(leftTab === 'library')} aria-pressed={leftTab === 'library'} onClick={() => setLeftTab('library')}>Library</button>
        <button className={tab(leftTab === 'workflow')} aria-pressed={leftTab === 'workflow'} onClick={() => setLeftTab('workflow')}>Workflow</button>
        <button className={tab(leftTab === 'suggestions')} aria-pressed={leftTab === 'suggestions'} onClick={() => setLeftTab('suggestions')} title={`${count} suggestion${count === 1 ? '' : 's'}`}>
          Suggestions{count ? ` (${count})` : ''}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {leftTab === 'library' ? <LeftLibrary /> : leftTab === 'workflow' ? <WorkflowPanel /> : <SuggestionsPanel />}
      </div>
    </div>
  );
}
