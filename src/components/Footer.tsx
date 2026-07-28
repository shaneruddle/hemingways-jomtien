import { useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { MapPin, Phone, Clock, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import type { CompanyProfile } from '../types';
import { DEFAULT_COMPANY_PROFILE, formatPhoneDisplay, formatOpeningHoursSummary } from '../utils/companyDefaults';

interface FooterProps {
  companyProfile: CompanyProfile | null;
  /**
   * Suppresses the "Get in Touch" message form in the third column, showing
   * quick contact links (call/email) instead. Set this on pages that already
   * have their own primary contact-style form above the footer (the Contact
   * Us page's own message form, the Reservation page's booking form) so the
   * visitor isn't shown two near-identical forms stacked on the same page.
   */
  hideContactForm?: boolean;
}

export const Footer = ({ companyProfile, hideContactForm }: FooterProps) => {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Same cross-page anchor logic as the header nav: if we're already on the
  // homepage, scroll straight to the section; otherwise navigate to "/#id" and
  // let the Navbar's hash-scroll effect (which is always mounted) handle it
  // once the homepage has rendered.
  const handleFooterLinkClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/#' + id);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Best-effort record in Firestore; the actual notification is the email below.
      addDoc(collection(db, 'contact_submissions'), {
        ...formState,
        createdAt: new Date().toISOString(),
        source: 'website_footer',
      }).catch(err => console.error("Error saving contact form to Firestore:", err));

      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      setSubmitted(true);
      toast.success("Thank you! We'll be in touch soon. — Hemingways Jomtien");
      setFormState({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error sending contact form:", error instanceof Error ? error.message : 'Unknown error');
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: 6,
  };

  const phone = formatPhoneDisplay(companyProfile?.phone);
  const email = companyProfile?.email || DEFAULT_COMPANY_PROFILE.email;

  return (
    <footer id="contact" style={{ background: 'var(--ink-900)' }}>
      {/* Top rule strip */}
      <div style={{ borderTop: `1px solid var(--border)`, borderBottom: `1px solid var(--border)`, padding: '14px 24px', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--gold-500)' }}>★</span> Good Food · Cold Drinks · Great Times <span style={{ color: 'var(--gold-500)' }}>★</span>
        </span>
      </div>

      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: '64px 24px' }} className="grid md:grid-cols-3 gap-12">
        {/* Col 1: Logo + social */}
        <div>
          <img src="/assets/logo/hemingways-logo-white.png" height={40} alt="Hemingways Jomtien" style={{ height: 40, width: 'auto', marginBottom: 16 }} />
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24, maxWidth: 260 }}>
            {companyProfile?.description || DEFAULT_COMPANY_PROFILE.description}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {companyProfile?.socialLinks?.facebook !== '' && (
              <a
                href={companyProfile?.socialLinks?.facebook || DEFAULT_COMPANY_PROFILE.socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)' }}
              >
                <Facebook size={18} />
              </a>
            )}
            {companyProfile?.socialLinks?.instagram !== '' && (
              <a
                href={companyProfile?.socialLinks?.instagram || DEFAULT_COMPANY_PROFILE.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)' }}
              >
                <Instagram size={18} />
              </a>
            )}
            {companyProfile?.lineId && (
              <a
                href={`https://line.me/ti/p/~${companyProfile.lineId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LINE"
                style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)' }}
              >
                <MessageCircle size={18} />
              </a>
            )}
          </div>
        </div>

        {/* Col 2: Find Us */}
        <div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 20 }}>
            Find Us
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={15} style={{ color: 'var(--gold-500)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {companyProfile?.address || DEFAULT_COMPANY_PROFILE.address}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={15} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
                {phone}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={15} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>{formatOpeningHoursSummary(companyProfile?.openingHours)}</span>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 14 }}>
              Explore
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Home', id: 'top' },
                { label: 'Food Menu', id: 'menu' },
                { label: 'Daily Specials', id: 'specials' },
                { label: 'Location', id: 'location' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={`/#${link.id}`}
                  onClick={(e) => handleFooterLinkClick(e, link.id)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/sports"
                onClick={() => window.scrollTo(0, 0)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Sports Schedule
              </Link>
              <Link
                to="/menu"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Digital Menu
              </Link>
              <Link
                to="/blog"
                onClick={() => window.scrollTo(0, 0)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Blog
              </Link>
              <Link
                to="/contact-us"
                onClick={() => window.scrollTo(0, 0)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Contact Us
              </Link>
              <Link
                to="/careers"
                onClick={() => window.scrollTo(0, 0)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Careers
              </Link>
            </div>
          </div>
        </div>

        {/* Col 3: Contact form — or, on pages that already have their own
            primary contact-style form above the footer, a short pointer plus
            direct contact links instead of a second near-identical form. */}
        <div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 20 }}>
            Get in Touch
          </div>
          {hideContactForm ? (
            <>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Use the form above, or reach us directly.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--cream-100)', textDecoration: 'none' }}
                >
                  <Phone size={16} style={{ color: 'var(--gold-500)', flexShrink: 0 }} /> {phone}
                </a>
                <a
                  href={`mailto:${email}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--cream-100)', textDecoration: 'none' }}
                >
                  <MessageCircle size={16} style={{ color: 'var(--gold-500)', flexShrink: 0 }} /> {email}
                </a>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Looking to book a table? Use our{' '}
                <Link to="/reserve" onClick={() => window.scrollTo(0, 0)} style={{ color: 'var(--gold-400)' }}>reservation form</Link>.
                {' '}For anything else — group bookings, events or a quick question — drop us a message.
              </p>
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label htmlFor="footer-contact-name" style={labelStyle}>Name</label>
                  <input
                    id="footer-contact-name"
                    className="hw-input"
                    type="text"
                    placeholder="Your name"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="footer-contact-email" style={labelStyle}>Email</label>
                  <input
                    id="footer-contact-email"
                    className="hw-input"
                    type="email"
                    placeholder="your@email.com"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="footer-contact-message" style={labelStyle}>Message</label>
                  <textarea
                    id="footer-contact-message"
                    className="hw-input"
                    placeholder="Your message..."
                    rows={3}
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  type="submit"
                  className="hw-btn-warm"
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: `1px solid var(--border)`, padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-faint)' }}>
          © {new Date().getFullYear()} Hemingways Jomtien · Restaurant & Bar · Also now on Grab Food
        </p>
      </div>
    </footer>
  );
};
