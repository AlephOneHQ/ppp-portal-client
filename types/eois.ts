export interface EOI {
  id: string;
  project_id: string;
  project_title?: string;
  applicant_name: string;
  applicant_email: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EOISubmissionData {
  project_id: string;
  applicant_name: string;
  applicant_email: string;
  answers: Record<string, any>;
  save_as_draft?: boolean;
}

export interface EOIFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
  project_id?: string;
}

export interface EOIListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EOI[];
}