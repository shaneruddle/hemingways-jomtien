import { useState, useEffect, type CSSProperties, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, onSnapshot, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Briefcase, Sparkles, UtensilsCrossed, Clock3, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { PostBody } from './Blog';
import type { EmploymentType, JobPosting } from './careers/types';

type Lang = 'en' | 'th';

const EMPLOYMENT_TYPE_LABELS_BY_LANG: Record<Lang, Record<EmploymentType, string>> = {
  en: {
    full_time: 'Full-time',
    part_time: 'Part-time',
    casual: 'Casual',
    seasonal: 'Seasonal',
    contract: 'Contract',
    internship: 'Internship',
  },
  th: {
    full_time: 'งานประจำ',
    part_time: 'งานพาร์ทไทม์',
    casual: 'งานชั่วคราว',
    seasonal: 'งานตามฤดูกาล',
    contract: 'งานสัญญาจ้าง',
    internship: 'ฝึกงาน',
  },
};

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    badge: 'Now Hiring',
    title: 'Careers',
    subtitle: "Come work at Jomtien's biggest expat sports bar & restaurant. See our current openings below.",
    whyTitle: 'Why Work With Us',
    perk1: 'Fun, high-energy sports bar atmosphere',
    perk2: 'Staff meals & tips',
    perk3: 'Flexible shifts',
    perk4: 'Friendly, multicultural team',
    loading: 'Loading openings...',
    noOpeningsTitle: "We're not actively hiring right now",
    noOpeningsBody: "But we're always happy to meet great people. Send us your CV and tell us why you'd be a great fit — we'll keep it on file for the next opening.",
    emailUs: 'Email Us',
    allOpenings: 'All Openings',
    backToCareers: 'Back to Careers',
    notAvailable: "This position isn't available.",
    requirements: 'Requirements',
    applyForRole: 'Apply For This Role',
    fullName: 'Full Name',
    email: 'Email',
    phone: 'Phone',
    resumeLabel: 'Resume / CV Link (optional)',
    resumePlaceholder: 'Google Drive, Dropbox, LinkedIn, etc.',
    coverNote: 'Cover Note (optional)',
    coverNotePlaceholder: 'Tell us a bit about yourself...',
    submit: 'Submit Application',
    submitting: 'Submitting...',
    salaryUpTo: 'Up to',
    fillNameEmail: 'Please fill in your name and email.',
    applicationSent: "Application sent! We'll be in touch. — Hemingways Jomtien",
    applicationFailed: 'Failed to submit application. Please try again later.',
  },
  th: {
    badge: 'รับสมัครพนักงาน',
    title: 'ร่วมงานกับเรา',
    subtitle: 'มาร่วมงานกับบาร์กีฬาและร้านอาหารที่ใหญ่ที่สุดสำหรับชาวต่างชาติในจอมเทียน ดูตำแหน่งงานที่เปิดรับด้านล่าง',
    whyTitle: 'ทำไมต้องทำงานกับเรา',
    perk1: 'บรรยากาศบาร์กีฬาที่สนุกและมีชีวิตชีวา',
    perk2: 'อาหารพนักงานและทิป',
    perk3: 'ตารางงานที่ยืดหยุ่น',
    perk4: 'ทีมงานเป็นกันเองหลากหลายเชื้อชาติ',
    loading: 'กำลังโหลดตำแหน่งงาน...',
    noOpeningsTitle: 'ขณะนี้เรายังไม่ได้เปิดรับสมัครงานอย่างเป็นทางการ',
    noOpeningsBody: 'แต่เรายินดีเสมอที่จะได้รู้จักคนเก่งๆ ส่งเรซูเม่มาบอกเราว่าทำไมคุณถึงเหมาะกับทีมเรา เราจะเก็บไว้พิจารณาเมื่อมีตำแหน่งว่าง',
    emailUs: 'ส่งอีเมลถึงเรา',
    allOpenings: 'ตำแหน่งงานทั้งหมด',
    backToCareers: 'กลับไปหน้าร่วมงานกับเรา',
    notAvailable: 'ตำแหน่งนี้ไม่พร้อมใช้งานแล้ว',
    requirements: 'คุณสมบัติที่ต้องการ',
    applyForRole: 'สมัครตำแหน่งนี้',
    fullName: 'ชื่อ-นามสกุล',
    email: 'อีเมล',
    phone: 'เบอร์โทรศัพท์',
    resumeLabel: 'ลิงก์เรซูเม่ / ซีวี (ไม่บังคับ)',
    resumePlaceholder: 'Google Drive, Dropbox, LinkedIn ฯลฯ',
    coverNote: 'ข้อความแนะนำตัว (ไม่บังคับ)',
    coverNotePlaceholder: 'เล่าเกี่ยวกับตัวคุณสักเล็กน้อย...',
    submit: 'ส่งใบสมัคร',
    submitting: 'กำลังส่ง...',
    salaryUpTo: 'สูงสุด',
    fillNameEmail: 'กรุณากรอกชื่อและอีเมลของคุณ',
    applicationSent: 'ส่งใบสมัครเรียบร้อยแล้ว! เราจะติดต่อกลับไป — Hemingways Jomtien',
    applicationFailed: 'ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้งในภายหลัง',
  },
};

