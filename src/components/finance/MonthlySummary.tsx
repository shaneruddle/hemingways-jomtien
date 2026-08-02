import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { logActivity } from '../../utils/logger';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { MonthlySummaryRow } from './types';

const fmt = (n: number) => `฿${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: string) => (v.trim() === '' ? 0 : parseFloat(v) || 0);

const emptyForm = { label: '', balance: '', income: '', cogsExpense: '', operatingExpense: '', dividends: '' };
type FormState = typeof emptyForm;

export default function MonthlySummary() {
  const [rows, setRows] = useState<MonthlySummaryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<MonthlySummaryRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'finance_monthly_summary'), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      snap => {
        setRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlySummaryRow)));
        setLoading(false);
      },
      err => {
        console.error(err);
        setError(err.message || 'Failed to load');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const nextOrder = useMemo(
    () => (rows && rows.length > 0 ? Math.max(...rows.map(r => r.order)) + 1 : 0),
    [rows]
  );
  const lastNewBalance = useMemo(
    () => (rows && rows.length > 0 ? rows[rows.length - 1].newBalance : 0),
    [rows]
  );

  const openAdd = () => {
    setEditingRow(null);
    setForm({ ...emptyForm, balance: lastNewBalance ? String(lastNewBalance) : '' });
    setShowForm(true);
  };

  const openEdit = (r: MonthlySummaryRow) => {
    setEditingRow(r);
    setForm({
      label: r.label,
      balance: String(r.balance ?? ''),
      income: String(r.income ?? ''),
      cogsExpense: String(r.cogsExpense ?? ''),
      operatingExpense: String(r.operatingExpense ?? ''),
      dividends: String(r.dividends ?? ''),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRow(null);
  };

  const previewProfit = num(form.income) - num(form.cogsExpense) - num(form.operatingExpense);
  const previewNewBalance = num(form.balance) + previewProfit - num(form.dividends);

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Month label is required');
      return;
    }
    setSaving(true);
    const balance = num(form.balance);
    const income = num(form.income);
    const cogsExpense = num(form.cogsExpense);
    const operatingExpense = num(form.operatingExpense);
    const dividends = num(form.dividends);
    const profit = income - cogsExpense - operatingExpense;
    const newBalance = balance + profit - dividends;
    const nowIso = new Date().toISOString();

    try {
      if (editingRow) {
        await updateDoc(doc(db, 'finance_monthly_summary', editingRow.id), {
          label: form.label.trim(),
          balance,
          income,
          cogsExpense,
          operatingExpense,
          dividends,
          profit,
          newBalance,
          updatedAt: nowIso,
          updatedBy: auth.currentUser?.email || 'unknown',
        });
        await logActivity('Monthly Summary Edited', `${form.label.trim()} · New Balance ${fmt(newBalance)}`, 'finance');
        toast.success('Month updated');
      } else {
        await addDoc(collection(db, 'finance_monthly_summary'), {
          order: nextOrder,
          label: form.label.trim(),
          balance,
          income,
          cogsExpense,
          operatingExpense,
          dividends,
          profit,
          newBalance,
          createdAt: nowIso,
          updatedAt: nowIso,
          updatedBy: auth.currentUser?.email || 'unknown',
        });
        await logActivity('Monthly Summary Added', `${form.label.trim()} · New Balance ${fmt(newBalance)}`, 'finance');
        toast.success('Month added');
      }
      closeForm();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save — super admin permissions required');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: MonthlySummaryRow) => {
    if (!window.confirm(`Delete "${r.label}"? This cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await deleteDoc(doc(db, 'finance_monthly_summary', r.id));
      await logActivity('Monthly Summary Deleted', r.label, 'finance');
      toast.success('Month deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete — super admin permissions required');
    } finally {
      setDeletingId(null);
    }
  };

  const totals = useMemo(() => {
    const src = rows || [];
    return {
      income: src.reduce((s, r) => s + (r.income || 0), 0),
      cogsExpense: src.reduce((s, r) => s + (r.cogsExpense || 0), 0),
      operatingExpense: src.reduce((s, r) => s + (r.operatingExpense || 0), 0),
      profit: src.reduce((s, r) => s + (r.profit || 0), 0),
      dividends: src.reduce((s, r) => s + (r.dividends || 0), 0),
    };
  }, [rows]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Monthly Summary</h1>
          <p className="text-xs text-gray-400 mt-1">Super admin only · running balance, income, expenses, profit &amp; dividends by month</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#1DA0A8] text-white rounded-xl text-sm font-bold hover:bg-[#18919a] transition-all"
        >
          <Plus size={16} /> Add Month
        </button>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 italic flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Loading...
        </p>
      )}
      {error && <p className="text-xs text-red-500">Couldn't load: {error}</p>}

      {!loading && !error && (
        rows && rows.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-10 bg-white rounded-2xl border border-gray-100">
            No months logged yet
          </p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Income</th>
                  <th className="px-4 py-3 text-right">COGS Expense</th>
                  <th className="px-4 py-3 text-right">Operating Expense</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">Dividends</th>
                  <th className="px-4 py-3 text-right">New Balance</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(rows || []).map(r => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{r.label}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(r.balance)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(r.income)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(r.cogsExpense)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(r.operatingExpense)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.profit)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(r.dividends)}</td>
                    <td className="px-4 py-3 text-right font-bold text-ink">{fmt(r.newBalance)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-[#1DA0A8] transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows && rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-100 bg-cream/50 font-bold">
                    <td className="px-4 py-3 text-ink">All-time</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right text-green-600">{fmt(totals.income)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(totals.cogsExpense)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{fmt(totals.operatingExpense)}</td>
                    <td className={`px-4 py-3 text-right ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.profit)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(totals.dividends)}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeForm}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">{editingRow ? 'Edit Month' : 'Add Month'}</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month label</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. July 2026"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Balance (starting, ฿)</label>
                <input
                  type="number"
                  value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Income (฿)</label>
                <input
                  type="number"
                  value={form.income}
                  onChange={e => setForm(f => ({ ...f, income: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">COGS Expense (฿)</label>
                <input
                  type="number"
                  value={form.cogsExpense}
                  onChange={e => setForm(f => ({ ...f, cogsExpense: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Expense (฿)</label>
                <input
                  type="number"
                  value={form.operatingExpense}
                  onChange={e => setForm(f => ({ ...f, operatingExpense: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dividends (฿)</label>
                <input
                  type="number"
                  value={form.dividends}
                  onChange={e => setForm(f => ({ ...f, dividends: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div className="text-center p-3 bg-cream rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Profit (auto)</p>
                  <p className={`font-bold ${previewProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(previewProfit)}</p>
                </div>
                <div className="text-center p-3 bg-cream rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">New Balance (auto)</p>
                  <p className="font-bold text-ink">{fmt(previewNewBalance)}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeForm} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#18919a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (<><Loader2 size={16} className="animate-spin" /> Saving...</>) : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
