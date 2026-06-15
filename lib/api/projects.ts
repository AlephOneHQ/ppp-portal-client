import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import type {
  Project,
  ProjectFilters,
  ProjectListResponse,
  GalleryImage,
  CreateProjectData,
  AuthorizingSector,
} from "@/types/projects"
import { AxiosError } from "axios"
import { extractErrorMessage } from "./errorUtils"

// EOI types that match your structure
export interface KeyPersonnel {
  name: string
  role: string
}

export interface ConsortiumMember {
  member_name: string
  role: string
  country_of_incorporation: string
  registration_number: string
}

export interface EOI {
  id: string
  reference_id: string
  project_id: string
  project: {
    id: string
    title: string
    executive_summary: string
    estimated_cost: string
    proposed_start_date: string
    estimated_completion_date: string
    eoi_start_date: string
    eoi_end_date: string
    submission_fee: string
  }
  project_title: string
  partner_name?: string
  submitter: string
  company_name?: string
  company_bio: string
  interest_letter_url: string
  key_personnel: KeyPersonnel[]
  experience: string
  portfolio_link?: string
  portfolio_file_url?: string
  client_reference_url: string
  project_plan: string
  consortium_members?: ConsortiumMember[]
  consortium_agreement_url?: string
  bank_statement_url?: string
  proof_of_funds_url?: string
  miscellaneous?: string
  status: "draft" | "submitted" | "withdrawn" | "approved" | "rejected" | "processing"
  payment_status: "pending" | "paid" | "failed" | "refunded" | "unpaid" | "processing" | "unknown"
  created_at: string
  updated_at: string
}

export interface EOISubmissionData {
  project_id: string
  company_bio: string
  submission_fee: string
  interest_letter_url: string
  key_personnel: KeyPersonnel[]
  experience: string
  portfolio_link?: string
  portfolio_file_url?: string
  client_reference_url: string
  project_plan: string
  consortium_members?: ConsortiumMember[]
  consortium_agreement_url?: string
  bank_statement_url?: string
  proof_of_funds_url?: string
  miscellaneous?: string
  action: "save" | "submit"
  status: string
}

export interface EOIResubmitData {
  company_bio: string
  interest_letter_url: string
  key_personnel: KeyPersonnel[]
  experience: string
  portfolio_link?: string
  portfolio_file_url?: string
  client_reference_url: string
  project_plan: string
  consortium_members?: ConsortiumMember[]
  consortium_agreement_url?: string
  bank_statement_url?: string
  proof_of_funds_url?: string
  miscellaneous?: string
}

export interface EOIFilters {
  search?: string
  status?: string | string[]
  payment_status?: string | string[]
  ordering?: string
  limit?: number
  offset?: number
  submitted_after?: string
  submitted_before?: string
}

export interface EOIListResponse {
  count: number
  next: string | null
  previous: string | null
  results: EOI[]
}

interface ProjectErrorResponse {
  message?: string
}

