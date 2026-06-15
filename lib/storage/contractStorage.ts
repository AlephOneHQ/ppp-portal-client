// Contract localStorage storage utility for drafts
interface ContractDraft {
  id: string
  proposalId: string
  projectId: string
  partnerId: string
  commencementDate?: string
  endDate?: string
  scopeOfService?: string
  performanceStandards?: string
  oyntcdaRole?: string
  partnerRole?: string
  projectCost?: string
  capitalStructure?: string
  keyPerformanceIndicators?: string
  serviceLevelAgreement?: string
  monitoringReporting?: string
  disputeResolution?: string
  terminationClause?: string
  miscellaneous?: string
  adminSignature?: string
  partnerSignature?: string
  status: "draft"
  createdAt: string
  updatedAt: string
}

const CONTRACTS_STORAGE_KEY = "saved-contracts"

export const contractStorage = {
  // Save contract draft
  saveDraft: (draft: ContractDraft): void => {
    try {
      const existingDrafts = contractStorage.getDrafts()
      const existingIndex = existingDrafts.findIndex((d) => d.id === draft.id)

      if (existingIndex >= 0) {
        existingDrafts[existingIndex] = draft
      } else {
        existingDrafts.push(draft)
      }

      localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(existingDrafts))
    } catch (error) {
      console.error("Error saving contract draft:", error)
      throw error
    }
  },

  // Get all contract drafts
  getDrafts: (proposalId?: string): ContractDraft[] => {
    try {
      const stored = localStorage.getItem(CONTRACTS_STORAGE_KEY)
      const allDrafts = stored ? JSON.parse(stored) : []
      return proposalId ? allDrafts.filter((d: ContractDraft) => d.proposalId === proposalId) : allDrafts
    } catch (error) {
      console.error("Error reading contract drafts:", error)
      return []
    }
  },

  // Get specific draft
  getDraft: (id: string): ContractDraft | null => {
    const drafts = contractStorage.getDrafts()
    return drafts.find((d) => d.id === id) || null
  },

  // Delete draft
  deleteDraft: (id: string): void => {
    try {
      const drafts = contractStorage.getDrafts()
      const filtered = drafts.filter((d) => d.id !== id)
      localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error("Error deleting contract draft:", error)
      throw error
    }
  },
}

export type { ContractDraft }
