import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { extractErrorMessage } from "./errorUtils"

export interface ProposalMedia {
  id: string
  url: string
  media_type: "image" | "video"
  order: number
}

export interface Proposal {
  id: string
  eoi: {
    id: string
    reference_id: string
    status: string
  }
  company_name: string
  project_title: string
  project_id: string
  reference_id: string
  summary: string
  implementation_plan: string
  document_url?: string
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "withdrawn"
  submitted_at?: string
  created_at: string
  updated_at: string
  media?: ProposalMedia[]
  project: {
    id: string
    title: string
    executive_summary: string
    description: string
    estimated_cost: string
    proposed_start_date: string
    estimated_completion_date: string
    status: string
    authorizing_sector: {
      id: string
      name: string
    }
  }
}

export interface ProposalDetail extends Proposal {
  eoi: {
    id: string
    reference_id: string
    status: string
    company_name: string
    submitted_by_email: string
    company_bio: string
    experience: string
  }
  project: {
    id: string
    title: string
    executive_summary: string
    description: string
    estimated_cost: string
    proposed_start_date: string
    estimated_completion_date: string
    status: string
    authorizing_sector: {
      id: string
      name: string
    }
  }
}

export interface SubmitProposalData {
  eoi_id: string
  summary: string
  implementation_plan: string
  document_url?: string
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "withdrawn"
  media?: { url: string; media_type: "image" | "video"; order: number }[]
  action: "draft" | "submit"
}

export type ProposalResponse = ApiResponse<Proposal>
export type ProposalDetailResponse = ApiResponse<ProposalDetail>
export type ProposalsListResponse = ApiResponse<{ results: Proposal[]; count: number }>

export const proposalAPI = {
  // Partner: Create or submit proposal
  async create(proposalData: SubmitProposalData): Promise<ProposalResponse> {
    try {
      const response = await api.post<Proposal>("/projects/proposals/", proposalData)
      return {
        success: true,
        data: response.data,
        message: proposalData.action === "submit" ? "Proposal submitted successfully" : "Proposal draft saved successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error creating proposal:", error)
      throw new Error(extractErrorMessage(error, 'Failed to create proposal'))
    }
  },

  // Partner: Get proposal by ID
  async getById(proposalId: string): Promise<ProposalDetailResponse> {
    try {
      const response = await api.get<ProposalDetail>(`/projects/proposals/${proposalId}/`)
      return {
        success: true,
        data: response.data,
        message: "Proposal fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching proposal:", error)
      throw new Error(extractErrorMessage(error, 'Failed to fetch proposal'))
    }
  },

  // Partner: Update proposal
  async update(proposalId: string, updateData: Partial<SubmitProposalData>): Promise<ProposalResponse> {
    try {
      const response = await api.patch<Proposal>(`/projects/proposals/${proposalId}/`, updateData)
      return {
        success: true,
        data: response.data,
        message: "Proposal updated successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error updating proposal:", error)
      throw new Error(extractErrorMessage(error, 'Failed to update proposal'))
    }
  },

  //Partner: Withdraw proposal
  async withdraw(proposalId: string): Promise<ProposalDetailResponse> {
    try {
      const response = await api.post<ProposalDetail>(`/projects/proposals/${proposalId}/withdraw/`)
      return {
        success: true,
        data: response.data,
        message: "Proposal withdrawn successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error withdrawing proposal:", error)
      throw new Error(extractErrorMessage(error, 'Failed to withdraw proposal'))
    }
  },

  // Partner: Resubmit rejected proposal
  async resubmit(proposalId: string, updateData: Omit<SubmitProposalData, 'eoi_id'>): Promise<ProposalResponse> {
    try {
      const response = await api.post<Proposal>(`/projects/proposals/${proposalId}/resubmit/`, updateData)
      return {
        success: true,
        data: response.data,
        message: "Proposal resubmitted successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error resubmitting proposal:", error)
      throw new Error(extractErrorMessage(error, 'Failed to resubmit proposal'))
    }
  },

  // Partner: List proposals
  async list(params?: { limit?: number; offset?: number }): Promise<ProposalsListResponse> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.offset) queryParams.append("offset", params.offset.toString())

      const response = await api.get<{ results: Proposal[]; count: number }>(
        `/projects/proposals/?${queryParams.toString()}`
      )
      return {
        success: true,
        data: response.data,
        message: "Proposals fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching proposals:", error)
      throw new Error(extractErrorMessage(error, 'Failed to fetch proposals'))
    }
  },

  // Admin: List all proposals
  async adminList(params?: {
    search?: string
    status?: string
    ordering?: string
    limit?: number
    offset?: number
  }): Promise<ProposalsListResponse> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.search) queryParams.append("search", params.search)
      if (params?.status) queryParams.append("status", params.status)
      if (params?.ordering) queryParams.append("ordering", params.ordering)
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.offset) queryParams.append("offset", params.offset.toString())

      const response = await api.get<{ results: Proposal[]; count: number }>(
        `/projects/admin/proposals/?${queryParams.toString()}`
      )
      return {
        success: true,
        data: response.data,
        message: "Proposals fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching admin proposals:", error)
      throw new Error(extractErrorMessage(error, 'Failed to fetch proposals'))
    }
  },

  // Admin: Approve proposal
  async approve(proposalId: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/projects/admin/proposals/${proposalId}/action/approve/`)
      return {
        success: true,
        message: response.data.message || "Proposal approved successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error approving proposal:", error)
      throw new Error(extractErrorMessage(error, 'Failed to approve proposal'))
    }
  },

  // Admin: Reject proposal
  async reject(proposalId: string, reason?: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/projects/admin/proposals/${proposalId}/action/reject/`, {
        reason,
      })
      return {
        success: true,
        message: response.data.message || "Proposal rejected successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error rejecting proposal:", error)
      throw new Error(extractErrorMessage(error, 'Failed to reject proposal'))
    }
  },
  // Alternative approach if backend doesn't support eoi_id filter
async getByEOI(eoiId: string): Promise<ProposalsListResponse> {
  try {
    const response = await api.get<{ results: Proposal[]; count: number }>(
      `/projects/proposals/`
    )
    
    if (response.data && response.data.results) {
      const filteredProposals = response.data.results.filter(proposal => 
        proposal.eoi?.id === eoiId
      )
      
      return {
        success: true,
        data: {
          results: filteredProposals,
          count: filteredProposals.length
        },
        message: "Proposals fetched successfully",
      }
    }
    
    return {
      success: true,
      data: { results: [], count: 0 },
      message: "Proposals fetched successfully",
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    console.error("Error fetching proposals by EOI:", error)
    throw new Error(extractErrorMessage(error, 'Failed to fetch proposals'))
  }
},
}
