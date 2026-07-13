import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  where, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Supplier } from './types';
import { Search, Pencil, Trash2, Check, X, Plus, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '../../utils/logger';

const INPUT_CLS = 'w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]';
const LBL_CLS  = 'block text-sm font-medium text-gray-700 mb-1';

export default function FinanceSuppliers({ user }: { user: any }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'finance_suppliers'), orderBy('name'));
    return onSnapshot(
      q,
      snap => setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier))),
      err => console.warn('Suppliers:', err.message)
    );
  }, []);

  const filtered = suppliers.filter(s => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()));

  const nameExists = (name: string, excludeId?: string) =>
    suppliers.some(s => s.id !== excludeId && s.name.toLowerCase() === name.toLowerCase());

  const openAdd = () => { setAddName(''); setShowAddModal(true); };
  const closeAdd = () => setShowAddModal(false);

  const handleAdd = async () => {
    const trimmed = addName.trim();
    if (!trimmed) { toast.error('Enter a supplier name'); return; }
    if (nameExists(trimmed)) { toast.error('That supplier already exists'); return; }
    setAddSubmitting(true);
    try {
      await addDoc(collection(db, 'finance_suppliers'), {
        name: trimmed,
        created_at: new Date().toISOString(),
        created_by: user?.email || 'unknown',
      });
      await logActivity('Supplier Added', trimmed, 'finance');
      toast.success('Supplier added');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add supplier');
    } finally {
      setAddSubmitting(false);
    }
  };

  const openEdit = (s: Supplier) => { setEditingSupplier(s); setEditName(s.name); };
  const closeEdit = () => setEditingSupplier(null);

  const handleEditSave = async () => {
    if (!editingSupplier) return;
    const trimmed = editName.trim();
    if (!trimmed) { toast.error('Enter a supplier name'); return; }
    if (trimmed === editingSupplier.name) { setEditingSupplier(null); return; }
    if (nameExists(trimmed, editingSupplier.id)) { toast.error('That supplier already exists'); return; }
    setEditSubmitting(true);
    try {
      await updateDoc(doc(db, 'finance_suppliers', editingSupplier.id), { name: trimmed });
      await logActivity('Supplier Renamed', `${editingSupplier.name} → ${trimmed}`, 'finance');
      toast.success('Supplier updated');
      setEditingSupplier(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update supplier');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (s: Supplier) => {
    setDeletingId(s.id);
    try {
      const usageQuery = query(collection(db, 'finance_expenses'), where('supplier', '==', s.name));
      const countSnap = await getCountFromServer(usageQuery);
      const count = countSnap.data().count;
      if (count > 0) {
        toast.error(`Can't delete "${s.name}" — used by ${count} expense${count === 1 ? '' : 's'}. Rename it instead, or reassign those expenses first.`);
        return;
      }
      if (!window.confirm(`Delete supplier "${s.name}"? This cannot be undone.`)) return;
      await deleteDoc(doc(db, 'finance_suppliers', s.id));
      await logActivity('Supplier Deleted', s.name, 'finance');
      toast.success('Supplier deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete supplier');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">Suppliers</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1DA0A8] text-white rounded-xl text-sm font-bold hover:bg-[#18919a] transition-all"
        >
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search suppliers..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="text-center py-12">
            <Truck size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No suppliers yet — add your first one</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-8">No suppliers match your search</p>
        ) : (
          filtered.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
            >
              <span className="text-sm font-medium text-gray-900">{s.name}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-[#1DA0A8] transition-colors" title="Rename supplier">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  disabled={deletingId === s.id}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Delete supplier"
                >
                  {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeAdd}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Add Supplier</h3>
              <button onClick={closeAdd} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <label className={LBL_CLS}>Name</label>
            <input
              autoFocus
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Makro"
              className={INPUT_CLS}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={closeAdd} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={addSubmitting}
                className="flex-1 py-2.5 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#18919a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addSubmitting ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : <><Check size={16} /> Add Supplier</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeEdit}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-ink">Rename Supplier</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Renaming only affects new expenses — past expenses keep the name they were logged with.</p>
            <label className={LBL_CLS}>Name</label>
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditSave()}
              className={INPUT_CLS}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={closeEdit} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSubmitting}
                className="flex-1 py-2.5 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#18919a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
