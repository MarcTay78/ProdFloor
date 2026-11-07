import { useEffect, useState } from 'react';

interface Props {
  label: string;
  value: number;
  onCommit(v: number): void;
  min?: number;
  max?: number;
  unit?: string;
  digits?: number;
}

const fmt = (v: number, digits: number) => String(+v.toFixed(digits));

/** Numeric input that commits on Enter/blur and refuses invalid values. */
export function NumberField({ label, value, onCommit, min, max, unit = 'm', digits = 2 }: Props) {
  const [text, setText] = useState(fmt(value, digits));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(fmt(value, digits));
    setBad(false);
  }, [value, digits]);

  const commit = () => {
    const v = Number(text);
    const ok = text.trim() !== '' && Number.isFinite(v) && (min === undefined || v >= min) && (max === undefined || v <= max);
    setBad(!ok);
    if (ok && v !== value) onCommit(v);
  };

  const hint = [min !== undefined && `≥ ${min}`, max !== undefined && `≤ ${max}`].filter(Boolean).join(', ');
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-400">
      <span className="truncate">{label}</span>
      <span className="flex items-center gap-1">
        <input
          className={`w-20 rounded border bg-slate-800 px-1.5 py-0.5 text-right text-slate-100 outline-none focus:border-sky-500 ${bad ? 'border-red-500' : 'border-slate-600'}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          title={bad ? `Enter a number${hint ? ` ${hint}` : ''}` : undefined}
        />
        <span className="w-4 text-slate-500">{unit}</span>
      </span>
    </label>
  );
}
