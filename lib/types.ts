// Shared types for the application

export interface Project {
  id: string
  title: string
  description: string
  sector: string
  budget: string
  timeline: string
  submission_fee: number
  created_by: string
  assigned_to: string
  status: "Draft" | "Published" | "Contracted"
  created_at?: string
  updated_at?: string
}

export interface EOISubmission {
  id: string
  project_id: string
  partner_id: string
  partner_name: string
  company_name: string
  bio?: string
  interest_letter_url?: string
  experience?: string
  portfolio_url?: string
  project_plan?: string
  payment_status: "unpaid" | "processing" | "paid"
  submission_status: "draft" | "submitted" | "approved" | "rejected" | "withdrawn"
  admin_notes?: string
  created_at?: string
  updated_at?: string
}

export interface KeyPersonnel {
  id?: number
  eoi_id: string
  name: string
  role: string
}

export interface ConsortiumMember {
  id?: number
  eoi_id: string
  member_name: string
  role: string
  country: string
  registration_number: string
}
