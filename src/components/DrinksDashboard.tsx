import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { logActivity } from '../utils/logger';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';

interface Drink {
  id?: string;
  name: string;
  category: string;
  drinkType: string;
  description: string;
  price: string;
  order: number;
  published: boolean;
}

const CATEGORIES = [
  'Beers & Ciders',
  'Cocktails & Alcopops',
  'Spirits',
  'Coffee & Tea',
  'Soft Drinks & Shakes',
];

const DRINK_TYPES: Record<string, string[]> = {
  'Beers & Ciders':        ['Tap', 'Bottled', 'Wine'],
  'Cocktails & Alcopops':  ['Cocktail', 'Alcopop'],
  'Spirits':               ['Brandy', 'Gin', 'Rum', 'Tequila', 'Vodka', 'Whisky & Whiskey', 'Liqueurs'],
  'Coffee & Tea':          ['Coffee', 'Tea'],
  'Soft Drinks & Shakes':  ['Water', 'Soft Drink', 'Shake'],
};

// ── Shared inline-style helpers ──────────────────────────────
const S = {
  page: { background: '#f8f9fb', minHeight: '100vh' } as React.CSSProperties,
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  eyebrow: {
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#1DA0A8',
    marginBottom: 4,
  } as React.CSSProperties,
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    color: '#111827',
    margin: 0,
    lineHeight: 1,
  } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 20px',
    background: '#1DA0A8', color: '#ffffff',
    border: '2px solid #1DA0A8', borderRadius: 2,
    fontFamily: 'var(--font-condensed)', fontWeight: 600,
    fontSize: 13, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer', lineHeight: 1,
    transition: 'background 0.2s ease',
  } as React.CSSProperties,
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px',
    background: 'transparent', color: '#6b7280',
    border: 'none', borderRadius: 2,
    fontFamily: 'var(--font-condensed)', fontWeight: 600,
    fontSize: 12, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer', lineHeight: 1,
  } as React.CSSProperties,
  btnDanger: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px',
    background: 'transparent', color: '#E11E15',
    border: 'none', borderRadius: 2,
    fontFamily: 'var(--font-condensed)', fontWeight: 600,
    fontSize: 12, cursor: 'pointer', lineHeight: 1,
  } as React.CSSProperties,
  label: {
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600, fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    display: 'block', marginBottom: 7,
  } as React.CSSProperties,
  input: {
    background: '#ffffff',
    border: '1px solid #d1d5db', borderRadius: 2,
    color: '#111827',
    fontFamily: 'var(--font-sans)',
    fontSize: 15, padding: '10px 13px',
    width: '100%', outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

const focusOn  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#1DA0A8';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,160,168,0.15)';
};
const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#d1d5db';
  e.currentTarget.style.boxShadow = 'none';
};

