import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logActivity } from '../../utils/logger';
import { toast } from 'sonner';
import { Search, X, Loader2, RefreshCw, Pencil, Trash2, ExternalLink, ImageOff } from 'lucide-react';
import { EXPENSE_CATEGORIES } from './LogExpense';

function gsToUrl(gs: string): string {
  if (!gs || !gs.startsWith('gs://')) return gs;
  const without = gs.replace('gs://', '');
  const slash = without.indexOf('/');
  const bucket = without.slice(0, slash);
  const path = without.slice(slash + 1);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

const INCOME_CATEGORIES = ['Food', 'Drinks', 'Meal Preps', 'Catering', 'Other'];
const PAGE_SIZE = 50;

const fmt = (n: number) => `฿${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Row {
  id: string;
  date: string;
  time?: string;
  categoryId?: string;
  categoryLabel: string;
  who: string;
  amount: number;
  notes?: string;
  receiptUrl?: string;
}

export default function TransactionLedger({ kind, financeRole = 'owner' }: { kind: 'expense' | 'income'; financeRole?: string }) {
  const canManage = financeRole !== 'cashier';
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ date: '', category_id: '', category_name: '', category: '', amount: '', notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
              categoryId: data.category_id || '',
              categoryLabel: data.category_name || 'Uncategorized',
              who: data.supplier || 'Unknown supplier',
              amount: data.total || 0,
              notes: data.notes,
              receiptUrl: data.receipt_url || '',
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

  const openEdit = (r: Row) => {
    setEditingRow(r);
    setEditForm({
      date: r.date,
      category_id: r.categoryId || '',
      category_name: r.categoryLabel,
      category: r.categoryLabel,
      amount: String(r.amount),
      notes: r.notes || '',
    });
  };

  const closeEdit = () => setEditingRow(null);

  const handleEditCategoryChange = (id: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === id);
    setEditForm(f => ({ ...f, category_id: id, category_name: cat?.name || id }));
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    if (!editForm.amount) {
      toast.error('Amount is required');
      return;
    }
    setSavingEdit(true);
    try {
      if (kind === 'expense') {
        await updateDoc(doc(db, 'finance_expenses', editingRow.id), {
          category_id: editForm.category_id,
          category_name: editForm.category_name,
          total: parseFloat(editForm.amount),
          notes: editForm.notes,
        });
        await logActivity(
          'Expense Edited',
          `฿${parseFloat(editForm.amount).toLocaleString()} · ${editForm.category_name} · ${editingRow.who || 'no supplier'} · ${editingRow.date}`,
          'finance'
        );
        toast.success('Expense updated');
      } else {
        await updateDoc(doc(db, 'finance_income', editingRow.id), {
          date: editForm.date,
          category: editForm.category,
          amount: parseFloat(editForm.amount),
          notes: editForm.notes,
        });
        await logActivity(
          'Income Edited',
          `฿${parseFloat(editForm.amount).toLocaleString()} · ${editForm.category} · ${editForm.date}${editForm.notes ? ' · ' + editForm.notes : ''}`,
          'finance'
        );
        toast.success('Income updated');
      }
      setEditingRow(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error(err);
      toast.error(kind === 'expense' ? 'Failed to update expense - admin permissions required' : 'Failed to update income - admin permissions required');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRow = async (r: Row) => {
    const label = r.categoryLabel || (kind === 'expense' ? 'expense' : 'income');
    if (!window.confirm(`Delete this ${label} entry for ${fmt(r.amount)}? This cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await deleteDoc(doc(db, colName, r.id));
      await logActivity(
        kind === 'expense' ? 'Expense Deleted' : 'Income Deleted',
        kind === 'expense'
          ? `${fmt(r.amount)} · ${r.categoryLabel || 'Uncategorized'} · ${r.who || 'no supplier'} · ${r.date}`
          : `${fmt(r.amount)} · ${r.categoryLabel || 'Other'} · ${r.date}`,
        'finance'
      );
      toast.success(kind === 'expense' ? 'Expense deleted' : 'Income deleted');
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error(err);
      toast.error(kind === 'expense' ? 'Failed to delete expense - admin permissions required' : 'Failed to delete income - admin permissions required');
    } finally {
      setDeletingId(null);
    }
  };

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
                  {kind === 'expense' && <th className="px-4 py-3 text-center">Receipt</th>}
                  {canManage && <th className="px-4 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => {
                  const receiptUrl = r.receiptUrl ? gsToUrl(r.receiptUrl) : null;
                  return (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.date}</td>
                      {kind === 'expense' && <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.time || ''}</td>}
                      <td className="px-4 py-3 text-gray-600">{r.categoryLabel}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{r.who || ''}</td>
                      {kind === 'expense' && <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.notes || ''}</td>}
                      <td className={`px-4 py-3 text-right font-bold ${amountColor}`}>{fmt(r.amount)}</td>
                      {kind === 'expense' && (
                        <td className="px-4 py-3 text-center">
                          {receiptUrl ? (
                            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#1DA0A8] hover:underline">
                              <ExternalLink size={13} /> View
                            </a>
                          ) : (
                            <span className="text-gray-300"><ImageOff size={14} /></span>
                          )}
                        </td>
                      )}
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-[#1DA0A8] transition-colors" title={kind === 'expense' ? 'Edit expense' : 'Edit income'}>
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(r)}
                              disabled={deletingId === r.id}
                              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title={kind === 'expense' ? 'Delete expense' : 'Delete income'}
                            >
                              {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
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

      {editingRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">{kind === 'expense' ? 'Edit Expense' : 'Edit Income'}</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {kind === 'expense' && (
              <p className="text-xs text-gray-400 mb-4">
                {editingRow.date} · {editingRow.who || 'no supplier'} — date and supplier can't be changed here.
              </p>
            )}
            <div className="space-y-4">
              {kind === 'income' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                {kind === 'expense' ? (
                  <select
                    value={editForm.category_id}
                    onChange={e => handleEditCategoryChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                  >
                    {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{kind === 'expense' ? 'Total (฿)' : 'Amount (฿)'}</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes{kind === 'income' ? ' (optional)' : ''}</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeEdit} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#18919a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingEdit ? (<><Loader2 size={16} className="animate-spin" /> Saving...</>) : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
