import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { settingsAPI } from "./settings"
import { AxiosError } from "axios"

export interface DigitalSignature {
  id: string
  signer_uuid: string
  signature_image_url: string
  certified_timestamp: string
  document_hash_at_signing: string
  signature_hash: string
  is_verified: boolean
  signer_name: string
  signer_email: string
  signer_type: string
}

export interface SignatureRequest {
  id: string
  signer_type: string
  signer_type_display: string
  signer_name: string
  signer_email: string
  signer_designation: string
  status: string
  status_display: string
  is_required: boolean
  signing_order: number
  signature_page: number
  signature_x: number
  signature_y: number
  signature_width: number
  signature_height: number
  signing_token: string
  invited_at?: string
  viewed_at?: string
  signed_at?: string
  token_expires_at: string
  digital_signature?: DigitalSignature
  document?: SignableDocument
}

export interface SignableDocument {
  id: string
  pdf_url: string
  signed_pdf_url?: string
  document_hash: string
  status: string
  verification_code: string
  qr_code_url?: string
  expires_at: string
  completed_at?: string
  contract_title: string
  project_title: string
  partner_name: string
  content?: string
  contract_content?: string
  signature_requests: SignatureRequest[]
  created_at: string
  updated_at: string
  contract?: {
    id: string
    title: string
    reference_number?: string
    commences_on: string
    ends_on: string
    estimated_project_cost: number
    scope_of_service: string
    oyntcda_roles: string
    partner_responsibilities: string
    capital_structure: string
    payment_mechanism: string
    revenue_sharing?: string
    kpis: string
    slas: string
    monitoring_and_reporting: string
    dispute_resolution: string
    termination_and_exit_clauses: string
    miscellaneous?: string
    milestones: Array<{
      description: string
      due_date: string
    }>
  }
}

export interface AuditTrailEntry {
  id: string
  action_type: string
  action_type_display: string
  action_description: string
  actor_name: string
  actor_email: string
  actor_type: string
  timestamp: string
  ip_address?: string
  signer_name?: string
  metadata: Record<string, unknown> // Changed from 'any' to 'unknown'
}

export interface InviteWitnessRequest {
  witness_name: string
  witness_email: string
  witness_designation?: string
  witness_type: "admin_witness" | "partner_witness"
  signature_page?: number
  signature_x?: number
  signature_y?: number
}

export interface AddSignatureRequest {
  signature_image_url: string
  signature_data_url?: string
}

export interface VerificationResult {
  document_id: string
  contract_title: string
  document_hash: string
  status: string
  created_at: string
  completed_at?: string
  signatures: Array<{
    signer_name: string
    signer_email: string
    signer_type: string
    signer_uuid: string
    signed_at: string
    signature_hash: string
    is_verified: boolean
  }>
  is_valid: boolean
}

export type SignableDocumentResponse = ApiResponse<SignableDocument>
export type SignatureRequestResponse = ApiResponse<SignatureRequest>
export type DigitalSignatureResponse = ApiResponse<DigitalSignature>
export type AuditTrailResponse = ApiResponse<AuditTrailEntry[]>
export type VerificationResponse = ApiResponse<VerificationResult>

// Helper function to extract error message from AxiosError
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "An unknown error occurred"
}

export const digitalSignaturesAPI = {
  // Get list of admin users for witness invitation (uses existing settings API)
  async getAdminUsers(): Promise<ApiResponse<Array<{
    id: string
    email: string
    full_name: string
    designation: string
  }>>> {
    try {
      const response = await settingsAPI.listAdmins()
      if (!response.success || !response.data) {
        return { success: false, message: response.message || "Failed to fetch admins" }
      }

      const admins = response.data.map((admin) => ({
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name || admin.email.split('@')[0],
        designation: admin.designation || '',
      }))
      return { success: true, data: admins }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  },

  // Get signable document for a contract
  async getSignableDocument(contractId: string): Promise<SignableDocumentResponse> {
    try {
      const response = await api.get(`/digital-signatures/contracts/${contractId}/signable-document/`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  },

  // Invite a witness to sign
  async inviteWitness(
    contractId: string,
    data: InviteWitnessRequest
  ): Promise<SignatureRequestResponse> {
    try {
      const response = await api.post(`/digital-signatures/contracts/${contractId}/invite-witness/`, data)
      return { success: true, data: response.data }
    } catch (error) {
      throw error // Keep throwing if that's the desired behavior
    }
  },

  // Get signature request details by token (public)
  async getSignatureRequestByToken(token: string): Promise<SignatureRequestResponse> {
    try {
      const response = await api.get(`/digital-signatures/sign/${token}/`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  },

  // Complete signature (public)
  async completeSignature(
    token: string,
    data: AddSignatureRequest
  ): Promise<DigitalSignatureResponse> {
    try {
      const response = await api.post(`/digital-signatures/sign/${token}/complete/`, data)
      return { success: true, data: response.data }
    } catch (error) {
      throw error // Keep throwing if that's the desired behavior
    }
  },

  // Get audit trail
  async getAuditTrail(contractId: string): Promise<AuditTrailResponse> {
    try {
      const response = await api.get(`/digital-signatures/contracts/${contractId}/audit-trail/`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  },

  // Verify signatures using verification code
  async verifySignatures(verificationCode: string): Promise<VerificationResponse> {
    try {
      const response = await api.get(`/digital-signatures/verify/${verificationCode}/`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  },

  // Download signed PDF
  async getSignedPdf(contractId: string): Promise<ApiResponse<{
    signed_pdf_url: string
    document_hash: string
    verification_code: string
  }>> {
    try {
      const response = await api.get(`/digital-signatures/contracts/${contractId}/signed-pdf/`)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  },
}