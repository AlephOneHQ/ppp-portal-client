import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { AxiosError } from 'axios'
import { extractErrorMessage } from "./errorUtils"

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
  project_title?: string
  company_bio: string
  interest_letter_url: string
  key_personnel: KeyPersonnel[]
  experience: string
  portfolio_link?: string
  portfolio_file_url?: string
  client_reference_url: string
  project_plan: string
  consortium_members: ConsortiumMember[]
  consortium_agreement_url?: string
  bank_statement_url: string
  proof_of_funds_url: string
  miscellaneous?: string
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "withdrawn"
  payment_status: "unpaid" | "processing" | "paid" | "pending"
  submitted_at?: string
  created_at: string
  updated_at: string
}

export interface EOISubmissionData {
  project_id: string
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
  payment_status: "unpaid" | "processing" | "paid" | "pending"
  action: "draft" | "submit"
}

export interface EOIResubmissionData extends Omit<EOISubmissionData, 'project_id' | 'action'> {
  // You can make specific fields optional or required for resubmission
  status: "submitted"
}

export interface EOIFilters {
  search?: string
  status?: string | string[]
  payment_status?: string | string[]
  ordering?: string
  limit?: number
  offset?: number
  project_id?: string
}

export interface EOIListResponse {
  count: number
  next: string | null
  previous: string | null
  results: EOI[]
}

const handleEOIError = (error: unknown): { message: string; errors?: Record<string, string> } => {
  if (error instanceof AxiosError) {
    const fields = error.response?.data?.extra?.fields as Record<string, string[]> | undefined
    const fieldErrors: Record<string, string> = {}
    if (fields) {
      Object.entries(fields).forEach(([field, messages]) => {
        if (messages?.length > 0) {
          const camel = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
          fieldErrors[camel] = messages[0]
        }
      })
    }
    return {
      message: extractErrorMessage(error, "EOI operation failed"),
      errors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    }
  }
  if (error instanceof Error) return { message: error.message }
  return { message: "An unexpected error occurred" }
}


export const eoiAPI = {
  // Submit or save EOI
  submit: async (eoiData: EOISubmissionData): Promise<ApiResponse<{ id: string; status: string }>> => {
    try {
      const response = await api.post("/projects/eoi/", eoiData)
      const message = eoiData.action === "draft" ? "EOI saved as draft successfully" : "EOI submitted successfully"

      return {
        success: true,
        data: response.data,
        message,
      }
    } catch (error: unknown) {
      const { message, errors } = handleEOIError(error);
      return {
        success: false,
        message: message || "Failed to submit EOI",
        errors,
      }
    }
  },

  // List EOIs
  list: async (filters: EOIFilters = {}): Promise<ApiResponse<EOIListResponse>> => {
    try {
      const response = await api.get("/projects/eois/", { params: filters })
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleEOIError(error);
      return {
        success: false,
        message: message || "Failed to fetch EOIs",
      }
    }
  },

  // Get EOI details
  get: async (eoiId: string): Promise<ApiResponse<EOI>> => {
    try {
      const response = await api.get(`/projects/eois/${eoiId}/`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleEOIError(error);
      return {
        success: false,
        message: message || "Failed to fetch EOI details",
      }
    }
  },

  update: async (eoiId: string, eoiData: Partial<EOISubmissionData>): Promise<ApiResponse<EOI>> => {
    try {
      const response = await api.patch(`/projects/eois/${eoiId}/`, eoiData)
      return {
        success: true,
        data: response.data,
        message: "EOI updated successfully",
      }
    } catch (error: unknown) {
      const { message, errors } = handleEOIError(error);
      return {
        success: false,
        message: message || "Failed to update EOI",
        errors,
      }
    }
  },

  // Fixed resubmit function with proper typing
  resubmit: async (eoiId: string, resubmitData: Partial<EOIResubmissionData>): Promise<ApiResponse<EOI>> => {
    try {
      // Use PATCH to update the existing rejected EOI instead of creating a new one
      const response = await api.patch(`/projects/eois/${eoiId}/resubmit`, {
        ...resubmitData,
        status: "submitted",
        updated_at: new Date().toISOString(),
      });
      return {
        success: true,
        data: response.data,
        message: "EOI resubmitted successfully"
      };
    } catch (error: unknown) {
      const { message, errors } = handleEOIError(error);
      return {
        success: false,
        message: message || "Failed to resubmit EOI",
        errors,
      };
    }
  },

  // Delete EOI
  delete: async (eoiId: string): Promise<ApiResponse<void>> => {
    try {
      await api.delete(`/projects/eois/${eoiId}/`)
      return {
        success: true,
        message: "EOI deleted successfully",
      }
    } catch (error: unknown) {
      const { message } = handleEOIError(error);
      return {
        success: false,
        message: message || "Failed to delete EOI",
      }
    }
  },
}

export default eoiAPI