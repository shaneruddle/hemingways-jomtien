import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { logActivity } from '../utils/logger';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Save, X, AlertCircle, Trophy, Calendar, Clock
} from 'lucide-react';
import type { SportsEvent } from '../types';

const SPORT_OPTIONS = [
  'Football', 'Rugby', 'Cricket', 'UFC / MMA', 'Boxing', 'Golf', 'Tennis', 'Motorsport', 'Other',
];

// ── Shared inline-style helpers (mirrors SpecialsDashboard for visual consistency) ──
const S = {
  page: { background: '#f8f9fb', minHeight: '100vh' } as React.CSSProperties,
  header: {
    background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '20px 28px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  } as React.CSSProperties,
  eyebrow: {
    fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#B97D15', marginBottom: 4,
  } as React.CSSProperties,
  title: { fontFamily: 'var(--font-display)', fontSize: 28, color: '#111827', margin: 0, lineHeight: 1 } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
    background: '#1DA0A8', color: '#ffffff', border: '2px solid #1DA0A8', borderRadius: 2,
    fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 13, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, cursor: 'pointer', lineHeight: 1, transition: 'background 0.2s ease',
  } as React.CSSProperties,
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
    background: 'transparent', color: '#B97D15', border: 'none', borderRadius: 2,
    fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 12, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, cursor: 'pointer', lineHeight: 1,
  } as React.CSSProperties,
  label: {
    fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: '#6b7280', display: 'block', marginBottom: 7,
  } as React.CSSProperties,
  input: {
    background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 2, color: '#111827',
    fontFamily: 'var(--font-sans)', fontSize: 15, padding: '10px 13px', width: '100%',
    outline: 'none', boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

const isToday = (isoDate: string) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
  return isoDate === today;
};

// ── Modal ────────────────────────────────────────────────────
function SportsEventModal({
  event, onClose, onSave,
}: {
  event: SportsEvent | null;
  onClose: () => void;
  onSave: (data: Omit<SportsEvent, 'id'>) => Promise<void>;
}) {
  const isNew = !event?.id;
  const [form, setForm] = useState<Omit<SportsEvent, 'id'>>({
    date: event?.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
    time: event?.time || '20:00',
    sport: event?.sport || 'Football',
    competition: event?.competition || '',
    participants: event?.participants || '',
    order: event?.order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.participants.trim()) { toast.error('Participants / fixture is required'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: '#111827', textTransform: 'uppercase' }}>
            {isNew ? 'Add Fixture' : 'Edit Fixture'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={S.label}>Date *</label>
              <input
                type="date"
                style={S.input}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={S.label}>Start Time (Thailand) *</label>
              <input
                type="time"
                style={S.input}
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label style={S.label}>Sport</label>
            <select
              style={{ ...S.input, cursor: 'pointer' }}
              value={form.sport}
              onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
            >
              {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={S.label}>Competition</label>
            <input
              style={S.input}
              value={form.competition}
              onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
              placeholder="e.g. Premier League"
            />
          </div>

          <div>
            <label style={S.label}>Participants / Fixture *</label>
            <input
              style={S.input}
              value={form.participants}
              onChange={e => setForm(f => ({ ...f, participants: e.target.value }))}
              placeholder="e.g. Liverpool vs Arsenal"
              required
            />
          </div>

          <div>
            <label style={S.label}>Display Order</label>
            <input
              type="number"
              style={S.input}
              value={form.order}
              onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ ...S.btnGhost, border: '1px solid #e5e7eb', color: '#6b7280', padding: '10px 18px' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
              <Save size={15} />
              {saving ? 'Saving…' : 'Save Fixture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function SportsDashboard() {
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | SportsEvent | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'sports_schedule'), orderBy('date', 'asc'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as SportsEvent)));
      setLoading(false);
    }, err => {
      // Firestore may reject a compound orderBy without a matching index; fall back to a single-field sort.
      console.warn('Sports schedule (compound sort) listener error:', err.message);
      const q2 = query(collection(db, 'sports_schedule'), orderBy('date', 'asc'));
      onSnapshot(q2, snap2 => {
        setEvents(snap2.docs.map(d => ({ id: d.id, ...d.data() } as SportsEvent)));
        setLoading(false);
      }, err2 => {
        console.error('Sports schedule listener error:', err2);
        setError('Failed to load sports schedule.');
        setLoading(false);
      });
    });
    return () => unsub();
  }, []);

  const handleSave = async (data: Omit<SportsEvent, 'id'>) => {
    try {
      if (typeof modal === 'object' && modal !== null && modal.id) {
        await updateDoc(doc(db, 'sports_schedule', modal.id), data as any);
        await logActivity('Sports Fixture Updated', `Updated: ${data.participants}`, 'menu');
        toast.success('Fixture updated');
      } else {
        await addDoc(collection(db, 'sports_schedule'), data);
        await logActivity('Sports Fixture Added', `Added: ${data.participants}`, 'menu');
        toast.success('Fixture added');
      }
      setModal(null);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save fixture');
      throw err;
    }
  };

  const handleDelete = async (event: SportsEvent) => {
    if (!window.confirm(`Delete "${event.participants}"? This cannot be undone.`)) return;
    if (!event.id) return;
    setDeleting(event.id);
    try {
      await deleteDoc(doc(db, 'sports_schedule', event.id));
      await logActivity('Sports Fixture Deleted', `Deleted: ${event.participants}`, 'menu');
      toast.success('Fixture deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete fixture');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #d1d5db', borderTopColor: '#D49F3D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>Content</div>
          <h1 style={S.title}>SPORTS SCHEDULE</h1>
        </div>
        <button style={S.btnPrimary} onClick={() => setModal('add')}>
          <Plus size={16} /> Add Fixture
        </button>
      </div>

      {error && (
        <div style={{ margin: '20px 28px 0', padding: '12px 16px', background: 'rgba(225,30,21,0.1)', border: '1px solid var(--red-500)', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red-400)', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div style={{ padding: 28 }}>
        {events.length === 0 ? (
          <div style={{ background: '#ffffff', border: '2px dashed #e5e7eb', borderRadius: '4px', padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#9ca3af' }}>
              <Trophy size={24} />
            </div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>No Fixtures Yet</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6b7280', marginBottom: 20 }}>Add today's and upcoming fixtures so they show on the public Sports Schedule page.</div>
            <button style={S.btnPrimary} onClick={() => setModal('add')}>
              <Plus size={15} /> Add First Fixture
            </button>
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            {events.map(event => (
              <div
                key={event.id}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}
              >
                <div style={{
                  background: isToday(event.date) ? '#1DA0A8' : '#f3f4f6',
                  color: isToday(event.date) ? '#ffffff' : '#6b7280',
                  fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                }}>
                  <Calendar size={11} /> {isToday(event.date) ? 'Today' : event.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280', fontFamily: 'var(--font-sans)', fontSize: 13, flexShrink: 0 }}>
                  <Clock size={13} /> {event.time}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 16, color: '#111827', textTransform: 'uppercase' }}>
                    {event.participants}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {event.sport}{event.competition ? ` · ${event.competition}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setModal(event)} style={S.btnGhost}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event)}
                    disabled={deleting === event.id}
                    style={{ ...S.btnGhost, color: deleting === event.id ? '#9ca3af' : '#6b7280' }}
                  >
                    <Trash2 size={13} /> {deleting === event.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal !== null && (
        <SportsEventModal
          event={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
