import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { logActivity } from '../../utils/logger';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, X, RefreshCw, Download, StickyNote } from 'lucide-react';
import { MonthlySummaryRow } from './types';

const fmt = (n: number) => `฿${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: string) => (v.trim() === '' ? 0 : parseFloat(v) || 0);

const emptyForm = { label: '', balance: '', income: '', cogsExpense: '', operatingExpense: '', dividends: '' };
type FormState = typeof emptyForm;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Expense categories (see EXPENSE_CATEGORIES in LogExpense.tsx) that count as Cost of
// Goods Sold rather than Operating Expense for the auto-calculated Monthly Summary.
// Exported so monthlyReportPdf.ts uses the exact same categorization — never redefine
// this list a second time elsewhere.
export const COGS_CATEGORY_IDS = new Set(['food_expense', 'drink_expense', 'ice']);
export const COGS_CATEGORY_NAMES = new Set(['Food Expense', 'Drink Expense', 'Ice']);
export const DIVIDEND_CATEGORY_ID = 'dividends';
export const DIVIDEND_CATEGORY_NAME = 'Dividends';

// Auto-calculation only applies from July 2026 onward — earlier months were seeded
// manually from historical records and should not be silently overwritten from live data.
const AUTO_CALC_START = { year: 2026, month: 6 }; // month is 0-indexed (6 = July)

function isAutoCalcEligible(year: number, month: number) {
  return year > AUTO_CALC_START.year || (year === AUTO_CALC_START.year && month >= AUTO_CALC_START.month);
}

function formatMonthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month]} ${year}`;
}

// Parses labels like "July 2026" back into { year, month }. Returns null for labels
// that don't match that pattern (e.g. "Balance from old Accounts").
export function parseMonthLabel(label: string): { year: number; month: number } | null {
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const year = parseInt(parts[parts.length - 1], 10);
  if (!Number.isFinite(year)) return null;
  const monthName = parts.slice(0, -1).join(' ').toLowerCase();
  const month = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthName);
  if (month === -1) return null;
  return { year, month };
}

export function nextMonth(year: number, month: number) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

// Sums finance_income / finance_expenses for the given calendar month into the four
// fields Monthly Summary tracks. Dates in both collections are 'YYYY-MM-DD' strings.
async function computeMonthTotals(year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const { year: endYear, month: endMonth } = nextMonth(year, month);
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  const [incomeSnap, expenseSnap] = await Promise.all([
    getDocs(query(collection(db, 'finance_income'), where('date', '>=', startDate), where('date', '<', endDate))),
    getDocs(query(collection(db, 'finance_expenses'), where('date', '>=', startDate), where('date', '<', endDate))),
  ]);

  const income = incomeSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

  let cogsExpense = 0;
  let operatingExpense = 0;
  let dividends = 0;
  expenseSnap.docs.forEach(d => {
    const e = d.data();
    const total = e.total || 0;
    const isDividend = e.category_id === DIVIDEND_CATEGORY_ID || e.category_name === DIVIDEND_CATEGORY_NAME;
    const isCogs = (e.category_id && COGS_CATEGORY_IDS.has(e.category_id)) || COGS_CATEGORY_NAMES.has(e.category_name);
    if (isDividend) dividends += total;
    else if (isCogs) cogsExpense += total;
    else operatingExpense += total;
  });

  return { income, cogsExpense, operatingExpense, dividends };
}

