import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Supplier } from './types';
import { ChevronDown, Plus, Check } from 'lucide-react';

interface SupplierPickerProps {
  value: string;
  onChange: (name: string) => void;
  userEmail?: string;
  placeholder?: string;
  inputClassName?: string;
  label?: string;
  labelClassName?: string;
}

export default function SupplierPicker({
  value,
  onChange,
  userEmail,
  placeholder = 'e.g. Makro, local market',
  inputClassName = 'w-full border border-gray-200 rounded-xl px-4 py-2 pr-9 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]',
  label,
  labelClassName,
}: SupplierPickerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value || '');
  const [adding, setAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'finance_suppliers'), orderBy('name'));
    return onSnapshot(
      q,
      snap => setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier))),
      err => console.warn('Suppliers:', err.message)
    );
  }, []);

  useEffect(() => { setText(value || ''); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const trimmed = text.trim();
  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(trimmed.toLowerCase()));
  const exactMatch = suppliers.some(s => s.name.toLowerCase() === trimmed.toLowerCase());

  const selectSupplier = (name: string) => {
    onChange(name);
    setText(name);
    setOpen(false);
  };

  const handleAddNew = async () => {
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'finance_suppliers'), {
        name: trimmed,
        created_at: new Date().toISOString(),
        created_by: userEmail || 'unknown',
      });
      selectSupplier(trimmed);
    } catch (err) {
      console.error('Failed to add supplier', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className={labelClassName}>{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={e => { setText(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={inputClassName}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          tabIndex={-1}
        >
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
          {filtered.length === 0 && !trimmed && (
            <p className="px-4 py-3 text-sm text-gray-400 italic">No suppliers yet — start typing to add one</p>
          )}
          {filtered.length === 0 && trimmed && exactMatch === false && suppliers.length > 0 && (
            <p className="px-4 py-2.5 text-xs text-gray-400">No matching suppliers</p>
          )}
          {filtered.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSupplier(s.name)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              {s.name}
              {value === s.name && <Check size={14} className="text-[#1DA0A8]" />}
            </button>
          ))}
          {trimmed && !exactMatch && (
            <button
              type="button"
              onClick={handleAddNew}
              disabled={adding}
              className="w-full text-left px-4 py-2.5 text-sm text-[#1DA0A8] font-medium hover:bg-[#1DA0A8]/5 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
            >
              <Plus size={14} /> {adding ? 'Adding…' : `Add "${trimmed}" as new supplier`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
