/**
 * Integration helper for transitioning from old contract signing to new digital signature system
 */

import { contractsAPI } from "./contracts"
import { digitalSignaturesAPI } from "./digital-signatures"

export interface ContractSigningSetup {
  contractId: string
  signableDocumentId: string
  pdfUrl: string
  adminSignatureRequestId: string
  partnerSignatureRequestId: string
}

/**
 * After admin generates a contract, this function sets up the digital signing workflow
 */
export async function setupContractForSigning(
  contractId: string,
  pdfUrl: string,
  pdfContent: Blob
): Promise<ContractSigningSetup> {

  return {
    contractId,
    signableDocumentId: "", // Backend returns this
    pdfUrl,
    adminSignatureRequestId: "",
    partnerSignatureRequestId: "",
  }
}

/**
 * Check if a contract has a signable document ready
 */
export async function hasSignableDocument(contractId: string): Promise<boolean> {
  try {
    const response = await digitalSignaturesAPI.getSignableDocument(contractId)
    return !!response.data
  } catch (error) {
    return false
  }
}

/**
 * Get the appropriate signing URL for a contract
 */
export function getContractSigningUrl(contractId: string): string {
  return `/contracts/${contractId}/sign`
}

/**
 * Get the witness signing URL (public, no auth required)
 */
export function getWitnessSigningUrl(token: string): string {
  return `/contracts/sign-document/${token}`
}
