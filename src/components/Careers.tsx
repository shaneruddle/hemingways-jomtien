import { useState, useEffect, type CSSProperties, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, onSnapshot, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { PostBody } from './Blog';
import { EMPLOYMENT_TYPE_LABELS, type JobPosting } from './careers/types';

const formatSalary = (job: JobPosting) => {
  const { salary_min, salary_max, salary_note } = job;
  if (!salary_min && !salary_max) return null;
  const fmt = (n: number) => `฿${n.toLocaleString()}`;
  let range = '';
  if (salary_min && salary_max) range = `${fmt(salary_min)} – ${fmt(salary_max)}`;
  else if (salary_min) range = `${fmt(salary_min)}+`;
  else if (salary_max) range = `Up to ${fmt(salary_max)}`;
  return salary_note ? `${range} ${salary_note}` : range;
};

const usePublishedJobs = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'careers_jobs'), where('status', '==', 'published'));
    const unsub = onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting));
        list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        setJobs(list);
        setLoading(false);
      },
      err => {
        console.error('Error loading job postings:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { jobs, loading };
};

export const CareersList = () => {
  const { jobs, loading } = usePublishedJobs();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Careers | Hemingways Jomtien';
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      <section style={{ background: 'var(--ink-900)', padding: '140px 24px 56px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            <span className="hw-badge hw-badge-teal">Join The Team</span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(34px, 5vw, 58px)',
              color: 'var(--cream-50)',
              textTransform: 'uppercase',
              margin: '0 0 14px',
            }}
          >
            Careers
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 16,
              color: 'var(--text-muted)',
              maxWidth: 620,
              margin: '0 auto',
              lineHeight: 1.7,
            }}
          >
            Come work at Jomtien's biggest expat sports bar & restaurant. See our current openings below.
          </p>
        </div>
      </section>

      <section style={{ padding: '56px 24px 80px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
          {loading ? (
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center' }}>
              Loading openings...
            </p>
          ) : jobs.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center' }}>
              No open positions right now — check back soon.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, idx) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  viewport={{ once: true }}
                >
                  <Link
                    to={`/careers/${job.id}`}
                    onClick={() => window.scrollTo(0, 0)}
                    style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                  >
                    <div className="hw-card" style={{ padding: '24px 22px', height: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'var(--font-condensed)',
                          fontSize: 11,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--gold-500)',
                          marginBottom: 10,
                        }}
                      >
                        <Briefcase size={12} /> {job.department}
                      </div>
                      <h3
                        style={{
                          fontFamily: 'var(--font-condensed)',
                          fontWeight: 700,
                          fontSize: 20,
                          color: 'var(--cream-50)',
                          textTransform: 'uppercase',
                          margin: '0 0 10px',
                          lineHeight: 1.3,
                        }}
                      >
                        {job.title}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'var(--font-sans)',
                          fontSize: 13,
                          color: 'var(--text-muted)',
                          marginBottom: 6,
                        }}
                      >
                        <MapPin size={13} /> {job.location}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 13,
                          color: 'var(--text-muted)',
                          marginBottom: 6,
                        }}
                      >
                        {EMPLOYMENT_TYPE_LABELS[job.employment_type]}
                      </div>
                      {formatSalary(job) && (
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--gold-400)' }}>
                          {formatSalary(job)}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export const CareersJobPage = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!jobId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'careers_jobs', jobId));
        if (!snap.exists() || (snap.data() as JobPosting).status !== 'published') {
          setNotFound(true);
        } else {
          const data = { id: snap.id, ...snap.data() } as JobPosting;
          setJob(data);
          document.title = `${data.title} | Careers | Hemingways Jomtien`;
        }
      } catch (err) {
        console.error('Error loading job posting:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--ink-850)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--ink-850)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>This position isn't available.</p>
        <Link
          to="/careers"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-condensed)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold-400)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Careers
        </Link>
      </div>
    );
  }

  const requirements = (job.requirements || '').split('\n').map(l => l.trim()).filter(Boolean);
  const salary = formatSalary(job);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      <article style={{ maxWidth: 780, margin: '0 auto', padding: '140px 24px 80px' }}>
        <Link
          to="/careers"
          onClick={() => window.scrollTo(0, 0)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-condensed)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold-400)',
            textDecoration: 'none',
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={14} /> All Openings
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-condensed)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold-500)',
            marginBottom: 12,
          }}
        >
          <Briefcase size={12} /> {job.department}
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(30px, 4.5vw, 48px)',
            color: 'var(--cream-50)',
            textTransform: 'uppercase',
            margin: '0 0 16px',
            lineHeight: 1.15,
          }}
        >
          {job.title}
        </h1>

        <div className="grid md:grid-cols-3 gap-3" style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-muted)',
            }}
          >
            <MapPin size={15} style={{ color: 'var(--gold-500)' }} /> {job.location}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-muted)',
            }}
          >
            <Calendar size={15} style={{ color: 'var(--gold-500)' }} /> {EMPLOYMENT_TYPE_LABELS[job.employment_type]}
          </div>
          {salary && (
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--gold-400)' }}>{salary}</div>
          )}
        </div>

        {job.description && <PostBody text={job.description} />}

        {requirements.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: 'var(--cream-50)',
                textTransform: 'uppercase',
                margin: '0 0 14px',
              }}
            >
              Requirements
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                lineHeight: 1.8,
              }}
            >
              {requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: 48, borderTop: '1px solid var(--border)', paddingTop: 40 }}>
          <ApplicationForm job={job} />
        </div>
      </article>
    </div>
  );
};

const ApplicationForm = ({ job }: { job: JobPosting }) => {
  const [form, setForm] = useState({ applicant_name: '', email: '', phone: '', resume_url: '', cover_note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.applicant_name.trim() || !form.email.trim()) {
      toast.error('Please fill in your name and email.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'careers_applications'), {
        job_id: job.id,
        job_title: job.title,
        applicant_name: form.applicant_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        resume_url: form.resume_url.trim(),
        cover_note: form.cover_note.trim(),
        status: 'new',
        applied_at: new Date().toISOString(),
        notes: '',
      });
      toast.success("Application sent! We'll be in touch. — Hemingways Jomtien");
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting application:', err);
      toast.error('Failed to submit application. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 6,
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--cream-50)' }}>
          Thanks for applying to {job.title} — we've received your application and will be in touch.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: 'var(--cream-50)',
          textTransform: 'uppercase',
          margin: '0 0 20px',
        }}
      >
        Apply For This Role
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input
            className="hw-input"
            type="text"
            value={form.applicant_name}
            onChange={e => setForm({ ...form, applicant_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            className="hw-input"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input
            className="hw-input"
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Resume / CV Link (optional)</label>
          <input
            className="hw-input"
            type="url"
            placeholder="Google Drive, Dropbox, LinkedIn, etc."
            value={form.resume_url}
            onChange={e => setForm({ ...form, resume_url: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Cover Note (optional)</label>
          <textarea
            className="hw-input"
            placeholder="Tell us a bit about yourself..."
            rows={4}
            value={form.cover_note}
            onChange={e => setForm({ ...form, cover_note: e.target.value })}
            style={{ resize: 'vertical' }}
          />
        </div>
        <button
          type="submit"
          className="hw-btn-warm"
          disabled={isSubmitting}
          style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};
