import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, where, getCountFromServer
} from 'firebase/firestore';
import { db } from '../../firebase';
import { logActivity } from '../../utils/logger';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Save, X, Briefcase, Users } from 'lucide-react';
import RichTextEditor from '../ui/RichTextEditor';
import { JobPosting, EmploymentType, EMPLOYMENT_TYPE_LABELS, JobStatus } from './types';

const EMPTY: JobPosting = {
  title: '',
  department: '',
  location: 'Jomtien, Thailand',
  employment_type: 'full_time',
  description: '',
  requirements: '',
  salary_min: null,
  salary_max: null,
  salary_note: '',
  status: 'draft',
};

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500';
const LBL_CLS = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';

const STATUS_STYLES: Record<JobStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
};

export default function CareersJobs({ user }: { user: any }) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [saving, setSaving] = useState(false);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const q = query(collection(db, 'careers_jobs'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting)));
      setLoading(false);
    }, err => {
      console.error('Error loading job postings:', err);
      toast.error('Failed to load job postings');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Lazily fetch applicant counts per job (best-effort, non-blocking)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const counts: Record<string, number> = {};
      for (const job of jobs) {
        if (!job.id) continue;
        try {
          const snap = await getCountFromServer(query(collection(db, 'careers_applications'), where('job_id', '==', job.id)));
          counts[job.id] = snap.data().count;
        } catch {
          // ignore — applications collection may not be readable yet or may be empty
        }
      }
      if (!cancelled) setAppCounts(counts);
    })();
    return () => { cancelled = true; };
  }, [jobs]);

  const save = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) { toast.error('Job title is required'); return; }
    if (!editing.department.trim()) { toast.error('Department is required'); return; }
    setSaving(true);
    const payload = {
      title,
      department: editing.department.trim(),
      location: editing.location.trim(),
      employment_type: editing.employment_type,
      description: editing.description,
      requirements: editing.requirements,
      salary_min: editing.salary_min,
      salary_max: editing.salary_max,
      salary_note: editing.salary_note.trim(),
      status: editing.status,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editing.id) {
        await updateDoc(doc(db, 'careers_jobs', editing.id), payload);
        await logActivity('Job Posting Updated', `Updated: ${title}`, 'careers');
        toast.success('Job posting updated');
      } else {
        await addDoc(collection(db, 'careers_jobs'), {
          ...payload,
          created_at: new Date().toISOString(),
          created_by: user?.email || 'unknown',
        });
        await logActivity('Job Posting Created', `Created: ${title}`, 'careers');
        toast.success('Job posting created');
      }
      setEditing(null);
    } catch (err) {
      console.error('Error saving job posting:', err);
      toast.error('Failed to save job posting');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (job: JobPosting) => {
    if (!job.id) return;
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'careers_jobs', job.id));
      await logActivity('Job Posting Deleted', `Deleted: ${job.title}`, 'careers');
      toast.success('Job posting deleted');
    } catch (err) {
      console.error('Error deleting job posting:', err);
      toast.error('Failed to delete job posting');
    }
  };

  const setStatus = async (job: JobPosting, status: JobStatus) => {
    if (!job.id) return;
    try {
      await updateDoc(doc(db, 'careers_jobs', job.id), { status, updated_at: new Date().toISOString() });
      toast.success(`Marked as ${status}`);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const fmtSalary = (job: JobPosting) => {
    if (job.salary_min == null && job.salary_max == null) return '—';
    const parts: string[] = [];
    if (job.salary_min != null) parts.push(`฿${job.salary_min.toLocaleString()}`);
    if (job.salary_max != null) parts.push(`฿${job.salary_max.toLocaleString()}`);
    const range = parts.length === 2 ? parts.join(' – ') : parts[0] || '';
    return [range, job.salary_note].filter(Boolean).join(' ');
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase size={22} /> Job Postings
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Create and manage job listings for the careers page.</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-semibold"
          >
            <Plus size={16} /> New Job
          </button>
        )}
      </div>

      {editing && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Edit Job Posting' : 'New Job Posting'}</h2>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={LBL_CLS}>Job Title</label>
              <input
                className={INPUT_CLS}
                value={editing.title}
                onChange={e => setEditing({ ...editing, title: e.target.value })}
                placeholder="Bar Supervisor"
              />
            </div>
            <div>
              <label className={LBL_CLS}>Department</label>
              <input
                className={INPUT_CLS}
                value={editing.department}
                onChange={e => setEditing({ ...editing, department: e.target.value })}
                placeholder="Bar, Kitchen, Front of House, Management..."
              />
            </div>
            <div>
              <label className={LBL_CLS}>Location</label>
              <input
                className={INPUT_CLS}
                value={editing.location}
                onChange={e => setEditing({ ...editing, location: e.target.value })}
                placeholder="Jomtien, Thailand"
              />
            </div>
            <div>
              <label className={LBL_CLS}>Employment Type</label>
              <select
                className={INPUT_CLS}
                value={editing.employment_type}
                onChange={e => setEditing({ ...editing, employment_type: e.target.value as EmploymentType })}
              >
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={LBL_CLS}>Salary Min (฿, optional)</label>
              <input
                type="number"
                className={INPUT_CLS}
                value={editing.salary_min ?? ''}
                onChange={e => setEditing({ ...editing, salary_min: e.target.value === '' ? null : parseFloat(e.target.value) })}
                placeholder="15000"
              />
            </div>
            <div>
              <label className={LBL_CLS}>Salary Max (฿, optional)</label>
              <input
                type="number"
                className={INPUT_CLS}
                value={editing.salary_max ?? ''}
                onChange={e => setEditing({ ...editing, salary_max: e.target.value === '' ? null : parseFloat(e.target.value) })}
                placeholder="20000"
              />
            </div>
            <div>
              <label className={LBL_CLS}>Salary Note</label>
              <input
                className={INPUT_CLS}
                value={editing.salary_note}
                onChange={e => setEditing({ ...editing, salary_note: e.target.value })}
                placeholder="THB/month, + tips, Negotiable..."
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={LBL_CLS}>Description</label>
            <RichTextEditor
              value={editing.description}
              onChange={html => setEditing({ ...editing, description: html })}
            />
          </div>

          <div className="mb-4">
            <label className={LBL_CLS}>Requirements (one per line)</label>
            <textarea
              className={INPUT_CLS}
              rows={5}
              value={editing.requirements}
              onChange={e => setEditing({ ...editing, requirements: e.target.value })}
              placeholder={'2+ years bar experience\nFluent English\nCan work weekends'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className={LBL_CLS}>Status</label>
              <select
                className={INPUT_CLS}
                value={editing.status}
                onChange={e => setEditing({ ...editing, status: e.target.value as JobStatus })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-md text-sm font-semibold"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Job Posting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading job postings...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center">
          <p className="text-gray-500 text-sm">No job postings yet. Click "New Job" to add the first one.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Title</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Department</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Salary</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-center font-semibold px-4 py-3">Applicants</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{job.title}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{job.department}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{fmtSalary(job)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={job.status}
                      onChange={e => setStatus(job, e.target.value as JobStatus)}
                      className={'text-xs font-semibold rounded px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 ' + STATUS_STYLES[job.status]}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} /> {job.id != null && appCounts[job.id] != null ? appCounts[job.id] : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(job)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => remove(job)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
