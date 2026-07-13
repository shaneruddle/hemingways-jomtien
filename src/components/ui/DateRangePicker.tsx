import { useState, useEffect, useRef } from 'react';
import { Calendar, X, ChevronDown } from 'lucide-react';

interface Props {
  from: string; // 'YYYY-MM-DD' or ''
  to: string;   // 'YYYY-MM-DD' or ''
  onChange: (from: string, to: string) => void;
  className?: string;
}

const fmt = (d: string) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export default function DateRangePicker({ from, to, onChange, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const label = !from && !to
    ? 'Any date'
    : from && to
      ? `${fmt(from)} – ${fmt(to)}`
      : from
        ? `From ${fmt(from)}`
        : `Until ${fmt(to)}`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] whitespace-nowrap"
      >
        <Calendar size={14} className="text-gray-400" />
        {label}
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-64">
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={e => onChange(e.target.value, to)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={e => onChange(from, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]"
            />
          </div>
          {(from || to) && (
            <button
              type="button"
              onClick={() => onChange('', '')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
            >
              <X size={12} /> Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
