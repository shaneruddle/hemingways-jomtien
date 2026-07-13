export type JobStatus = 'draft' | 'published' | 'closed';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'casual'
  | 'seasonal'
  | 'contract'
  | 'internship';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  casual: 'Casual',
  seasonal: 'Seasonal',
  contract: 'Contract',
  internship: 'Internship',
};

export interface JobPosting {
  id?: string;
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  description: string; // rich text HTML
  requirements: string; // plain text, one requirement per line
  salary_min: number | null;
  salary_max: number | null;
  salary_note: string; // e.g. "THB/month", "+ tips", "Negotiable"
  status: JobStatus;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export type ApplicationStatus = 'new' | 'reviewed' | 'interviewing' | 'rejected' | 'hired';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
  hired: 'Hired',
};

export interface JobApplication {
  id?: string;
  job_id: string;
  job_title: string; // denormalized for display without a join
  applicant_name: string;
  email: string;
  phone: string;
  resume_url: string;
  cover_note: string;
  status: ApplicationStatus;
  applied_at: string;
  notes: string; // internal admin notes
}
