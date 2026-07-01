import React, { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, query, where, orderBy,
  doc, getDoc, updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Loader2, Check, X, Receipt, Plus, Search,
  Phone, Mail, FileText, ArrowLeft, Edit2, Users, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { FinanceCategory, UserProfile } from '../types';
import { logActivity } from '../utils/logger';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  createdBy: string;
}

interface ExtractedExpense {
  amount: number;
  description: string;
  categoryName: string;
  categoryId: string;
  date: string;
  lineItems: { description: string; amount: number; quantity?: number; weight?: string }[];
}

type ActiveTab = 'expenses' | 'customers';

const INPUT_CLS = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]';
const LBL_CLS = 'block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5';

const DEFAULT_CATEGORIES = [
  { id: 'cat_food', name: 'Food & Ingredients', type: 'expense' },
  { id: 'cat_drinks', name: 'Drinks & Beverages', type: 'expense' },
  { id: 'cat_packaging', name: 'Packaging', type: 'expense' },
  { id: 'cat_utilities', name: 'Utilities', type: 'expense' },
  { id: 'cat_staff', name: 'Staff', type: 'expense' },
  { id: 'cat_equipment', name: 'Equipment', type: 'expense' },
  { id: 'cat_rent', name: 'Rent', type: 'expense' },
  { id: 'cat_other', name: 'Other', type: 'expense' },
] as unknown as FinanceCategory[];

// ── Main Component ────────────────────────────────────────────────────────

const StaffPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid))
        .then(snap => { if (snap.exists()) setUserProfile(snap.data() as UserProfile); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-cream flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'marketing';

  return (
    <div className="fixed inset-0 z-50 bg-cream flex flex-col overflow-hidden">
      {/* Minimal top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        {isAdmin ? (
          <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-500 hover:text-ink transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Back
          </Link>
        ) : (
          <div className="w-16" />
        )}
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Staff Portal</span>
        <div className="w-16 text-right">
          <span className="text-[10px] text-gray-300 truncate block">{auth.currentUser?.email?.split('@')[0]}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-20">
        {activeTab === 'expenses' ? (
          <ExpensesTab user={auth.currentUser} />
        ) : (
          <CustomersTab />
        )}
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10">
        {([
          { id: 'expenses' as ActiveTab, icon: Receipt, label: 'Expenses' },
          { id: 'customers' as ActiveTab, icon: Users, label: 'Customers' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              activeTab === id ? 'text-[#1DA0A8]' : 'text-gray-400'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Expenses Tab ──────────────────────────────────────────────────────────

const ExpensesTab: React.FC<{ user: any }> = ({ user }) => {
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedExpense | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<any[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Always-current ref so extractData never has stale categories
  const categoriesRef = useRef<FinanceCategory[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'finance_categories'), where('type', '==', 'expense'));
    const unsub = onSnapshot(q, snap => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FinanceCategory[];
      const effective = cats.length > 0 ? cats : DEFAULT_CATEGORIES;
      setCategories(effective);
      categoriesRef.current = effective;
    }, err => {
      console.warn('Categories:', err.message);
      setCategories(DEFAULT_CATEGORIES);
      categoriesRef.current = DEFAULT_CATEGORIES;
    });

    const today = new Date().toISOString().split('T')[0];
    const eq = query(collection(db, 'finance_expenses'), where('date', '==', today));
    const unsub2 = onSnapshot(eq, snap => {
      setTodayExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.warn('Today expenses:', err.message));

    return () => { unsub(); unsub2(); };
  }, []);

  const extractData = async (base64Image: string) => {
    setIsExtracting(true);
    setExtractedData(null);
    try {
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';
      const resp = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data, mimeType }),
      });
      if (!resp.ok) throw new Error(`Server ${resp.status}`);
      const { success, data } = await resp.json();
      if (!success) throw new Error('Extraction failed');

      // Use ref so we always have the latest categories, even if snapshot arrived late
      const cats = categoriesRef.current;
      const matched = cats.find(c => c.name.toLowerCase() === (data.categoryName || '').toLowerCase()) || cats[0];

      setExtractedData({
        amount: data.amount || 0,
        description: data.description || '',
        categoryName: matched?.name || data.categoryName || 'General',
        categoryId: matched?.id || '',
        date: data.date || new Date().toISOString().split('T')[0],
        lineItems: data.lineItems || [],
      });
      toast.success('Receipt scanned');
    } catch (err) {
      console.error(err);
      toast.error('Could not read receipt — fill in manually');
      const cats = categoriesRef.current;
      setExtractedData({
        amount: 0,
        description: '',
        categoryName: cats[0]?.name || 'General',
        categoryId: cats[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        lineItems: [],
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    let triggeredExtract = false;
    selected.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImages(prev => {
          if (!triggeredExtract && prev.length === 0) {
            triggeredExtract = true;
            extractData(result);
          }
          return [...prev, result];
        });
        setFiles(prev => [...prev, file]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const startManual = () => {
    const cats = categoriesRef.current;
    setExtractedData({
      amount: 0,
      description: '',
      categoryName: cats[0]?.name || 'General',
      categoryId: cats[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      lineItems: [],
    });
  };

  const reset = () => { setImages([]); setFiles([]); setExtractedData(null); };

  const handleSave = async () => {
    if (!extractedData || !user) return;
    if (!extractedData.amount) { toast.error('Enter a total amount'); return; }
    setIsSaving(true);
    try {
      const receiptUrls: string[] = [];
      const monthFolder = format(new Date(), 'MMMM yyyy');
      for (const file of files) {
        const b64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file);
        });
        const storagePath = `receipts/${monthFolder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const upResp = await fetch('/api/upload-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: b64, storagePath, contentType: file.type }),
        });
        if (upResp.ok) { const res = await upResp.json(); receiptUrls.push(res.gsUrl || storagePath); }
      }
      await addDoc(collection(db, 'finance_expenses'), {
        date: extractedData.date,
        category_id: extractedData.categoryId,
        category_name: extractedData.categoryName,
        total: extractedData.amount,
        notes: extractedData.description,
        currency: 'THB',
        items: extractedData.lineItems || [],
        receipt_url: receiptUrls[0] || '',
        receiptUrls,
        logged_by: user.email,
        uid: user.uid,
        created_at: new Date().toISOString(),
        source: 'staff_portal',
      });
      logActivity('Staff Expense Entry',
        `฿${extractedData.amount.toLocaleString()} · ${extractedData.categoryName} · ${extractedData.description || 'no description'}`,
        'finance').catch(e => console.warn('logActivity:', e));
      toast.success('Expense saved!');
      reset();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save — try again');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <button onClick={() => setShowSummary(true)}
        className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 text-left">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Expenses</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {todayExpenses.length === 0
              ? 'No expenses logged yet'
              : <><span className="font-bold text-gray-900">{todayExpenses.length}</span> receipt{todayExpenses.length !== 1 ? 's' : ''} · ฿{todayExpenses.reduce((s, e) => s + (e.total || 0), 0).toLocaleString()}</>
            }
          </p>
        </div>
        <ChevronRight size={16} className="text-gray-400" />
      </button>

      <AnimatePresence mode="wait">
        {images.length === 0 && !extractedData ? (
          <motion.div key="capture" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#1DA0A8]/50 transition-all group">
              <div className="w-16 h-16 bg-[#1DA0A8]/10 rounded-full flex items-center justify-center text-[#1DA0A8] mb-4 group-hover:bg-[#1DA0A8]/20 transition-colors">
                <Camera size={32} />
              </div>
              <p className="font-display font-bold text-gray-900 text-lg">Snap a Receipt</p>
              <p className="text-sm text-gray-400 mt-1">AI will read the details automatically</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" multiple />
            <button onClick={startManual} className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-[#1DA0A8] transition-colors font-medium text-center">
              Skip — enter manually
            </button>
          </motion.div>
        ) : (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {isExtracting && idx === 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 size={18} className="animate-spin text-white" />
                      </div>
                    )}
                    <button onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-red-500 shadow-sm">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-20 h-28 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-[#1DA0A8]/40 hover:text-[#1DA0A8] transition-all">
                  <Plus size={18} />
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" multiple />

            {extractedData && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Receipt size={15} /></div>
                  <span className="font-bold text-gray-900 text-sm">
                    {isExtracting ? 'Reading receipt…' : 'Review & Confirm'}
                  </span>
                </div>

                <div>
                  <label className={LBL_CLS}>Total Amount (฿)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">฿</span>
                    <input
                      type="number" step="0.01"
                      value={extractedData.amount || ''}
                      onChange={e => setExtractedData({ ...extractedData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] font-bold text-xl text-gray-900 bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className={LBL_CLS}>Date</label>
                  <input type="date" value={extractedData.date}
                    onChange={e => setExtractedData({ ...extractedData, date: e.target.value })}
                    className={INPUT_CLS} />
                </div>

                <div>
                  <label className={LBL_CLS}>Category</label>
                  <select value={extractedData.categoryId}
                    onChange={e => {
                      const cat = categories.find(c => c.id === e.target.value);
                      setExtractedData({ ...extractedData, categoryId: e.target.value, categoryName: cat?.name || '' });
                    }}
                    className={INPUT_CLS}>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className={LBL_CLS}>Description</label>
                  <textarea value={extractedData.description}
                    onChange={e => setExtractedData({ ...extractedData, description: e.target.value })}
                    className={`${INPUT_CLS} h-20 resize-none`}
                    placeholder="What was purchased?" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={reset}
                    className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-500 text-sm font-bold hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={isSaving || !extractedData.amount}
                    className="flex-1 py-3 bg-navy text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-navy/90 transition-all">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Save Expense</>}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowSummary(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="w-full bg-white rounded-t-3xl p-6 max-h-[75vh] overflow-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-gray-900 text-lg">Today's Expenses</h3>
                <button onClick={() => setShowSummary(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="space-y-2">
                {todayExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No expenses logged today.</p>
                  </div>
                ) : (
                  [...todayExpenses].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(exp => (
                    <div key={exp.id} className="bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#1DA0A8] bg-[#1DA0A8]/10 px-2 py-0.5 rounded-full">
                            {exp.category_name || 'Other'}
                          </span>
                          <p className="font-semibold text-gray-900 mt-1 truncate">{exp.notes || 'No description'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            by {(exp.logged_by || '').split('@')[0]} · {exp.created_at ? new Date(exp.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900 text-lg flex-shrink-0">฿{(exp.amount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
                {todayExpenses.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-600">Total Today</span>
                    <span className="font-bold text-gray-900 text-lg">฿{todayExpenses.reduce((s, e) => s + (e.total || 0), 0).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Customers Tab ─────────────────────────────────────────────────────────

const CustomersTab: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newForm, setNewForm] = useState({ firstName: '', lastName: '', phone: '', email: '', notes: '' });
  const [editForm, setEditForm] = useState<Customer | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'customers'), orderBy('createdAt', 'desc')),
      snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[]),
      err => console.warn('Customers:', err.message)
    );
    return unsub;
  }, []);

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q
      || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      || (c.phone || '').includes(q)
      || (c.email || '').toLowerCase().includes(q);
  });

  const handleAdd = async () => {
    if (!newForm.firstName.trim()) { toast.error('First name is required'); return; }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'customers'), {
        ...newForm,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.email || '',
      });
      toast.success('Customer added');
      setIsAdding(false);
      setNewForm({ firstName: '', lastName: '', phone: '', email: '', notes: '' });
    } catch { toast.error('Failed to add customer'); }
    finally { setIsSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editForm?.id) return;
    setIsSaving(true);
    try {
      const { id, createdAt, createdBy, ...fields } = editForm;
      await updateDoc(doc(db, 'customers', id!), fields);
      toast.success('Customer updated');
      setSelected({ ...editForm });
      setEditForm(null);
    } catch { toast.error('Failed to update'); }
    finally { setIsSaving(false); }
  };

  if (selected) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <button onClick={() => { setSelected(null); setEditForm(null); }}
          className="flex items-center gap-1.5 text-gray-500 mb-5 text-sm font-medium hover:text-gray-900 transition-colors">
          <ArrowLeft size={15} /> All Customers
        </button>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1DA0A8]/10 rounded-full flex items-center justify-center text-[#1DA0A8] font-bold text-xl flex-shrink-0">
              {((editForm?.firstName || selected.firstName) || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{selected.firstName} {selected.lastName}</p>
              <p className="text-xs text-gray-400">Added {format(new Date(selected.createdAt), 'dd MMM yyyy')}</p>
            </div>
          </div>
          {editForm ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL_CLS}>First Name</label><input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className={INPUT_CLS} /></div>
                <div><label className={LBL_CLS}>Last Name</label><input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className={INPUT_CLS} /></div>
              </div>
              <div><label className={LBL_CLS}>Phone</label><input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={INPUT_CLS} /></div>
              <div><label className={LBL_CLS}>Email</label><input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={INPUT_CLS} /></div>
              <div><label className={LBL_CLS}>Notes</label><textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className={`${INPUT_CLS} h-20 resize-none`} /></div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditForm(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
                <button onClick={handleUpdate} disabled={isSaving} className="flex-1 py-2.5 bg-navy text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {([
                { icon: Phone, label: 'Phone', value: selected.phone },
                { icon: Mail, label: 'Email', value: selected.email },
                { icon: FileText, label: 'Notes', value: selected.notes },
              ] as const).filter(f => f.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm text-gray-900">{value}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setEditForm({ ...selected })}
                className="w-full py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors mt-2">
                <Edit2 size={15} /> Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] text-sm bg-white text-gray-900" />
        </div>
        <button onClick={() => setIsAdding(true)}
          className="p-2.5 bg-[#1DA0A8] text-white rounded-xl hover:bg-[#18919a] transition-colors flex-shrink-0">
          <Plus size={20} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users size={26} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium text-sm">
            {searchQuery ? 'No customers match that search' : 'No customers yet'}
          </p>
          {!searchQuery && (
            <button onClick={() => setIsAdding(true)} className="mt-3 text-[#1DA0A8] text-sm font-bold hover:underline">
              Add your first customer
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-left hover:border-[#1DA0A8]/30 transition-colors">
              <div className="w-10 h-10 bg-[#1DA0A8]/10 rounded-full flex items-center justify-center text-[#1DA0A8] font-bold text-base flex-shrink-0">
                {(c.firstName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{c.phone || c.email || 'No contact info'}</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setIsAdding(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="w-full bg-white rounded-t-3xl p-6 space-y-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-gray-900 text-lg">New Customer</h3>
                <button onClick={() => setIsAdding(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL_CLS}>First Name *</label><input autoFocus value={newForm.firstName} onChange={e => setNewForm({ ...newForm, firstName: e.target.value })} className={INPUT_CLS} placeholder="John" /></div>
                <div><label className={LBL_CLS}>Last Name</label><input value={newForm.lastName} onChange={e => setNewForm({ ...newForm, lastName: e.target.value })} className={INPUT_CLS} placeholder="Smith" /></div>
              </div>
              <div><label className={LBL_CLS}>Phone</label><input value={newForm.phone} onChange={e => setNewForm({ ...newForm, phone: e.target.value })} className={INPUT_CLS} placeholder="+66 8x xxx xxxx" /></div>
              <div><label className={LBL_CLS}>Email</label><input type="email" value={newForm.email} onChange={e => setNewForm({ ...newForm, email: e.target.value })} className={INPUT_CLS} placeholder="john@example.com" /></div>
              <div><label className={LBL_CLS}>Notes</label><textarea value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} className={`${INPUT_CLS} h-16 resize-none`} placeholder="Regular, preferences…" /></div>
              <button onClick={handleAdd} disabled={isSaving}
                className="w-full py-3 bg-navy text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-navy/90 transition-all">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Add Customer</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffPortal;
