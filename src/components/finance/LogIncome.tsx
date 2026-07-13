import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, limit, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { logActivity } from '../../utils/logger';
import { db } from '../../firebase';
import { Income } from './types';
import { Check, Loader2, Search, X, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const INCOME_CATEGORIES = ['Food', 'Drinks', 'Meal Preps', 'Catering', 'Other'];

export default function LogIncome({ user, financeRole = 'owner' }: { user: any; financeRole?: string }) {
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Income[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Food',
    amount: '',
    notes: '',
  });

  // Search / filter are available to anyone above cashier level.
  const canManage = financeRole !== 'cashier';
  // Editing / deleting income entries is enforced admin-only server-side
  // (firestore.rules requires role 'admin', 'super_admin', or the info@ account),
  // so only show those controls to users who will actually pass that check.
  const isBackendAdmin =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    (user?.email || '').toLowerCase() === 'info@hemingwaysjomtien.com';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editForm, setEditForm] = useState({ date: '', category: 'Food', amount: '', notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'finance_income'), orderBy('created_at', 'desc'), limit(canManage ? 200 : 10));
    return onSnapshot(q, snap => setRecent(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Income[]));
  }, [canManage]);

  const filteredIncome = useMemo(() => {
    if (!canManage) return recent;
    return recent.filter(i => {
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (filterFrom && i.date < filterFrom) return false;
      if (filterTo && i.date > filterTo) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = `${i.category || ''} ${i.notes || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [recent, canManage, filterCategory, filterFrom, filterTo, searchTerm]);

  const hasActiveFilters = !!(searchTerm || filterCategory !== 'all' || filterFrom || filterTo);
  const clearFilters = () => { setSearchTerm(''); setFilterCategory('all'); setFilterFrom(''); setFilterTo(''); };

  const openEdit = (i: Income) => {
    setEditingIncome(i);
    setEditForm({ date: i.date || '', category: i.category || 'Food', amount: i.amount != null ? String(i.amount) : '', notes: i.notes || '' });
  };
  const closeEdit = () => setEditingIncome(null);

  const handleSaveEdit = async () => {
    if (!editingIncome) return;
    if (!editForm.amount || !editForm.date) {
      toast.error('Please fill in date and amount');
      return;
    }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'finance_income', editingIncome.id), {
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
      setEditingIncome(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update income — admin permissions required');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteIncome = async (i: Income) => {
    if (!window.confirm(`Delete this ${i.category || 'income'} entry for ฿${(i.amount || 0).toLocaleString()}? This cannot be undone.`)) return;
    setDeletingId(i.id);
    try {
      await deleteDoc(doc(db, 'finance_income', i.id));
      await logActivity(
        'Income Deleted',
        `฿${(i.amount || 0).toLocaleString()} · ${i.category || 'Other'} · ${i.date}`,
        'finance'
      );
      toast.success('Income deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete income — admin permissions required');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!formData.amount || !formData.date) {
      toast.error('Please fill in date and amount');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'finance_income'), {
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        logged_by: user?.email || 'unknown',
        created_at: new Date().toISOString(),
      });
      await logActivity(
        'Income Logged',
        `฿${parseFloat(formData.amount).toLocaleString()} · ${formData.category} · ${formData.date}${formData.notes ? ' · ' + formData.notes : ''}`,
        'finance'
      );
      toast.success('Income logged');
      setFormData(p => ({ ...p, amount: '', notes: '' }));
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => `฿${n.toLocaleString()}`;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-ink mb-6">Log Income</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900">
              {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (฿)</label>
            <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900 placeholder-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. busy lunch service" className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900 placeholder-gray-400" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="mt-6 w-full py-3 bg-[#1DA0A8] text-white rounded-2xl font-bold hover:bg-[#1DA0A8]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Check size={18} /> Log Income</>}
        </button>
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-ink mb-4">Recent Income</h3>

        {canManage && recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search category, notes..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900 placeholder-gray-400"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
            >
              <option value="all">All categories</option>
              {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900" />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 px-2 py-2">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        )}

        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No income logged yet</p>
        ) : filteredIncome.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No income entries match your filters</p>
        ) : (
          <div className="space-y-3">
            {filteredIncome.map(i => (
              <div key={i.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm text-ink">{i.category}</p>
                  <p className="text-xs text-gray-400">{i.date}{i.notes ? ` · ${i.notes}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600">{fmt(i.amount)}</span>
                  {isBackendAdmin && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(i)} className="text-gray-400 hover:text-[#1DA0A8] transition-colors" title="Edit income">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteIncome(i)}
                        disabled={deletingId === i.id}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Delete income"
                      >
                        {deletingId === i.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Income Modal */}
      {editingIncome && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Edit Income</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900">
                  {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (฿)</label>
                <input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeEdit} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#1DA0A8]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingEdit ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