export default function MonthlySummary() {
  const [rows, setRows] = useState<MonthlySummaryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<MonthlySummaryRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [noteRow, setNoteRow] = useState<MonthlySummaryRow | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(''); // 'YYYY-MM', Add-mode month picker
  const [autoCalcLoading, setAutoCalcLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  // Guards against out-of-order resolution: if the user changes the month while a
  // previous computeMonthTotals() call is still in flight, only the response for the
  // most recently requested month is allowed to write into the form.
  const autoCalcRequestId = useRef(0);

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
  // Fetched oldest-first (needed for nextOrder/lastNewBalance above); displayed newest-first.
  const displayRows = useMemo(() => (rows ? [...rows].reverse() : rows), [rows]);

  // Runs the live aggregation for a given month and fills it into the form. Used both
  // by the Add-mode month picker and the Edit-mode "Recalculate" button.
  const runAutoCalc = async (year: number, month: number) => {
    const requestId = ++autoCalcRequestId.current;
    setAutoCalcLoading(true);
    try {
      const totals = await computeMonthTotals(year, month);
      if (requestId !== autoCalcRequestId.current) return; // superseded by a newer request
      setForm(f => ({
        ...f,
        income: String(totals.income),
        cogsExpense: String(totals.cogsExpense),
        operatingExpense: String(totals.operatingExpense),
        dividends: String(totals.dividends),
      }));
      setAutoFilled(true);
    } catch (err) {
      if (requestId !== autoCalcRequestId.current) return; // superseded by a newer request
      console.error(err);
      toast.error('Failed to pull logged totals for that month');
    } finally {
      if (requestId === autoCalcRequestId.current) setAutoCalcLoading(false);
    }
  };

  const openAdd = () => {
    setEditingRow(null);
    setAutoFilled(false);

    // Default the picker to the month after the most recent existing row.
    const lastLabel = rows && rows.length > 0 ? rows[rows.length - 1].label : null;
    const parsedLast = lastLabel ? parseMonthLabel(lastLabel) : null;
    const now = new Date();
    const fallback = { year: now.getFullYear(), month: now.getMonth() };
    const { year, month } = parsedLast ? nextMonth(parsedLast.year, parsedLast.month) : fallback;

    setSelectedMonth(`${year}-${String(month + 1).padStart(2, '0')}`);
    setForm({ ...emptyForm, label: formatMonthLabel(year, month), balance: lastNewBalance ? String(lastNewBalance) : '' });
    setShowForm(true);
    runAutoCalc(year, month);
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return;
    const year = y;
    const month = m - 1;
    if (isAutoCalcEligible(year, month)) {
      setForm(f => ({ ...f, label: formatMonthLabel(year, month) }));
      runAutoCalc(year, month);
    } else {
      // Historical months are seeded manually — never auto-fill from live data, and
      // invalidate any in-flight request from a previously selected eligible month.
      autoCalcRequestId.current++;
      setAutoFilled(false);
      setForm(f => ({ ...f, label: formatMonthLabel(year, month), income: '', cogsExpense: '', operatingExpense: '', dividends: '' }));
    }
  };

  const openEdit = (r: MonthlySummaryRow) => {
    setEditingRow(r);
    setAutoFilled(false);
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

  const handleRecalc = () => {
    if (!editingRow) return;
    // Use the currently displayed label (which the user may have edited), not the
    // row's original label, so the fetched totals always match what will be saved.
    const parsed = parseMonthLabel(form.label);
    if (!parsed) return;
    runAutoCalc(parsed.year, parsed.month);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRow(null);
  };

  const previewProfit = num(form.income) - num(form.cogsExpense) - num(form.operatingExpense);
  const previewNewBalance = num(form.balance) + previewProfit - num(form.dividends);

  // Whether the currently-displayed label (which may have been edited) is eligible
  // for the "Recalculate" button — always derived from form.label, not the original
  // row, so eligibility and the fetch in handleRecalc agree on the same month.
  const editingParsed = editingRow ? parseMonthLabel(form.label) : null;
  const editingRecalcEligible = !!editingParsed && isAutoCalcEligible(editingParsed.year, editingParsed.month);

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

  const handleGenerateReport = async (r: MonthlySummaryRow) => {
    if (!rows) return;
    setGeneratingReportId(r.id);
    try {
      // Dynamically imported so the jsPDF/autotable bundle is only downloaded when a
      // report is actually requested, not by every visitor who loads this page.
      const { generateMonthlyReportPdf } = await import('./monthlyReportPdf');
      await generateMonthlyReportPdf(r, rows);
      await logActivity('Monthly Report Generated', r.label, 'finance');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReportId(null);
    }
  };

  const openNote = (r: MonthlySummaryRow) => {
    setNoteRow(r);
    setNoteText(r.notes || '');
  };

  const closeNote = () => {
    setNoteRow(null);
    setNoteText('');
  };

  const handleSaveNote = async () => {
    if (!noteRow) return;
    setSavingNote(true);
    try {
      await updateDoc(doc(db, 'finance_monthly_summary', noteRow.id), {
        notes: noteText.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'unknown',
      });
      await logActivity('Monthly Summary Note Updated', noteRow.label, 'finance');
      toast.success('Note saved');
      closeNote();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save note — super admin permissions required');
    } finally {
      setSavingNote(false);
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
                {(displayRows || []).map(r => (
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
                        <button
                          onClick={() => handleGenerateReport(r)}
                          disabled={generatingReportId === r.id}
                          className="text-gray-400 hover:text-[#1DA0A8] transition-colors disabled:opacity-50"
                          title="Generate partner report (PDF)"
                        >
                          {generatingReportId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                        <button
                          onClick={() => openNote(r)}
                          className={`transition-colors ${r.notes?.trim() ? 'text-[#1DA0A8]' : 'text-gray-400 hover:text-[#1DA0A8]'}`}
                          title={r.notes?.trim() ? 'View/edit note' : 'Add note'}
                        >
                          <StickyNote size={14} />
                        </button>
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
              {editingRow ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month label</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. July 2026"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                  />
                  {editingRecalcEligible && (
                    <button
                      type="button"
                      onClick={handleRecalc}
                      disabled={autoCalcLoading}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#1DA0A8] hover:text-[#18919a] disabled:opacity-50"
                    >
                      {autoCalcLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Recalculate from logged data
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => handleMonthChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900"
                  />
                </div>
              )}
              {autoFilled && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5 -mt-2">
                  {autoCalcLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Income / COGS / Operating / Dividends pulled from logged transactions for {form.label} — review before saving.
                </p>
              )}
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

      {noteRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeNote}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Note — {noteRow.label}</h3>
              <button onClick={closeNote} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Internal note for this month (not shown in partner reports)..."
              rows={6}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-gray-900 resize-none"
            />
            <div className="flex gap-3 mt-6">
              <button onClick={closeNote} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="flex-1 py-2.5 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#18919a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingNote ? (<><Loader2 size={16} className="animate-spin" /> Saving...</>) : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