const handleProjectError = (error: unknown): { message: string; errors?: Record<string, string> } => {
  if (error instanceof AxiosError) {
    return {
      message: extractErrorMessage(error, "Project operation failed"),
      errors: error.response?.data?.extra?.fields,
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: "An unexpected error occurred" }
}

// Project API functions
export const projectAPI = {
  // Create project
  create: async (projectData: CreateProjectData): Promise<ApiResponse<Project>> => {
    try {
      const response = await api.post("/projects/", projectData)
      return {
        success: true,
        data: response.data,
        message: "Project created successfully",
      }
    } catch (error: unknown) {
      console.error("[v0] Project creation error:", error)
      const { message, errors } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to create project",
        errors,
      }
    }
  },

  // List projects
  list: async (filters: ProjectFilters = {}): Promise<ApiResponse<ProjectListResponse>> => {
    try {
      const response = await api.get("/projects/", { params: filters })
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to fetch projects",
      }
    }
  },

  available: async (filters: ProjectFilters = {}): Promise<ApiResponse<ProjectListResponse>> => {
    try {
      const response = await api.get("/projects/available", { params: filters })
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to fetch projects",
      }
    }
  },

  // Get project details
  get: async (projectId: string): Promise<ApiResponse<Project>> => {
    try {
      const response = await api.get(`/projects/${projectId}/`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to fetch project details",
      }
    }
  },

  // Update project
  // update: async (projectId: string, projectData: Partial<CreateProjectData>): Promise<ApiResponse<Project>> => {
  //   try {
  //     const response = await api.put(`/projects/${projectId}/`, projectData)
  //     return {
  //       success: true,
  //       data: response.data,
  //       message: "Project updated successfully",
  //     }
  //   } catch (error: unknown) {
  //     const { message, errors } = handleProjectError(error);
  //     return {
  //       success: false,
  //       message: message || "Failed to update project",
  //       errors,
  //     }
  //   }
  // },

  // Partial update project
  partialUpdate: async (projectId: string, projectData: Partial<CreateProjectData>): Promise<ApiResponse<Project>> => {
    try {
      const response = await api.patch(`/projects/${projectId}/`, projectData)
      return {
        success: true,
        data: response.data,
        message: "Project updated successfully",
      }
    } catch (error: unknown) {
      const { message, errors } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to update project",
        errors,
      }
    }
  },

  // Delete project
  delete: async (projectId: string): Promise<ApiResponse<void>> => {
    try {
      await api.delete(`/projects/${projectId}/`)
      return {
        success: true,
        message: "Project deleted successfully",
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to delete project",
      }
    }
  },

  // Upload gallery images
  uploadImages: async (projectId: string, images: File[]): Promise<ApiResponse<{ images: GalleryImage[] }>> => {
    try {
      const formData = new FormData()
      images.forEach((image) => {
        formData.append("gallery_images", image)
      })

      const response = await api.post(`/projects/${projectId}/upload-images/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      return {
        success: true,
        data: response.data,
        message: "Images uploaded successfully",
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to upload images",
      }
    }
  },

  // Delete gallery image
  deleteImage: async (projectId: string, imageId: string): Promise<ApiResponse<void>> => {
    try {
      await api.delete(`/projects/${projectId}/images/${imageId}/`)
      return {
        success: true,
        message: "Image deleted successfully",
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to delete image",
      }
    }
  },

  getAuthorizingSectors: async (): Promise<ApiResponse<AuthorizingSector[]>> => {
    try {
      const response = await api.get("/sectors/")
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to fetch authorizing sectors",
      }
    }
  },

  // Archive project
  archive: async (projectId: string): Promise<ApiResponse<Project>> => {
    try {
      const response = await api.post(`/projects/${projectId}/archive/`)
      return {
        success: true,
        data: response.data,
        message: "Project archived successfully",
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to archive project",
      }
    }
  },

  // Unarchive project
  unarchive: async (projectId: string): Promise<ApiResponse<Project>> => {
    try {
      const response = await api.post(`/projects/${projectId}/unarchive/`)
      return {
        success: true,
        data: response.data,
        message: "Project unarchived successfully",
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to unarchive project",
      }
    }
  },

  closeOut: async (projectId: string): Promise<ApiResponse<Project>> => {
    try {
      const response = await api.post(`/projects/${projectId}/closeout/`)
      return {
        success: true,
        data: response.data,
        message: "Project closed successfully",
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to close project",
      }
    }
  },
}

// EOI API functions
export const eoiAPI = {
  // Submit or save EOI
  submit: async (eoiData: EOISubmissionData): Promise<ApiResponse<EOI>> => {
    try {
      const response = await api.post("/projects/eoi/", eoiData)
      const message = eoiData.action === "save" ? "EOI saved as draft successfully" : "EOI submitted successfully"

      return {
        success: true,
        data: response.data,
        message,
      }
    } catch (error: unknown) {
      console.error("[v0] EOI submit error:", error)
      const { message, errors } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to submit EOI",
        errors,
      }
    }
  },

  list: async (filters: EOIFilters & { project_id?: string } = {}): Promise<ApiResponse<EOIListResponse>> => {
    try {
      const response = await api.get("/projects/eois/", { params: filters })
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to fetch EOIs",
      }
    }
  },

  // Get EOI details - role-based access control handled by server
  get: async (eoiId: string): Promise<ApiResponse<EOI>> => {
    try {
      const response = await api.get(`/projects/eois/${eoiId}/`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to fetch EOI details",
      }
    }
  },

  updateStatus: async (
    eoiId: string,
    status: "withdrawn" | "processing" | "approved" | "rejected",
  ): Promise<ApiResponse<EOI>> => {
    try {
      const response = await api.patch(`/projects/eois/${eoiId}/`, { status })
      return {
        success: true,
        data: response.data,
        message: "EOI status updated successfully",
      }
    } catch (error: unknown) {
      console.error("[v0] EOI status update error:", error)
      const { message, errors } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to update EOI status",
        errors,
      }
    }
  },

  // Resubmit rejected EOI
  resubmit: async (eoiId: string, eoiData: EOIResubmitData): Promise<ApiResponse<EOI>> => {
    try {
      const response = await api.post(`/projects/eois/${eoiId}/resubmit/`, eoiData)
      return {
        success: true,
        data: response.data,
        message: "EOI resubmitted successfully",
      }
    } catch (error: unknown) {
      console.error("[v0] EOI resubmit error:", error)
      const { message, errors } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to resubmit EOI",
        errors,
      }
    }
  },

  // Update payment status of EOI
  updatePaymentStatus: async (
    eoiId: string,
    paymentStatus: "unpaid" | "processing" | "paid" | "failed",
  ): Promise<ApiResponse<EOI>> => {
    try {
      const response = await api.patch(`/projects/eois/${eoiId}/`, {
        payment_status: paymentStatus,
      })

      return {
        success: true,
        data: response.data,
        message: "Payment status updated successfully",
      }
    } catch (error: unknown) {
      console.error("❌ PATCH Request failed:")

      if (error instanceof AxiosError) {
        console.error("Axios Error Details:", {
          url: error.config?.url,
          method: error.config?.method,
          payload: error.config?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          message: error.message,
        })
      } else {
        console.error("Non-Axios Error:", error)
      }

      const { message, errors } = handleProjectError(error)
      return {
        success: false,
        message: message || "Failed to update payment status",
        errors,
      }
    }
  },
}

export default {
  projectAPI,
  eoiAPI,
}
