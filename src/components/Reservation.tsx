import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { Phone, MessageCircle, MapPin, Users, Calendar, Clock } from 'lucide-react';
import { db } from '../firebase';
import { toast } from 'sonner';
import type { CompanyProfile } from '../types';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-condensed)',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 6,
};

const cardTitle: React.CSSProperties = {
  fontFamily: 'var(--font-condensed)',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--gold-500)',
  marginBottom: 20,
};

const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const emptyForm = {
  name: '',
  contactNumber: '',
  date: todayISO(),
  time: '19:00',
  guests: 2,
  specialRequest: '',
};

export const ReservationPage = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => {
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phone = companyProfile?.phone || "+6664 620 9225";
  const address = companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150";
  const whatsappDigits = (companyProfile?.whatsapp || '').replace(/[^\d]/g, '');
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Reserve a Table | Hemingways Jomtien';
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contactNumber.trim() || !form.date || !form.time || !form.guests) {
      toast.error('Please fill in your name, phone/WhatsApp, date, time and number of guests.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Reuses the same submissions collection/notification pipeline as the general
      // contact form, tagged as a reservation so staff can tell the two apart.
      addDoc(collection(db, 'contact_submissions'), {
        ...form,
        type: 'reservation',
        createdAt: new Date().toISOString(),
        source: 'reservation_page',
      }).catch(err => console.error('Error saving reservation to Firestore:', err));

      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: 'reservation',
          phone: form.contactNumber,
          date: form.date,
          time: form.time,
          guests: form.guests,
          message: form.specialRequest,
        }),
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      setSubmitted(true);
      toast.success("Reservation request sent — we'll confirm shortly.");
      setForm(emptyForm);
    } catch (error) {
      console.error('Error sending reservation:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to send your request. Please call or WhatsApp us instead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      {/* Header */}
      <section style={{ background: 'var(--ink-900)', padding: '140px 24px 64px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            <span className="hw-badge hw-badge-gold">Book a Table</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 58px)', color: 'var(--cream-50)', textTransform: 'uppercase', margin: '0 0 14px' }}>
            Reserve a Table
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--text-muted)', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            Send us your details below and we'll confirm your table. Prefer to talk it through? Call or WhatsApp us directly.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="hw-btn-warm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px' }}>
              <Phone size={16} /> Call {phone}
            </a>
            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', border: `1px solid var(--border)`, borderRadius: 'var(--radius-md)', color: 'var(--cream-50)', textDecoration: 'none', fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', border: `1px solid var(--border)`, borderRadius: 'var(--radius-md)', color: 'var(--cream-50)', textDecoration: 'none', fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <MapPin size={16} /> Directions
            </a>
          </div>
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: '56px 24px 80px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="hw-card" style={{ padding: '32px 28px' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={cardTitle}>Request Sent</div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--cream-100)', lineHeight: 1.7 }}>
                  Thanks — we've got your reservation request and will confirm by phone or WhatsApp shortly.
                </p>
                <button
                  className="hw-btn-outline"
                  style={{ marginTop: 16, padding: '10px 20px' }}
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Request
                </button>
              </div>
            ) : (
              <>
                <div style={cardTitle}>Reservation Details</div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label htmlFor="res-name" style={labelStyle}>Name *</label>
                    <input
                      id="res-name"
                      className="hw-input"
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="res-contact" style={labelStyle}>Phone or WhatsApp Number *</label>
                    <input
                      id="res-contact"
                      className="hw-input"
                      type="tel"
                      placeholder="e.g. 081 234 5678"
                      value={form.contactNumber}
                      onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div>
                      <label htmlFor="res-date" style={labelStyle}><Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />Date *</label>
                      <input
                        id="res-date"
                        className="hw-input"
                        type="date"
                        min={todayISO()}
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="res-time" style={labelStyle}><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Time *</label>
                      <input
                        id="res-time"
                        className="hw-input"
                        type="time"
                        value={form.time}
                        onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="res-guests" style={labelStyle}><Users size={11} style={{ display: 'inline', marginRight: 4 }} />Guests *</label>
                      <input
                        id="res-guests"
                        className="hw-input"
                        type="number"
                        min={1}
                        max={40}
                        value={form.guests}
                        onChange={e => setForm(f => ({ ...f, guests: Number(e.target.value) }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="res-request" style={labelStyle}>Special Requests (optional)</label>
                    <textarea
                      id="res-request"
                      className="hw-input"
                      placeholder="Birthday, big-match viewing, dietary needs, high chair..."
                      rows={3}
                      value={form.specialRequest}
                      onChange={e => setForm(f => ({ ...f, specialRequest: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.6, margin: 0 }}>
                    This sends a reservation request to our team — it isn't an instant confirmation. We'll call or WhatsApp you to confirm, usually within a few hours during opening hours (9:30 AM – 12:00 AM daily). For same-day or large group bookings, calling or WhatsApp is fastest.
                  </p>

                  <button
                    type="submit"
                    className="hw-btn-warm"
                    disabled={isSubmitting}
                    style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    {isSubmitting ? 'Sending…' : 'Send Reservation Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
