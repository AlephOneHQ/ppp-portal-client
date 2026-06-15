import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import fileUploadAPI from "./fileUpload"
import { extractErrorMessage } from "./errorUtils"

export interface ContractMilestone {
  id: string
  description: string
  due_date: string
  created_at: string
  updated_at: string
  is_completed?: boolean
  completed_at?: string
}

export interface Contract {
  id: string
  title: string
  commences_on: string
  ends_on: string
  scope_of_service: string
  performance_standards: string
  oyntcda_roles: string
  partner_responsibilities: string
  estimated_project_cost: string
  capital_structure: string
  payment_mechanism: string
  revenue_sharing: string
  kpis: string
  slas: string
  monitoring_and_reporting: string
  dispute_resolution: string
  termination_and_exit_clauses: string
  miscellaneous: string
  status: string
  reference_number: string
  submission_date?: string
  partner_signature_url?: string
  admin_signature_url?: string
  partner_signed_at?: string
  admin_signed_at?: string
  all_signatures_complete?: boolean
  created_at: string
  updated_at: string
  milestones?: ContractMilestone[]
  project_title?: string
  partner_name?: string
  partner_contact_name?: string
  created_by_name?: string
  proposal_id?: string
  project_id?: string
  partner_id?: string
  signatories?: Signatory[];
  manually_signed_pdf_url?: string;
}

export interface PartnerContract extends Contract {
  contract_status: string
  project: {
    id: string
    title: string
    executive_summary: string
    description: string
    sector_name: string
    estimated_cost: string
    proposed_start_date: string
    estimated_completion_date: string
    status: string
  }
  created_by: {
    id: string
    email: string
    is_active: boolean
    groups: string[]
  }
  signatories?: Signatory[];
  manually_signed_pdf_url?: string;
}

export interface ContractCreateData {
  eoi_id: string
  title: string
  proposal_id: string
  partner_id: string
  project_id: string
  commences_on: string
  ends_on: string
  scope_of_service: string
  oyntcda_roles: string
  partner_responsibilities: string
  estimated_project_cost: string
  capital_structure: string
  payment_mechanism: string
  revenue_sharing: string
  kpis: string
  slas: string
  monitoring_and_reporting: string
  dispute_resolution: string
  termination_and_exit_clauses: string
  miscellaneous: string
  milestones?: { description: string; due_date: string }[]
  submissionDate?: string
}

export interface Signatory {
  id: string;
  full_name: string;
  designation: string;
  email: string;
  status: string;
  token_expires_at: string;
  signed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSignatory {
  id: string;
  admin: string;
  admin_email: string;
  status: string;
  token_expires_at: string;
  signed_at?: string;
  invited_at: string;
  created_at: string;
  updated_at: string;
  assigned_by: string;
  assigned_by_email: string;
}

export interface ManualPdfUploadRequest {
  pdf_url: string;
  file_name: string;
  file_size: number;
  uploaded_at?: string;
}

export interface PartnerSignatory {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export type ContractResponse = ApiResponse<Contract>
export type PartnerContractResponse = ApiResponse<PartnerContract>
export type ContractsListResponse = ApiResponse<{ results: Contract[]; count: number }>
export type PartnerContractsListResponse = ApiResponse<{ results: PartnerContract[]; count: number }>

export const contractsAPI = {
  // Check if a contract exists for a given project (server-side filter with client-side fallback)
  async getByProjectId(projectId: string): Promise<ContractResponse> {
    try {
      const response = await api.get<{ results: Contract[]; count: number }>(
        `/contracts/?project_id=${projectId}&limit=1`
      )
      const results = response.data?.results ?? []
      // Server filters by project_id, but also do client-side match as fallback
      const match = results.find((c: Contract) => c.project_id === projectId) ?? results[0] ?? null
      return {
        success: true,
        data: match ?? undefined,
        message: match ? "Contract found" : "No contract found",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error checking contract by project:", error)
      return { success: false, message: err.response?.data?.message || "Failed to check contract" }
    }
  },

  // Admin: List all contracts
  async list(params?: {
    search?: string
    ordering?: string
    limit?: number
    offset?: number
  }): Promise<ContractsListResponse> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.search) queryParams.append("search", params.search)
      if (params?.ordering) queryParams.append("ordering", params.ordering)
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.offset) queryParams.append("offset", params.offset.toString())

