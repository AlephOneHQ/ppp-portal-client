// types/project.ts

import { UUID } from "crypto";

export interface GalleryImage {
  id: string;
  file_url: string;
  file_name: string;
  order?: number;
}

export interface AuthorizingSector {
  id: string;
  name: string;
}

export interface CreatedBy {
  id: string;
  email: string;
}

export interface Project {
  id: string;
  title: string;
  executive_summary: string;
  description: string;
  authorizing_sector: AuthorizingSector;
  estimated_cost: string;
  proposed_start_date: string;
  estimated_completion_date: string;
  submission_requirements: string;
  eoi_start_date: string;
  eoi_end_date: string;
  // submission_fee: string;
  laws_and_regulations: string;
  status: 'draft' | 'published' | 'contracted' | 'monitoring' | 'closed_out' | 'overdue' | 'archived';
  created_by: CreatedBy;
  contracted_to: string;
  gallery_images: GalleryImage[];
  created_at: string;
  updated_at: string;
  contract?: {
    id: string
    partner: {
      id: string
      business_name: string
    }
  }
}

export interface CreateProjectData {
  title: string;
  executive_summary: string;
  description: string;
  authorizing_sector_id?: UUID;
  authorizing_sector_name?: string;
  estimated_cost: string;
  proposed_start_date: string;
  estimated_completion_date: string;
  submission_requirements: string;
  eoi_start_date: string;
  eoi_end_date: string;
  submission_fee?: string;
  laws_and_regulations: string;
  status?: 'draft' | 'published';
  gallery_images?: Array<{
    file_url: string;
    file_name: string;
  }>;
}

export interface ProjectListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Project[];
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  sort_by?: string;
  limit?: number;
  offset?: number;
}