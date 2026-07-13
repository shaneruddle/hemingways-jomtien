import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, X, Loader2, RefreshCw } from 'lucide-react';
import { EXPENSE_CATEGORIES } from './LogExpense';

const INCOME_CATEGORIES = ['Food', 'Drinks', 'Meal Preps', 'Catering', 'Other'];
const PAGE_SIZE = 50;

const fmt = (n: number) => `฿${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Row {
  id: string;
  date: string;
  time?: string;
  categoryLabel: string;
  who: string;
  amount: number;
  notes?: string;
}

export default function TransactionLedger({ kind }: { kind: 'expense' | 'income' }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const colName = kind === 'expense' ? 'finance_expenses' : 'finance_income';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getDocs(query(collection(db, colName), orderBy('date', 'desc')))
      .then(snap => {
        if (!active) return;
        const mapped: Row[] = snap.docs.map(d => {
          const data: any = d.data();
          if (kind === 'expense') {
            const dt = data.created_at ? new Date(data.created_at) : null;
            const timeStr = dt ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined;
            return {
              id: d.id,
              date: data.date,
              time: timeStr,
              categoryLabel: data.category_name || 'Uncategorized',
              who: data.supplier || 'Unknown supplier',
              amount: data.total || 0,
              notes: data.notes,
            };
          }
          return {
            id: d.id,
            date: data.date,
            categoryLabel: data.category || 'Uncategorized',
            who: data.notes || '',
            amount: data.amount || 0,
            notes: data.notes,
          };
        });
        setRows(mapped);
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
    return () => { active = false; };
  }, [colName, kind, refreshKey]);

  const categories = useMemo(
    () => (kind === 'expense' ? EXPENSE_CATEGORIES.map(c => c.name) : INCOME_CATEGORIES),
    [kind]
  );

  const filtered = useMemo(() => {
    const source = rows ?? [];
    return source.filter(r => {
      if (filterCategory !== 'all' && r.categoryLabel !== filterCategory) return false;
      if (filterFrom && r.date < filterFrom) return false;
      if (filterTo && r.date > filterTo) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const hay = `${r.who} ${r.categoryLabel} ${r.notes || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, filterCategory, filterFrom, filterTo, searchTerm]);

  useEffect(() => { setPage(1); }, [filterCategory, filterFrom, filterTo, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const filteredTotal = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const hasActiveFilters = !!(searchTerm || filterCategory !== 'all' || filterFrom || filterTo);
  const clearFilters = () => { setSearchTerm(''); setFilterCategory('all'); setFilterFrom(''); setFilterTo(''); };

  const title = kind === 'expense' ? 'All Expenses' : 'All Income';
  const amountColor = kind === 'expense' ? 'text-red-500' : 'text-green-600';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink">{title}</h3>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1DA0A8] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={kind === 'expense' ? 'Search supplier, category, notes...' : 'Search category, notes...'}
            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
        />
        <span className="text-gray-400 text-sm">to</span>
        <input
          type="date"
          value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
        />
        {hasActiveFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 px-2 py-2">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {loading && (
        <p className="text-xs text-gray-400 italic mb-3 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading...</p>
      )}
      {error && <p className="text-xs text-red-500 mb-3">Couldn't load: {error}</p>}

      {!loading && !error && filtered.length > 0 && (
        <p className="text-sm text-gray-600 mb-3">Total: <span className="font-bold text-gray-900">{fmt(filteredTotal)}</span></p>
      )}

      {!loading && !error && (
        rows && rows.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-6">No {kind === 'expense' ? 'expenses' : 'income'} logged yet</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-6">No entries match your filters</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Date</th>
                  {kind === 'expense' && <th className="px-4 py-3">Time</th>}
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">{kind === 'expense' ? 'Supplier' : 'Notes'}</th>
                  {kind === 'expense' && <th className="px-4 py-3">Description</th>}
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.date}</td>
                    {kind === 'expense' && <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.time || ''}</td>}
                    <td className="px-4 py-3 text-gray-600">{r.categoryLabel}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{r.who || ''}</td>
                    {kind === 'expense' && <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.notes || ''}</td>}
                    <td className={`px-4 py-3 text-right font-bold ${amountColor}`}>{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-500 px-1">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
