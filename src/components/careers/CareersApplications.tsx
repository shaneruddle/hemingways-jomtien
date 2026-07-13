import { useState, useEffect, useMemo } from 'react';
import { collection, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { logActivity } from '../../utils/logger';
import { toast } from 'sonner';
import { Users, ExternalLink, Save } from 'lucide-react';
import { JobApplication, ApplicationStatus, APPLICATION_STATUS_LABELS, JobPosting } from './types';

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-gray-100 text-gray-600',
  interviewing: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-green-100 text-green-700',
};

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500';

export default function CareersApplications({ jobs }: { jobs: JobPosting[] }) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'careers_applications'), orderBy('applied_at', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication)));
      setLoading(false);
    }, err => {
      console.error('Error loading applications:', err);
      toast.error('Failed to load applications');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => applications.filter(a => {
    if (jobFilter !== 'all' && a.job_id !== jobFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  }), [applications, jobFilter, statusFilter]);

  const setStatus = async (app: JobApplication, status: ApplicationStatus) => {
    if (!app.id) return;
    try {
      await updateDoc(doc(db, 'careers_applications', app.id), { status });
      await logActivity('Application Status Updated', `${app.applicant_name} → ${APPLICATION_STATUS_LABELS[status]}`, 'careers');
      toast.success(`Marked as ${APPLICATION_STATUS_LABELS[status]}`);
    } catch (err) {
      console.error('Error updating application status:', err);
      toast.error('Failed to update status');
    }
  };

  const saveNotes = async (app: JobApplication) => {
    if (!app.id) return;
    const notes = notesDraft[app.id] ?? app.notes ?? '';
    setSavingNotesId(app.id);
    try {
      await updateDoc(doc(db, 'careers_applications', app.id), { notes });
      toast.success('Notes saved');
    } catch (err) {
      console.error('Error saving notes:', err);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotesId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={22} /> Applications
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Review candidates who apply through the careers page.</p>
      </div>

      {applications.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} className={INPUT_CLS + ' w-auto'}>
            <option value="all">All jobs</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={INPUT_CLS + ' w-auto'}>
            <option value="all">All statuses</option>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading applications...</p>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center">
          <p className="text-gray-500 text-sm">No applications yet. Once the careers page is live, submissions will show up here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm italic text-center py-6">No applications match your filters</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => (
            <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">{app.applicant_name}</p>
                  <p className="text-sm text-gray-500">{app.job_title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {app.email}{app.phone ? ` · ${app.phone}` : ''} · Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {app.resume_url && (
                    <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-amber-600 hover:underline">
                      <ExternalLink size={13} /> Resume
                    </a>
                  )}
                  <select
                    value={app.status}
                    onChange={e => setStatus(app, e.target.value as ApplicationStatus)}
                    className={'text-xs font-semibold rounded px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 ' + STATUS_STYLES[app.status]}
                  >
                    {Object.entries(APPLICATION_STATUS_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {app.cover_note && (
                <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{app.cover_note}</p>
              )}

              <div className="mt-3 flex items-start gap-2">
                <textarea
                  rows={2}
                  className={INPUT_CLS + ' flex-1'}
                  placeholder="Internal notes (not visible to applicant)"
                  value={notesDraft[app.id!] ?? app.notes ?? ''}
                  onChange={e => setNotesDraft(d => ({ ...d, [app.id!]: e.target.value }))}
                />
                <button
                  onClick={() => saveNotes(app)}
                  disabled={savingNotesId === app.id}
                  className="p-2 text-gray-500 hover:text-amber-600 disabled:opacity-50"
                  title="Save notes"
                >
                  <Save size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
