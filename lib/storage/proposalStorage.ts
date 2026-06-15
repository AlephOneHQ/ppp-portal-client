// Proposal localStorage storage utility
interface ProposalDraft {
  id: string
  eoiId: string
  summary: string
  implementationPlan: string
  document: File | string | null
  status: "draft"
  createdAt: string
  updatedAt: string
}

const PROPOSALS_STORAGE_KEY = "saved-proposals"

export const proposalStorage = {
  // Save proposal draft
  saveDraft: (draft: ProposalDraft): void => {
    try {
      const existingDrafts = proposalStorage.getDrafts()
      const existingIndex = existingDrafts.findIndex((d) => d.id === draft.id)

      if (existingIndex >= 0) {
        existingDrafts[existingIndex] = draft
      } else {
        existingDrafts.push(draft)
      }

      localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(existingDrafts))
    } catch (error) {
      console.error("Error saving proposal draft:", error)
      throw error
    }
  },

  // Get all proposal drafts
  getDrafts: (eoiId?: string): ProposalDraft[] => {
    try {
      const stored = localStorage.getItem(PROPOSALS_STORAGE_KEY)
      const allDrafts = stored ? JSON.parse(stored) : []
      return eoiId ? allDrafts.filter((d: ProposalDraft) => d.eoiId === eoiId) : allDrafts
    } catch (error) {
      console.error("Error reading proposal drafts:", error)
      return []
    }
  },

  // Get specific draft
  getDraft: (id: string): ProposalDraft | null => {
    const drafts = proposalStorage.getDrafts()
    return drafts.find((d) => d.id === id) || null
  },

  // Delete draft
  deleteDraft: (id: string): void => {
    try {
      const drafts = proposalStorage.getDrafts()
      const filtered = drafts.filter((d) => d.id !== id)
      localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error("Error deleting proposal draft:", error)
      throw error
    }
  },

  // Convert file to base64
  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  },

  // Convert base64 to file
  base64ToFile: (base64: string, filename: string, type: string): File => {
    const arr = base64.split(",")
    const mime = type || arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }

    return new File([u8arr], filename, { type: mime })
  },
}

export type { ProposalDraft }
