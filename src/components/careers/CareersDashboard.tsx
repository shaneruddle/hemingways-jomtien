import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Briefcase, Users } from 'lucide-react';
import CareersJobs from './CareersJobs';
import CareersApplications from './CareersApplications';
import { JobPosting } from './types';

const TABS = [
  { id: 'jobs', label: 'Job Postings', icon: <Briefcase size={16} /> },
  { id: 'applications', label: 'Applications', icon: <Users size={16} /> },
];

export default function CareersDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<JobPosting[]>([]);

  // Shared job list (used by the Applications tab's job filter dropdown)
  useEffect(() => {
    const q = query(collection(db, 'careers_jobs'), orderBy('created_at', 'desc'));
    return onSnapshot(q, snap => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting)));
    }, err => console.warn('Careers jobs (for filter):', err.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 sticky top-0 z-10">
        <div className="flex gap-1 overflow-x-auto items-center">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'jobs' && <CareersJobs user={user} />}
        {activeTab === 'applications' && <CareersApplications jobs={jobs} />}
      </div>
    </div>
  );
}
