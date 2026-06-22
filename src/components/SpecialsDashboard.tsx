import React, { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { normalizeImageUrl } from '../utils/images';
import { FirebaseImage } from './ui/FirebaseImage';
import { logActivity } from '../utils/logger';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Save, X, Upload,
  Calendar, AlertCircle, Check, Image as ImageIcon
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface Special {
  id?: string;
  name: string;
  day: string;
  image: string;
  order: number;
  // legacy fields kept for compatibility
  description?: string;
  price?: string;
  startDate?: string;
  endDate?: string;
}

const DAY_OPTIONS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday',
  'Weekend', 'Daily', 'Every Day',
];

const DAY_COLORS: Record<string, string> = {
  Monday:    'var(--teal-500)',
  Tuesday:   'var(--teal-600)',
  Wednesday: 'var(--gold-500)',
  Thursday:  'var(--gold-600)',
  Friday:    'var(--red-500)',
  Saturday:  'var(--teal-500)',
  Sunday:    'var(--gold-500)',
  Weekend:   'var(--teal-500)',
  Daily:     'var(--green-500)',
  'Every Day': 'var(--green-500)',
};

// ── Shared inline-style helpers ──────────────────────────────
const S = {
  page: {
    background: 'var(--ink-850)',
    minHeight: '100vh',
  } as React.CSSProperties,
  header: {
    background: 'var(--ink-800)',
    borderBottom: '1px solid var(--border)',
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
    color: 'var(--gold-400)',
    marginBottom: 4,
  } as React.CSSProperties,
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    color: 'var(--cream-50)',
    margin: 0,
    lineHeight: 1,
  } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 20px',
    background: 'var(--teal-500)', color: 'var(--ink-900)',
    border: '2px solid var(--teal-500)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-condensed)', fontWeight: 600,
    fontSize: 13, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer', lineHeight: 1,
    transition: 'background 0.2s ease',
  } as React.CSSProperties,
  btnDanger: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px',
    background: 'transparent', color: 'var(--red-500)',
    border: '1px solid var(--red-500)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-condensed)', fontWeight: 600,
    fontSize: 12, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer', lineHeight: 1,
  } as React.CSSProperties,
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px',
    background: 'transparent', color: 'var(--gold-400)',
    border: 'none', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-condensed)', fontWeight: 600,
    fontSize: 12, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer', lineHeight: 1,
  } as React.CSSProperties,
  label: {
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600, fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
    display: 'block', marginBottom: 7,
  } as React.CSSProperties,
  input: {
    background: 'var(--ink-700)',
    border: '1px solid var(--ink-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--cream-50)',
    fontFamily: 'var(--font-sans)',
    fontSize: 15, padding: '10px 13px',
    width: '100%', outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

// ── ImageUploader ────────────────────────────────────────────
function ImageUploader({
  value, onChange, storagePath,
}: {
  value: string;
  onChange: (url: string) => void;
  storagePath: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let fileToUpload: File = file;
      let path = storagePath;

      // Convert to WebP
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.85));
        if (blob) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          fileToUpload = new File([blob], `${cleanName}.webp`, { type: 'image/webp' });
          path = path.replace(/\.[^/.]+$/, '') + '.webp';
        }
        URL.revokeObjectURL(img.src);
      } catch {
        // fall through with original file
      }

      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, fileToUpload);
      const bucket = (firebaseConfig as any).storageBucket || 'hemingways-jomtien-website.firebasestorage.app';
      const gsUrl = `gs://${bucket}/${path}`;
      onChange(gsUrl);
      toast.success('Image uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {value && (
        <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--ink-700)', border: '1px solid var(--border)' }}>
          <FirebaseImage
            src={normalizeImageUrl(value)}
            alt="Special"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--cream-50)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          ...S.btnGhost,
          border: '1px dashed var(--ink-500)',
          padding: '10px 16px',
          color: uploading ? 'var(--text-faint)' : 'var(--gold-400)',
          width: '100%', justifyContent: 'center',
        }}
      >
        <Upload size={15} />
        {uploading ? 'Uploading…' : value ? 'Change Image' : 'Upload Image'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
function SpecialModal({
  special, onClose, onSave,
}: {
  special: Special | null;
  onClose: () => void;
  onSave: (data: Omit<Special, 'id'>) => Promise<void>;
}) {
  const isNew = !special?.id;
  const [form, setForm] = useState<Omit<Special, 'id'>>({
    name: special?.name || '',
    day: special?.day || 'Monday',
    image: special?.image || '',
    order: special?.order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const storagePath = `specials/${Date.now()}-${form.name.replace(/\s+/g, '-').toLowerCase() || 'special'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--ink-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--cream-50)', textTransform: 'uppercase' }}>
            {isNew ? 'Add Special' : 'Edit Special'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Image */}
          <div>
            <label style={S.label}>Image</label>
            <ImageUploader
              value={form.image}
              onChange={url => setForm(f => ({ ...f, image: url }))}
              storagePath={storagePath}
            />
          </div>

          {/* Title */}
          <div>
            <label style={S.label}>Title *</label>
            <input
              style={S.input}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Doner Kebab Special"
              required
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold-500)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,159,61,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--ink-500)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Day of week */}
          <div>
            <label style={S.label}>Day</label>
            <select
              style={{ ...S.input, cursor: 'pointer' }}
              value={form.day}
              onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold-500)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--ink-500)'; }}
            >
              {DAY_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Order */}
          <div>
            <label style={S.label}>Display Order</label>
            <input
              type="number"
              style={S.input}
              value={form.order}
              onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold-500)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,159,61,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--ink-500)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ ...S.btnGhost, border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px 18px' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}
            >
              <Save size={15} />
              {saving ? 'Saving…' : 'Save Special'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function SpecialsDashboard() {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | Special | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Realtime listener
  useEffect(() => {
    const q = query(collection(db, 'specials'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setSpecials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Special)));
      setLoading(false);
    }, err => {
      console.error('Specials listener error:', err);
      setError('Failed to load specials.');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (data: Omit<Special, 'id'>) => {
    try {
      if (typeof modal === 'object' && modal !== null && modal.id) {
        await updateDoc(doc(db, 'specials', modal.id), data as any);
        await logActivity('Special Updated', `Updated: ${data.name}`, 'menu');
        toast.success('Special updated');
      } else {
        await addDoc(collection(db, 'specials'), data);
        await logActivity('Special Added', `Added: ${data.name}`, 'menu');
        toast.success('Special added');
      }
      setModal(null);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save special');
      throw err;
    }
  };

  const handleDelete = async (special: Special) => {
    if (!window.confirm(`Delete "${special.name}"? This cannot be undone.`)) return;
    if (!special.id) return;
    setDeleting(special.id);
    try {
      await deleteDoc(doc(db, 'specials', special.id));
      await logActivity('Special Deleted', `Deleted: ${special.name}`, 'menu');
      toast.success('Special deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete special');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--ink-500)', borderTopColor: 'var(--gold-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
          <h1 style={S.title}>SPECIALS</h1>
        </div>
        <button
          style={S.btnPrimary}
          onClick={() => setModal('add')}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--teal-400)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--teal-500)')}
        >
          <Plus size={16} /> Add Special
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '20px 28px 0', padding: '12px 16px', background: 'rgba(225,30,21,0.1)', border: '1px solid var(--red-500)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red-400)', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Grid */}
      <div style={{ padding: 28 }}>
        {specials.length === 0 ? (
          <div style={{ background: 'var(--ink-700)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: 'var(--ink-600)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-faint)' }}>
              <ImageIcon size={24} />
            </div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', color: 'var(--cream-50)', marginBottom: 8 }}>No Specials Yet</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>Add your first special offer to display it on the site.</div>
            <button style={S.btnPrimary} onClick={() => setModal('add')}>
              <Plus size={15} /> Add First Special
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {specials.map(special => (
              <div
                key={special.id}
                style={{ background: 'var(--ink-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)', transition: 'border-color 0.2s ease' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: 180, background: 'var(--ink-600)', overflow: 'hidden' }}>
                  {special.image ? (
                    <FirebaseImage
                      src={normalizeImageUrl(special.image)}
                      alt={special.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-400)' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {/* Day badge */}
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: DAY_COLORS[special.day] || 'var(--gold-500)',
                    color: 'var(--ink-900)',
                    fontFamily: 'var(--font-condensed)', fontWeight: 600,
                    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Calendar size={11} />
                    {special.day}
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', color: 'var(--cream-50)', marginBottom: 12, letterSpacing: '0.02em' }}>
                    {special.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setModal(special)}
                      style={S.btnGhost}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-300)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(special)}
                      disabled={deleting === special.id}
                      style={{ ...S.btnGhost, color: deleting === special.id ? 'var(--text-faint)' : 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-400)')}
                      onMouseLeave={e => (e.currentTarget.style.color = deleting === special.id ? 'var(--text-faint)' : 'var(--text-muted)')}
                    >
                      <Trash2 size={13} /> {deleting === special.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <SpecialModal
          special={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