      const response = await api.get<{ results: Contract[]; count: number }>(
        `/contracts/?${queryParams.toString()}`
      )
      return {
        success: true,
        data: response.data,
        message: "Contracts fetched successfully",
      }
    } catch (error: unknown) {
      console.error("Error fetching contracts:", error)
      throw new Error(extractErrorMessage(error, "Failed to fetch contracts"))
    }
  },

  // Admin: Get contract details
  async get(contractId: string): Promise<ContractResponse> {
    try {
      const response = await api.get<Contract>(`/contracts/${contractId}/`)
      return {
        success: true,
        data: response.data,
        message: "Contract fetched successfully",
      }
    } catch (error: unknown) {
      console.error("Error fetching contract:", error)
      throw new Error(extractErrorMessage(error, "Failed to fetch contract"))
    }
  },

  // Admin: Create contract from approved EOI
  async create(data: ContractCreateData): Promise<ContractResponse> {
    try {
      const response = await api.post<Contract>("/contracts/", data)
      return {
        success: true,
        data: response.data,
        message: "Contract created successfully",
      }
    } catch (error: unknown) {
      console.error("Error creating contract:", error)
      throw new Error(extractErrorMessage(error, "Failed to create contract"))
    }
  },

  // Admin: Update contract
  async update(contractId: string, data: Partial<ContractCreateData>): Promise<ContractResponse> {
    try {
      const response = await api.patch<Contract>(`/contracts/${contractId}/`, data)
      return {
        success: true,
        data: response.data,
        message: "Contract updated successfully",
      }
    } catch (error: unknown) {
      console.error("Error updating contract:", error)
      throw new Error(extractErrorMessage(error, "Failed to update contract"))
    }
  },

  // Admin: Send contract to partner
  async send(contractId: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/${contractId}/send_contract/`)
      return {
        success: true,
        message: response.data.message || "Contract sent successfully",
      }
    } catch (error: unknown) {
      console.error("Error sending contract:", error)
      throw new Error(extractErrorMessage(error, "Failed to send contract"))
    }
  },

  // Admin: Sign contract
  async adminSign(contractId: string, signatureUrl: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/${contractId}/admin_sign/`, {
        signature_url: signatureUrl,
      })
      return {
        success: true,
        message: response.data.message || "Contract signed successfully",
      }
    } catch (error: unknown) {
      console.error("Error signing contract:", error)
      throw new Error(extractErrorMessage(error, "Failed to sign contract"))
    }
  },

  // Admin: Add milestone
  async addMilestone(contractId: string, milestone: { description: string; due_date: string }): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/${contractId}/add_milestone/`, milestone)
      return {
        success: true,
        data: response.data,
        message: "Milestone added successfully",
      }
    } catch (error: unknown) {
      console.error("Error adding milestone:", error)
      throw new Error(extractErrorMessage(error, "Failed to add milestone"))
    }
  },

  // Admin: Remove milestone
  async removeMilestone(contractId: string, milestoneId: string): Promise<ApiResponse> {
    try {
      await api.delete(`/contracts/${contractId}/remove_milestone/`, {
        data: { milestone_id: milestoneId },
      })
      return {
        success: true,
        message: "Milestone removed successfully",
      }
    } catch (error: unknown) {
      console.error("Error removing milestone:", error)
      throw new Error(extractErrorMessage(error, "Failed to remove milestone"))
    }
  },

  // Admin: Update milestone completion
  async updateMilestone(contractId: string, milestoneId: string, data: { is_completed?: boolean }): Promise<ApiResponse> {
    try {
      const response = await api.patch(`/contracts/${contractId}/milestones/${milestoneId}/`, data)
      return {
        success: true,
        data: response.data,
        message: "Milestone updated successfully",
      }
    } catch (error: unknown) {
      console.error("Error updating milestone:", error)
      throw new Error(extractErrorMessage(error, "Failed to update milestone"))
    }
  },

  // Partner: List partner's contracts
  async partnerList(params?: {
    search?: string
    ordering?: string
    limit?: number
    offset?: number
  }): Promise<PartnerContractsListResponse> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.search) queryParams.append("search", params.search)
      if (params?.ordering) queryParams.append("ordering", params.ordering)
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.offset) queryParams.append("offset", params.offset.toString())

      const response = await api.get<{ results: PartnerContract[]; count: number }>(
        `/contracts/?${queryParams.toString()}`
      )
      return {
        success: true,
        data: response.data,
        message: "Contracts fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching partner contracts:", error)
      throw new Error(err.response?.data?.message || "Failed to fetch contracts")
    }
  },

  // Partner: Get contract details
  async partnerGet(contractId: string): Promise<PartnerContractResponse> {
    try {
      const response = await api.get<PartnerContract>(`/contracts/partners/${contractId}/`)
      return {
        success: true,
        data: response.data,
        message: "Contract fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching contract:", error)
      throw new Error(err.response?.data?.message || "Failed to fetch contract")
    }
  },

  // Partner: Get contract details by proposal ID
  async partnerGetByProposal(proposalId: string): Promise<PartnerContractResponse> {
    try {
      const response = await api.get<PartnerContract>(`/contracts/${proposalId}/`)
      return {
        success: true,
        data: response.data,
        message: "Contract fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching contract:", error)
      throw new Error(err.response?.data?.message || "Failed to fetch contract")
    }
  },

  // Partner: Sign contract
  async partnerSign(contractId: string, signatureUrl: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/partners/${contractId}/sign/`, {
        signature_url: signatureUrl,
      })
      return {
        success: true,
        message: response.data.message || "Contract signed successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error signing contract:", error)
      throw new Error(err.response?.data?.message || "Failed to sign contract")
    }
  },

  // Partner: Send invite to additional signatory (UPDATED)
  async inviteAdditionalSignatory(
    contractId: string,
    signatoryData: {
      full_name: string;
      designation: string;
      email: string;
    }
  ): Promise<ApiResponse<Signatory>> {
    try {
      const response = await api.post<Signatory>(
        `/contracts/partners/${contractId}/invite/`,
        signatoryData
      )
      return {
        success: true,
        data: response.data,
        message: "Invitation sent successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error inviting additional signatory:", error)
      throw new Error(err.response?.data?.message || "Failed to send invitation")
    }
  },

  // Verify signing token (UPDATED)
  async verifySignToken(token: string): Promise<ApiResponse<{
    id: string;
    email: string;
    is_active: boolean;
    role: string;
    created_at: string;
  }>> {
    try {
      const response = await api.get(`/contracts/sign/${token}/`)
      return {
        success: true,
        data: response.data,
        message: "Token verified successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error verifying sign token:", error)
      throw new Error(err.response?.data?.message || "Failed to verify token")
    }
  },

  // Complete signing with token (UPDATED)
  async completeSignWithToken(
    token: string,
    signatureUrl: string
  ): Promise<ApiResponse<Signatory>> {
    try {
      const response = await api.post<Signatory>(
        `/contracts/sign/${token}/complete/`,
        { signature_url: signatureUrl }
      )
      return {
        success: true,
        data: response.data,
        message: "Signature submitted successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error completing contract signing:", error)
      throw new Error(err.response?.data?.message || "Failed to complete signing")
    }
  },

  // Get signatories for a contract (NEW - if needed for listing)
  async getContractSignatories(contractId: string): Promise<ApiResponse<{
    id: string;
    email: string;
    is_active: boolean;
    role: string;
    created_at: string;
  }>> {
    try {
      const response = await api.get(`/contracts/${contractId}/partner-signatories/`)
      return {
        success: true,
        data: response.data,
        message: "Signatories fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching contract signatories:", error)
      throw new Error(err.response?.data?.message || "Failed to fetch signatories")
    }
  },

  // Partner: Withdraw contract
  async partnerWithdraw(contractId: string, withdrawalReason?: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/partners/${contractId}/withdraw/`, {
        withdrawal_reason: withdrawalReason,
      })
      return {
        success: true,
        message: response.data.message || "Contract withdrawn successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error withdrawing contract:", error)
      throw new Error(err.response?.data?.message || "Failed to withdraw contract")
    }
  },

  async getContractPdf(contractId: string): Promise<Blob> {
    try {
      const response = await api.get(`/contracts/${contractId}/pdf/`, {
        responseType: "blob",
      })

      return response.data
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error downloading contract:", error)
      throw new Error(err.response?.data?.message || "Failed to download contract")
    }
  },

  async getContractPdf2(contractId: string): Promise<Blob> {
    try {
      const response = await api.get(`/contracts/${contractId}/pdf2/`, {
        responseType: "blob",
      })

      return response.data
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error downloading contract:", error)
      throw new Error(err.response?.data?.message || "Failed to download contract")
    }
  },

  //Admin: Get the current admin signatory assigned to this contract.
  async getAdminSignatory(contractId: string): Promise<ApiResponse<AdminSignatory | null>> {
    try {
      const response = await api.get<AdminSignatory | null>(`/contracts/${contractId}/admin-signatory/`)
      return {
        success: true,
        data: response.data,
        message: "Admin signatory fetched successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error fetching admin signatory:", error)
      throw new Error(err.response?.data?.message || "Failed to fetch admin signatory")
    }
  },

  //Admin: Assign an admin user to be the signatory for this contract. If an admin is already assigned, they will be replaced.
  async assignAdminSignatory(contractId: string, adminId: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/${contractId}/admin-signatory/`, {
        admin_id: adminId,
      })
      return {
        success: true,
        message: response.data.message || "Admin signatory assigned successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error assigning admin signatory:", error)
      throw new Error(err.response?.data?.message || "Failed to assign admin signatory")
    }
  },

  //Admin: Send or resend a signing invitation email to the assigned admin. Generates a new token valid for 3 hours.
  async sendAdminSignInvitation(contractId: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/${contractId}/admin-signatory/invitation/`)
      return {
        success: true,
        message: response.data.message || "Admin sign invitation sent successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error sending admin sign invitation:", error)
      throw new Error(err.response?.data?.message || "Failed to send admin sign invitation")
    }
  },

  //Admin: Verify the signing token and return contract details for the signing page. No authentication required - the token provides authentication.
  async verifyAdminSignToken(token: string): Promise<ApiResponse<{
    id: string;
    email: string;
    is_active: boolean;
    role: string;
    contract_id: string;
    contract_title: string;
    contract_summary: string;
    partner_name: string;
    created_at: string;
  }>> {
    try {
      const response = await api.get(`/contracts/admin-signing/${token}/`)
      return {
        success: true,
        data: response.data,
        message: "Admin sign token verified successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error verifying admin sign token:", error)
      throw new Error(err.response?.data?.message || "Failed to verify admin sign token")
    }
  },

  //Admin: Submit the admin signature to complete the signing process. Updates contract to MONITORING status and notifies all parties.
  async completeAdminSignWithToken(token: string, signatureUrl: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/contracts/admin-signing/${token}/`, {
        signature_url: signatureUrl,
      })
      return {
        success: true,
        message: response.data.message || "Admin signature submitted successfully",
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error("Error completing admin contract signing:", error)
      throw new Error(err.response?.data?.message || "Failed to complete admin signing")
    }
  },


}