const LANG_STORAGE_KEY = 'hw_careers_lang';

const useLang = (): [Lang, (l: Lang) => void] => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    return (window.localStorage.getItem(LANG_STORAGE_KEY) as Lang) || 'en';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      // ignore storage errors
    }
  };

  return [lang, setLang];
};

const LangToggle = ({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      background: 'var(--ink-700)',
      border: '1px solid var(--border)',
      borderRadius: 999,
      padding: 3,
    }}
  >
    {(['en', 'th'] as Lang[]).map(l => (
      <button
        key={l}
        type="button"
        onClick={() => setLang(l)}
        style={{
          border: 'none',
          cursor: 'pointer',
          padding: '6px 14px',
          borderRadius: 999,
          fontFamily: 'var(--font-condensed)',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.06em',
          background: lang === l ? 'var(--gold-500)' : 'transparent',
          color: lang === l ? 'var(--ink-900)' : 'var(--text-muted)',
          transition: 'all 0.15s ease',
        }}
      >
        {l === 'en' ? 'EN' : 'ไทย'}
      </button>
    ))}
  </div>
);

const formatSalary = (job: JobPosting, t: Record<string, string>) => {
  const { salary_min, salary_max, salary_note } = job;
  if (!salary_min && !salary_max) return null;
  const fmt = (n: number) => `฿${n.toLocaleString()}`;
  let range = '';
  if (salary_min && salary_max) range = `${fmt(salary_min)} – ${fmt(salary_max)}`;
  else if (salary_min) range = `${fmt(salary_min)}+`;
  else if (salary_max) range = `${t.salaryUpTo} ${fmt(salary_max)}`;
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

const PERK_ICONS = [Sparkles, UtensilsCrossed, Clock3, Users];
const PERK_KEYS = ['perk1', 'perk2', 'perk3', 'perk4'];
const COLLAGE_IMAGES = ['/assets/sport-action.jpg', '/assets/from-the-tap.jpg', '/assets/cajun-food.jpg'];

export const CareersList = () => {
  const { jobs, loading } = usePublishedJobs();
  const [lang, setLang] = useLang();
  const t = COPY[lang];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Careers | Hemingways Jomtien';
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      <section
        style={{
          position: 'relative',
          padding: '140px 24px 64px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/assets/careers-team-welcome.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(8,8,8,0.96) 10%, rgba(8,8,8,0.75) 55%, rgba(8,8,8,0.6) 100%)',
            zIndex: 1,
          }}
        />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 'var(--container)', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <span className="hw-badge hw-badge-teal">{t.badge}</span>
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
            {t.title}
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
            {t.subtitle}
          </p>
        </div>
      </section>

      <section style={{ padding: '56px 24px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
          <div className="grid md:grid-cols-2 gap-10" style={{ alignItems: 'center' }}>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(24px, 3vw, 32px)',
                  color: 'var(--cream-50)',
                  textTransform: 'uppercase',
                  margin: '0 0 20px',
                }}
              >
                {t.whyTitle}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {PERK_KEYS.map((key, i) => {
                  const Icon = PERK_ICONS[i];
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        style={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'var(--ink-700)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--gold-500)',
                        }}
                      >
                        <Icon size={17} />
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 15,
                          color: 'var(--text-muted)',
                          lineHeight: 1.6,
                          margin: '7px 0 0',
                        }}
                      >
                        {t[key]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {COLLAGE_IMAGES.map((src, i) => (
                <div
                  key={src}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    gridColumn: i === 0 ? 'span 3 / span 3' : 'span 1 / span 1',
                    height: i === 0 ? 200 : 120,
                  }}
                >
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '32px 24px 80px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
          {loading ? (
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center' }}>{t.loading}</p>
          ) : jobs.length === 0 ? (
            <div
              className="hw-card"
              style={{
                maxWidth: 560,
                margin: '0 auto',
                padding: '40px 32px',
                textAlign: 'center',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-condensed)',
                  fontWeight: 700,
                  fontSize: 20,
                  color: 'var(--cream-50)',
                  textTransform: 'uppercase',
                  margin: '0 0 12px',
                }}
              >
                {t.noOpeningsTitle}
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 24px' }}>
                {t.noOpeningsBody}
              </p>
              <a
                href="mailto:info@hemingwaysjomtien.com?subject=Job%20Application"
                className="hw-btn-warm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
              >
                <Mail size={16} /> {t.emailUs}
              </a>
            </div>
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
                        {EMPLOYMENT_TYPE_LABELS_BY_LANG[lang][job.employment_type]}
                      </div>
                      {formatSalary(job, t) && (
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--gold-400)' }}>
                          {formatSalary(job, t)}
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
  const [lang, setLang] = useLang();
  const t = COPY[lang];

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
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>{t.loading}</p>
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
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>{t.notAvailable}</p>
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
          <ArrowLeft size={16} /> {t.backToCareers}
        </Link>
      </div>
    );
  }

  const requirements = (job.requirements || '').split('\n').map(l => l.trim()).filter(Boolean);
  const salary = formatSalary(job, t);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      <article style={{ maxWidth: 780, margin: '0 auto', padding: '140px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
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
            }}
          >
            <ArrowLeft size={14} /> {t.allOpenings}
          </Link>
          <LangToggle lang={lang} setLang={setLang} />
        </div>

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
            <Calendar size={15} style={{ color: 'var(--gold-500)' }} /> {EMPLOYMENT_TYPE_LABELS_BY_LANG[lang][job.employment_type]}
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
              {t.requirements}
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
          <ApplicationForm job={job} t={t} />
        </div>
      </article>
    </div>
  );
};

const ApplicationForm = ({ job, t }: { job: JobPosting; t: Record<string, string> }) => {
  const [form, setForm] = useState({ applicant_name: '', email: '', phone: '', resume_url: '', cover_note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.applicant_name.trim() || !form.email.trim()) {
      toast.error(t.fillNameEmail);
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
      toast.success(t.applicationSent);
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting application:', err);
      toast.error(t.applicationFailed);
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
          {job.title} — {t.applicationSent}
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
        {t.applyForRole}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t.fullName}</label>
          <input
            className="hw-input"
            type="text"
            value={form.applicant_name}
            onChange={e => setForm({ ...form, applicant_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>{t.email}</label>
          <input
            className="hw-input"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>{t.phone}</label>
          <input
            className="hw-input"
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>{t.resumeLabel}</label>
          <input
            className="hw-input"
            type="url"
            placeholder={t.resumePlaceholder}
            value={form.resume_url}
            onChange={e => setForm({ ...form, resume_url: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>{t.coverNote}</label>
          <textarea
            className="hw-input"
            placeholder={t.coverNotePlaceholder}
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
          {isSubmitting ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  );
};