// ── Drink Modal ──────────────────────────────────────────────
function DrinkModal({
  drink, onClose, onSave,
}: {
  drink: Drink | null;
  onClose: () => void;
  onSave: (data: Omit<Drink, 'id'>) => Promise<void>;
}) {
  const isNew = !drink?.id;
  const [form, setForm] = useState<Omit<Drink, 'id'>>({
    name:        drink?.name        ?? '',
    category:    drink?.category    ?? CATEGORIES[0],
    drinkType:   drink?.drinkType   ?? 'Tap',
    description: drink?.description ?? '',
    price:       drink?.price       ?? '',
    order:       drink?.order       ?? 0,
    published:   drink?.published   ?? true,
  });
  const [saving, setSaving] = useState(false);

  const types = DRINK_TYPES[form.category] ?? [];

  // Reset drinkType when category changes
  const handleCategoryChange = (cat: string) => {
    setForm(f => ({ ...f, category: cat, drinkType: DRINK_TYPES[cat]?.[0] ?? '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: '#111827', textTransform: 'uppercase' }}>
            {isNew ? 'Add Drink' : 'Edit Drink'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={S.label}>Drink Name *</label>
            <input
              style={S.input}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Heineken Lager ABV 5.0%"
              required
              onFocus={focusOn} onBlur={focusOff}
            />
          </div>

          {/* Category + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Category</label>
              <select
                style={{ ...S.input, cursor: 'pointer' }}
                value={form.category}
                onChange={e => handleCategoryChange(e.target.value)}
                onFocus={focusOn} onBlur={focusOff}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Type</label>
              <select
                style={{ ...S.input, cursor: 'pointer' }}
                value={form.drinkType}
                onChange={e => setForm(f => ({ ...f, drinkType: e.target.value }))}
                onFocus={focusOn} onBlur={focusOff}
              >
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={S.label}>Description / Notes</label>
            <textarea
              style={{ ...S.input, resize: 'vertical', minHeight: 72 } as React.CSSProperties}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. 0.5L - 125 / 0.25L - 75  or  ingredients list"
              onFocus={focusOn} onBlur={focusOff}
            />
          </div>

          {/* Price + Order */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Price (฿)</label>
              <input
                style={S.input}
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="e.g. 125"
                onFocus={focusOn} onBlur={focusOff}
              />
            </div>
            <div>
              <label style={S.label}>Order</label>
              <input
                type="number"
                style={S.input}
                value={form.order}
                onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                onFocus={focusOn} onBlur={focusOff}
              />
            </div>
          </div>

          {/* Published toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ position: 'relative', width: 40, height: 22, flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              />
              <span style={{
                position: 'absolute', inset: 0,
                background: form.published ? '#1DA0A8' : '#d1d5db',
                borderRadius: 22, cursor: 'pointer', transition: 'background 0.2s',
              }} />
              <span style={{
                position: 'absolute',
                top: 3, left: form.published ? 20 : 3,
                width: 16, height: 16,
                background: '#ffffff', borderRadius: '50%',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </label>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#374151' }}>
              {form.published ? 'Published (visible on drinks menu)' : 'Unpublished (hidden from menu)'}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ ...S.btnGhost, border: '1px solid #e5e7eb', padding: '10px 18px' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}
            >
              <Save size={15} />
              {saving ? 'Saving…' : 'Save Drink'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function DrinksDashboard() {
  const [drinks, setDrinks]       = useState<Drink[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<'add' | Drink | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');

  useEffect(() => {
    const q = query(collection(db, 'drinks'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setDrinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Drink)));
      setLoading(false);
    }, err => {
      console.error('Drinks listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (data: Omit<Drink, 'id'>) => {
    try {
      if (typeof modal === 'object' && modal !== null && modal.id) {
        await updateDoc(doc(db, 'drinks', modal.id), data as any);
        await logActivity('Drink Updated', `Updated: ${data.name}`, 'menu');
        toast.success('Drink updated');
      } else {
        await addDoc(collection(db, 'drinks'), data);
        await logActivity('Drink Added', `Added: ${data.name}`, 'menu');
        toast.success('Drink added');
      }
      setModal(null);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save drink');
      throw err;
    }
  };

  const handleDelete = async (drink: Drink) => {
    if (!window.confirm(`Delete "${drink.name}"? This cannot be undone.`)) return;
    if (!drink.id) return;
    setDeleting(drink.id);
    try {
      await deleteDoc(doc(db, 'drinks', drink.id));
      await logActivity('Drink Deleted', `Deleted: ${drink.name}`, 'menu');
      toast.success('Drink deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete drink');
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublished = async (drink: Drink) => {
    if (!drink.id) return;
    setToggling(drink.id);
    try {
      await updateDoc(doc(db, 'drinks', drink.id), { published: !drink.published });
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const filtered = activeTab === 'All' ? drinks : drinks.filter(d => d.category === activeTab);

  const tabs = ['All', ...CATEGORIES];

  const tabCounts: Record<string, number> = { All: drinks.length };
  CATEGORIES.forEach(c => { tabCounts[c] = drinks.filter(d => d.category === c).length; });

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #d1d5db', borderTopColor: '#1DA0A8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>Menu</div>
          <h1 style={S.title}>DRINKS</h1>
        </div>
        <button
          style={S.btnPrimary}
          onClick={() => setModal('add')}
          onMouseEnter={e => (e.currentTarget.style.background = '#34B2BA')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1DA0A8')}
        >
          <Plus size={16} /> Add Drink
        </button>
      </div>

      {/* Category filter tabs */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '0 28px', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #1DA0A8' : '2px solid transparent',
              color: activeTab === tab ? '#1DA0A8' : '#6b7280',
              fontFamily: 'var(--font-condensed)',
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab}
            <span style={{
              marginLeft: 6,
              padding: '2px 7px',
              background: activeTab === tab ? 'rgba(29,160,168,0.12)' : '#f3f4f6',
              color: activeTab === tab ? '#1DA0A8' : '#9ca3af',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}>
              {tabCounts[tab] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ padding: 28 }}>
        {filtered.length === 0 ? (
          <div style={{ background: '#ffffff', border: '2px dashed #e5e7eb', borderRadius: 4, padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
              No Drinks Yet
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
              Add your first drink or switch to a different category tab.
            </div>
            <button style={S.btnPrimary} onClick={() => setModal('add')}>
              <Plus size={15} /> Add First Drink
            </button>
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '9%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Name', 'Category', 'Type', 'Description', 'Price', 'On Menu', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-condensed)',
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#6b7280',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((drink, idx) => (
                  <tr
                    key={drink.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: drink.published ? '#ffffff' : '#fafafa',
                      opacity: drink.published ? 1 : 0.7,
                    }}
                  >
                    {/* Name */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontFamily: 'var(--font-condensed)',
                        fontWeight: 600,
                        fontSize: 14,
                        color: '#111827',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {drink.name}
                      </span>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 12,
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}>
                        {drink.category}
                      </span>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: 'rgba(29,160,168,0.1)',
                        color: '#1DA0A8',
                        borderRadius: 4,
                        fontFamily: 'var(--font-condensed)',
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {drink.drinkType}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 12,
                        color: '#9ca3af',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}>
                        {drink.description || '—'}
                      </span>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        {drink.price ? `฿${drink.price}` : '—'}
                      </span>
                    </td>

                    {/* Published toggle */}
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleTogglePublished(drink)}
                        disabled={toggling === drink.id}
                        title={drink.published ? 'Published — click to hide' : 'Hidden — click to publish'}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: drink.published ? '#1DA0A8' : '#d1d5db',
                          opacity: toggling === drink.id ? 0.5 : 1,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        {drink.published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          onClick={() => setModal(drink)}
                          style={S.btnGhost}
                          title="Edit"
                          onMouseEnter={e => (e.currentTarget.style.color = '#1DA0A8')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(drink)}
                          disabled={deleting === drink.id}
                          style={{ ...S.btnGhost, color: deleting === drink.id ? '#d1d5db' : '#6b7280' }}
                          title="Delete"
                          onMouseEnter={e => (e.currentTarget.style.color = '#E11E15')}
                          onMouseLeave={e => (e.currentTarget.style.color = deleting === drink.id ? '#d1d5db' : '#6b7280')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div style={{ marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
            {filtered.length} drink{filtered.length !== 1 ? 's' : ''} · {filtered.filter(d => d.published).length} published
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <DrinkModal
          drink={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
