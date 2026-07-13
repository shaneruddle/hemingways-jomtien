import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, getDocs, query, updateDoc, deleteDoc, doc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { logActivity } from '../../utils/logger';
import { db } from '../../firebase';
import { ExpenseItem } from './types';
import { Check, Loader2, Trash2, Plus, ExternalLink, ImageOff, Search, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';

function gsToUrl(gs: string): string {
  if (!gs || !gs.startsWith('gs://')) return gs;
  const without = gs.replace('gs://', '');
  const slash = without.indexOf('/');
  const bucket = without.slice(0, slash);
  const path = without.slice(slash + 1);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

interface FinanceExpense {
  id: string;
  date: string;
  created_at: string;
  supplier: string;
  category_id?: string;
  category_name: string;
  notes: string;
  total: number;
  receipt_url: string;
}

const EXPENSE_CATEGORIES = [
  // Food & Drink
  { id: 'food_expense',          name: 'Food Expense' },
  { id: 'drink_expense',         name: 'Drink Expense' },
  { id: 'staff_food',            name: 'Staff Food' },
  { id: 'ice',                   name: 'Ice' },
  // Staff
  { id: 'salary_staff',          name: 'Salary & Staff Advances' },
  { id: 'tip_transfer',          name: 'Tip Transfer' },
  { id: 'social_security',       name: 'Social Security' },
  // Utilities
  { id: 'electricity',           name: 'Electricity' },
  { id: 'water_bill',            name: 'Water Bill from PEA' },
  { id: 'gas',                   name: 'Gas' },
  { id: 'internet',              name: 'Internet' },
  { id: 'mobile_phone',          name: 'Mobile Phone' },
  { id: 'cleaning_supplies',     name: 'Cleaning & Supplies' },
  { id: 'subscriptions',         name: 'Subscriptions' },
  // Equipment & Property
  { id: 'kitchen_equipment',     name: 'Kitchen Equipment' },
  { id: 'restaurant_equipment',  name: 'Restaurant Equipment' },
  { id: 'computer_hardware',     name: 'Computer - Hardware' },
  { id: 'renovation_costs',      name: 'Renovation Costs' },
  { id: 'repairs_maintenance',   name: 'Repairs & Maintenance' },
  { id: 'rent_expense',          name: 'Rent Expense' },
  // Admin & Professional
  { id: 'accounting_services',   name: 'Accounting Services' },
  { id: 'advertising_promotion', name: 'Advertising & Promotion' },
  { id: 'professional_fees',     name: 'Professional Fees' },
  { id: 'licenses',              name: 'Licenses' },
  // General
  { id: 'office_supplies',       name: 'Office Supplies' },
  { id: 'newspapers',            name: 'Newspapers' },
  { id: 'vouchers',              name: 'Vouchers' },
  { id: 'taxi',                  name: 'Taxi' },
  { id: 'fuel_petrol',           name: 'Fuel & Petrol' },
  { id: 'dividends',             name: 'Dividends' },
  { id: 'miscellaneous',         name: 'Miscellaneous' },
  { id: 'uncategorized',         name: 'Uncategorized Expense' },
];

const INPUT_CLS = 'w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]';
const LBL_CLS  = 'block text-sm font-medium text-gray-700 mb-1';

export default function LogExpense({ user, financeRole = 'owner' }: { user: any; financeRole?: string }) {
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const canManage = financeRole !== 'cashier';

  // Edit / delete / search / filter state (admin & manager only)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [editForm, setEditForm] = useState({ category_id: '', category_name: '', total: '', notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'finance_expenses'), orderBy('created_at', 'desc'), limit(canManage ? 300 : 50));
    return onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinanceExpense)));
    });
  }, [canManage]);

  const filteredExpenses = useMemo(() => {
    if (!canManage) return expenses;
    return expenses.filter(exp => {
      if (filterCategory !== 'all' && exp.category_id !== filterCategory && exp.category_name !== filterCategory) return false;
      if (filterFrom && exp.date < filterFrom) return false;
      if (filterTo && exp.date > filterTo) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = `${exp.supplier || ''} ${exp.category_name || ''} ${exp.notes || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [expenses, canManage, filterCategory, filterFrom, filterTo, searchTerm]);

  const hasActiveFilters = !!(searchTerm || filterCategory !== 'all' || filterFrom || filterTo);
  const clearFilters = () => { setSearchTerm(''); setFilterCategory('all'); setFilterFrom(''); setFilterTo(''); };

  const openEdit = (exp: FinanceExpense) => {
    setEditingExpense(exp);
    setEditForm({
      category_id: exp.category_id || '',
      category_name: exp.category_name || '',
      total: exp.total != null ? String(exp.total) : '',
      notes: exp.notes || '',
    });
  };
  const closeEdit = () => setEditingExpense(null);
  const handleEditCategoryChange = (id: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === id);
    setEditForm(f => ({ ...f, category_id: id, category_name: cat?.name || id }));
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;
    if (!editForm.total) {
      toast.error('Total is required');
      return;
    }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'finance_expenses', editingExpense.id), {
        category_id: editForm.category_id,
        category_name: editForm.category_name,
        total: parseFloat(editForm.total),
        notes: editForm.notes,
      });
      await logActivity(
        'Expense Edited',
        `฿${parseFloat(editForm.total).toLocaleString()} · ${editForm.category_name} · ${editingExpense.supplier || 'no supplier'} · ${editingExpense.date}`,
        'finance'
      );
      toast.success('Expense updated');
      setEditingExpense(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update expense');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteExpense = async (exp: FinanceExpense) => {
    if (!window.confirm(`Delete this ${exp.category_name || 'expense'} entry for ฿${(exp.total || 0).toLocaleString()}? This cannot be undone.`)) return;
    setDeletingId(exp.id);
    try {
      await deleteDoc(doc(db, 'finance_expenses', exp.id));
      await logActivity(
        'Expense Deleted',
        `฿${(exp.total || 0).toLocaleString()} · ${exp.category_name || 'Uncategorized'} · ${exp.supplier || 'no supplier'} · ${exp.date}`,
        'finance'
      );
      toast.success('Expense deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    supplier: '',
    category_id: 'food_expense',
    category_name: 'Food Expense',
    total: '',
    notes: '',
    items: [] as ExpenseItem[],
  });

  const set = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleCategoryChange = (id: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === id);
    set('category_id', id);
    set('category_name', cat?.name || id);
  };

  const addItem = () =>
    set('items', [...formData.items, { description: '', quantity: null, unit: '', unit_price: null, total_price: null }]);

  const removeItem = (idx: number) =>
    set('items', formData.items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof ExpenseItem, value: any) =>
    set('items', formData.items.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleSave = async () => {
    if (!formData.total || !formData.date) {
      toast.error('Please fill in date and total amount');
      return;
    }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'finance_expenses'), {
        date: formData.date,
        supplier: formData.supplier,
        category_id: formData.category_id,
        category_name: formData.category_name,
        total: parseFloat(formData.total),
        currency: 'THB',
        items: formData.items,
        receipt_url: '',
        notes: formData.notes,
        logged_by: user?.email || 'unknown',
        created_at: new Date().toISOString(),
      });

      // Auto-update ingredient costs from line items
      if (formData.items.length > 0) {
        try {
          const ingSnap = await getDocs(query(collection(db, 'finance_ingredients')));
          const ingList = ingSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
          for (const item of formData.items) {
            if (!item.description || !item.unit_price) continue;
            const itemName = item.description.toLowerCase().replace(/[^a-z0-9 ]/g, '');
            const match = ingList.find(ing => {
              const ingName = ing.name.toLowerCase().replace(/[^a-z0-9 ]/g, '');
              return itemName.includes(ingName) || ingName.includes(itemName);
            });
            if (match) {
              await updateDoc(doc(db, 'finance_ingredients', match.id), {
                current_cost_per_unit: item.unit_price,
              });
              await addDoc(collection(db, 'ingredient_purchases'), {
                ingredient_id: match.id,
                ingredient_name: match.name,
                quantity: item.quantity || 1,
                unit: item.unit || match.unit,
                unit_cost: item.unit_price,
                total_cost: item.total_price || item.unit_price,
                date: formData.date,
                supplier: formData.supplier,
                created_at: new Date().toISOString(),
              });
            }
          }
        } catch (e) { console.warn('Ingredient cost update failed', e); }
      }

      await logActivity(
        'Expense Logged',
        `฿${parseFloat(formData.total).toLocaleString()} · ${formData.category_name} · ${formData.supplier || 'no supplier'} · ${formData.date}`,
        'finance'
      );
      toast.success('Expense logged');
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        supplier: '',
        category_id: 'food_expense',
        category_name: 'Food Expense',
        total: '',
        notes: '',
        items: [],
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-ink mb-6">Log Expense</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className={LBL_CLS}>Date</label>
            <input type="date" value={formData.date} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
          </div>

          {/* Supplier */}
          <div>
            <label className={LBL_CLS}>Supplier</label>
            <input type="text" value={formData.supplier} onChange={e => set('supplier', e.target.value)} placeholder="e.g. Makro, local market" className={INPUT_CLS} />
          </div>

          {/* Category */}
          <div>
            <label className={LBL_CLS}>Category</label>
            <select value={formData.category_id} onChange={e => handleCategoryChange(e.target.value)} className={INPUT_CLS}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Total */}
          <div>
            <label className={LBL_CLS}>Total (฿)</label>
            <input type="number" value={formData.total} onChange={e => set('total', e.target.value)} placeholder="0.00" className={INPUT_CLS} />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className={LBL_CLS}>Notes (optional)</label>
            <input type="text" value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes" className={INPUT_CLS} />
          </div>
        </div>

        {/* Line items */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-ink text-sm">Line Items (optional)</span>
            <button onClick={addItem} className="flex items-center gap-1 text-[#1DA0A8] text-sm font-medium hover:underline">
              <Plus size={14} /> Add item
            </button>
          </div>

          {formData.items.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-3">No line items — add them to track ingredient costs</p>
          ) : (
            <div className="space-y-2">
              {formData.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 grid grid-cols-12 gap-2 items-center">
                  <input
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="col-span-5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1DA0A8]"
                  />
                  <input
                    type="number"
                    value={item.quantity ?? ''}
                    onChange={e => updateItem(idx, 'quantity', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Qty"
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1DA0A8]"
                  />
                  <input
                    value={item.unit}
                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1DA0A8]"
                  />
                  <input
                    type="number"
                    value={item.total_price ?? ''}
                    onChange={e => updateItem(idx, 'total_price', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="฿"
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1DA0A8]"
                  />
                  <button onClick={() => removeItem(idx)} className="col-span-1 text-gray-400 hover:text-red-500 transition-colors flex justify-center">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-[#1DA0A8] text-white rounded-2xl font-bold hover:bg-[#18919a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Check size={18} /> Save Expense</>}
        </button>
      </div>
      {/* Recent Expenses */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-ink mb-3">Recent Expenses</h2>

        {canManage && expenses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search supplier, category, notes..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]"
            >
              <option value="all">All categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]" />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 px-2 py-2">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        )}

        {expenses.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-6">No expenses logged yet</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-6">No expenses match your filters</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Total (฿)</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                  {canManage && <th className="px-4 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp, i) => {
                  const dt = exp.created_at ? new Date(exp.created_at) : null;
                  const timeStr = dt ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
                  const receiptUrl = exp.receipt_url ? gsToUrl(exp.receipt_url) : null;
                  return (
                    <tr key={exp.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{exp.date || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{timeStr}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{exp.category_name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{exp.supplier || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{exp.notes || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-gray-900">
                        {exp.total != null ? exp.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {receiptUrl ? (
                          <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#1DA0A8] hover:underline">
                            <ExternalLink size={13} /> View
                          </a>
                        ) : (
                          <span className="text-gray-300"><ImageOff size={14} /></span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => openEdit(exp)} className="text-gray-400 hover:text-[#1DA0A8] transition-colors" title="Edit expense">
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp)}
                              disabled={deletingId === exp.id}
                              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Delete expense"
                            >
                              {deletingId === exp.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
        )}
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-ink">Edit Expense</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {editingExpense.date} · {editingExpense.supplier || 'no supplier'} — date and supplier can't be changed here.
            </p>
            <div className="space-y-4">
              <div>
                <label className={LBL_CLS}>Category</label>
                <select value={editForm.category_id} onChange={e => handleEditCategoryChange(e.target.value)} className={INPUT_CLS}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL_CLS}>Total (฿)</label>
                <input type="number" value={editForm.total} onChange={e => setEditForm(f => ({ ...f, total: e.target.value }))} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LBL_CLS}>Notes</label>
                <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className={INPUT_CLS} />
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
                {savingEdit ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
