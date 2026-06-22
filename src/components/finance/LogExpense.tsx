import { useState } from 'react';
import { collection, addDoc, getDocs, query, updateDoc, doc } from 'firebase/firestore';
import { logActivity } from '../../utils/logger';
import { db } from '../../firebase';
import { ExpenseItem } from './types';
import { Check, Loader2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = [
  { id: 'food',       name: 'Food & Ingredients' },
  { id: 'drinks',     name: 'Drinks & Beverages' },
  { id: 'packaging',  name: 'Packaging' },
  { id: 'utilities',  name: 'Utilities' },
  { id: 'staff',      name: 'Staff' },
  { id: 'equipment',  name: 'Equipment' },
  { id: 'rent',       name: 'Rent' },
  { id: 'other',      name: 'Other' },
];

const INPUT_CLS = 'w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]';
const LBL_CLS  = 'block text-sm font-medium text-gray-700 mb-1';

export default function LogExpense({ user, financeRole = 'owner' }: { user: any; financeRole?: string }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    supplier: '',
    category_id: 'food',
    category_name: 'Food & Ingredients',
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
        category_id: 'food',
        category_name: 'Food & Ingredients',
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
    </div>
  );
}
