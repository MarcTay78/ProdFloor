import type { ReactNode } from 'react';

export function Dialog({ title, onClose, children, wide }: { title: string; onClose(): void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onMouseDown={onClose}>
      <div
        className={`flex max-h-[85vh] flex-col rounded-lg border border-slate-700 bg-slate-900 text-slate-200 shadow-xl ${wide ? 'w-[860px]' : 'w-[520px]'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
          <h2 className="text-sm font-medium">{title}</h2>
          <button className="px-2 text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export const btn = 'whitespace-nowrap rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent';
export const btnOn = 'whitespace-nowrap rounded border border-sky-500 bg-sky-900/60 px-2 py-1 text-xs text-sky-100';
export const input = 'rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-100 outline-none focus:border-sky-500';
