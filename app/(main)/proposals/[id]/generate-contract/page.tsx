"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, FileText, Wallet, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { SignatureInput } from "@/components/signature-input"
import { contractsAPI } from "@/lib/api/contracts"
import { proposalAPI, type ProposalDetail } from "@/lib/api/proposals"
import { toast } from "sonner"
import { getCurrentUser } from "@/lib/user"
import { TimelineFeed } from "@/components/feed-components"
import { useRouter } from 'next/navigation'
import { formatCurrencyInput, formatNumberWithCommas } from "@/lib/utils/formatting"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Add validation interface
interface ValidationErrors {
  scopeOfService?: string
  performanceStandards?: string
  oyntcdaRole?: string
  partnerRole?: string
  capitalStructure?: string
  paymentInstrument?: string
  revenueSharing?: string
  keyPerformanceIndicators?: string
  serviceLevelAgreement?: string
  monitoringReporting?: string
  disputeResolution?: string
  terminationClause?: string
  miscellaneous?: string
  milestones?: string
}

interface TimelineItem {
  id: string
  date: Date | undefined
  description: string
}

interface ContractData {
  contractTitle: string
  commencementDate: Date | undefined
  endDate: Date | undefined
  scopeOfService: string
  performanceStandards: string
  oyntcdaRole: string
  partnerRole: string
  projectCost: string
  capitalStructure: string
  paymentInstrument: string
  revenueSharing: string
  keyPerformanceIndicators: string
  serviceLevelAgreement: string
  monitoringReporting: string
  disputeResolution: string
  terminationClause: string
  miscellaneous: string
  oyntcdaSignature1: string
  koderSignature1: string
  milestones: TimelineItem[]
}

interface SavedContract {
  id: string
  proposalId: string
  data: ContractData
  status: "draft"
  createdAt: string
  updatedAt: string
}

const SAVED_CONTRACTS_KEY = "saved-contracts"

// Local storage utility functions
const getSavedContracts = (): SavedContract[] => {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(SAVED_CONTRACTS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error reading saved contracts from localStorage:', error)
    return []
  }
}

const saveContractToStorage = (contract: SavedContract): void => {
  try {
    const savedContracts = getSavedContracts()
    const existingIndex = savedContracts.findIndex(c => c.id === contract.id)

    if (existingIndex >= 0) {
      savedContracts[existingIndex] = contract
    } else {
      savedContracts.push(contract)
    }

    localStorage.setItem(SAVED_CONTRACTS_KEY, JSON.stringify(savedContracts))
  } catch (error) {
    console.error('Error saving contract to localStorage:', error)
    throw new Error('Failed to save contract draft locally')
  }
}

const getContractFromStorage = (proposalId: string): SavedContract | null => {
  const savedContracts = getSavedContracts()
  return savedContracts.find(contract => contract.proposalId === proposalId) || null
}

const deleteContractFromStorage = (proposalId: string): void => {
  try {
    const savedContracts = getSavedContracts()
    const filteredContracts = savedContracts.filter(contract => contract.proposalId !== proposalId)
    localStorage.setItem(SAVED_CONTRACTS_KEY, JSON.stringify(filteredContracts))
  } catch (error) {
    console.error('Error deleting contract from localStorage:', error)
  }
}

const generateContractId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: proposalId } = use(params)
  const router = useRouter()

  const [proposal, setProposal] = useState<ProposalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [isFormValid, setIsFormValid] = useState(false)
  const [contractData, setContractData] = useState<ContractData>({
    contractTitle: "",
    commencementDate: undefined,
    endDate: undefined,
    scopeOfService: "",
    performanceStandards: "",
    oyntcdaRole: "",
    partnerRole: "",
    projectCost: "",
    capitalStructure: "",
    paymentInstrument: "",
    revenueSharing: "",
    keyPerformanceIndicators: "",
    serviceLevelAgreement: "",
    monitoringReporting: "",
    disputeResolution: "",
    terminationClause: "",
    miscellaneous: "",
    oyntcdaSignature1: "",
    koderSignature1: "",
    milestones: [],
  })

  const [previewData, setPreviewData] = useState<ContractData>(contractData)
  const [currentDraftId, setCurrentDraftId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewInitialized, setIsPreviewInitialized] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [incompleteMilestones, setIncompleteMilestones] = useState<string[]>([])
  const [contractAlreadyExists, setContractAlreadyExists] = useState(false)

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())

  // Function to check if a milestone is complete
  const isMilestoneComplete = (milestone: TimelineItem): boolean => {
    return milestone.description?.trim() !== '' && milestone.date !== undefined
  }

  // Function to get incomplete milestone indices/ids
  const getIncompleteMilestones = (milestones: TimelineItem[]): string[] => {
    return milestones
      .map((m, index) => ({ ...m, index }))
      .filter(m => !isMilestoneComplete(m))
      .map(m => m.id || `milestone-${m.index}`)
  }

  // Validation function
  const validateForm = (data: ContractData): ValidationErrors => {
    const errors: ValidationErrors = {}

    // Check all required text fields are not empty
    if (!data.scopeOfService?.trim()) {
      errors.scopeOfService = "Scope of service is required"
    }

    if (!data.performanceStandards?.trim()) {
      errors.performanceStandards = "Performance standards are required"
    }

    if (!data.oyntcdaRole?.trim()) {
      errors.oyntcdaRole = "OYNTCDA role is required"
    }

    if (!data.partnerRole?.trim()) {
      errors.partnerRole = "Partner role is required"
    }

    if (!data.capitalStructure?.trim()) {
      errors.capitalStructure = "Capital structure is required"
    }

    if (!data.paymentInstrument?.trim()) {
      errors.paymentInstrument = "Payment mechanism is required"
    }

    if (!data.revenueSharing?.trim()) {
      errors.revenueSharing = "Revenue sharing is required"
    }

    if (!data.keyPerformanceIndicators?.trim()) {
      errors.keyPerformanceIndicators = "Key Performance Indicators are required"
    }

    if (!data.serviceLevelAgreement?.trim()) {
      errors.serviceLevelAgreement = "Service Level Agreement is required"
    }

    if (!data.monitoringReporting?.trim()) {
      errors.monitoringReporting = "Monitoring & Reporting is required"
    }

    if (!data.disputeResolution?.trim()) {
      errors.disputeResolution = "Dispute resolution is required"
    }

    if (!data.terminationClause?.trim()) {
      errors.terminationClause = "Termination clause is required"
    }

    if (!data.miscellaneous?.trim()) {
      errors.miscellaneous = "Miscellaneous is required"
    }

    // Check milestones
    if (!data.milestones || data.milestones.length === 0) {
      errors.milestones = "At least one milestone is required"
    } else {
      // Check each milestone has description AND date
      const incompleteCount = data.milestones.filter(m => !isMilestoneComplete(m)).length
      if (incompleteCount > 0) {
        errors.milestones = `${incompleteCount} milestone${incompleteCount > 1 ? 's' : ''} ${incompleteCount > 1 ? 'are' : 'is'} incomplete. Each milestone requires a description and date.`
        setIncompleteMilestones(getIncompleteMilestones(data.milestones))
      } else {
        setIncompleteMilestones([])
      }
    }

    return errors
  }

  // Effect to validate form whenever contract data changes
  useEffect(() => {
    const errors = validateForm(contractData)
    setValidationErrors(errors)
    setIsFormValid(Object.keys(errors).length === 0)
  }, [contractData])

  // Load saved draft from localStorage on component mount
  useEffect(() => {
    const loadSavedDraft = () => {
      try {
        const savedContract = getContractFromStorage(proposalId)
        if (savedContract) {
          setContractData(savedContract.data)
          setPreviewData(savedContract.data)
          setCurrentDraftId(savedContract.id)
          setIsPreviewInitialized(true)
          toast.success('Loaded saved draft')
        }
      } catch (error) {
        console.error('Error loading saved draft:', error)
      }
    }

    loadSavedDraft()
  }, [proposalId])

  useEffect(() => {
    const fetchProposalData = async () => {
      try {
        // Fetch proposal first to get the project ID
        const proposalResponse = await proposalAPI.getById(proposalId)

        if (!proposalResponse.success || !proposalResponse.data) {
          toast.error("Failed to load proposal data")
          return
        }

        const proposalData = proposalResponse.data

        // Check for existing contract by project_id
        try {
          const contractCheck = await contractsAPI.getByProjectId(proposalData.project.id)
          if (contractCheck.success && contractCheck.data) {
            setContractAlreadyExists(true)
            setLoading(false)
            return
          }
        } catch {
          // No contract found or API error — safe to proceed
        }

        setProposal(proposalData)

        // Pre-fill form if no saved draft exists
        const savedContract = getContractFromStorage(proposalId)
        if (!savedContract) {
          const newContractData = {
            contractTitle: proposalData.project.title,
            commencementDate: proposalData.project.proposed_start_date
              ? parseISO(proposalData.project.proposed_start_date)
              : undefined,
            endDate: proposalData.project.estimated_completion_date
              ? parseISO(proposalData.project.estimated_completion_date)
              : undefined,
            projectCost: proposalData.project.estimated_cost || "0",
            scopeOfService: "",
            performanceStandards: "",
            oyntcdaRole: "",
            partnerRole: "",
            capitalStructure: "",
            paymentInstrument: "",
            revenueSharing: "",
            keyPerformanceIndicators: "",
            serviceLevelAgreement: "",
            monitoringReporting: "",
            disputeResolution: "",
            terminationClause: "",
            miscellaneous: "",
            oyntcdaSignature1: "",
            koderSignature1: "",
            milestones: []
          }

          setContractData(newContractData)
          setPreviewData(newContractData)
          setIsPreviewInitialized(true)
        }
      } catch (error) {
        console.error("Error fetching proposal:", error)
        toast.error("Failed to load proposal data")
      } finally {
        setLoading(false)
      }
    }

    fetchProposalData()
  }, [proposalId])

  // Auto-save to localStorage when contract data changes (with debouncing)
  useEffect(() => {
    if (!isPreviewInitialized || !proposal) return

    const timeoutId = setTimeout(() => {
      // Only save if we have meaningful data
      const hasMeaningfulData =
        contractData.contractTitle ||
        contractData.scopeOfService ||
        contractData.performanceStandards ||
        contractData.oyntcdaRole ||
        contractData.partnerRole ||
        (contractData.projectCost && contractData.projectCost !== "0") ||
        contractData.capitalStructure ||
        contractData.paymentInstrument ||
        contractData.revenueSharing ||
        contractData.keyPerformanceIndicators ||
        contractData.serviceLevelAgreement ||
        contractData.monitoringReporting ||
        contractData.disputeResolution ||
        contractData.terminationClause ||
        contractData.miscellaneous ||
        contractData.milestones.length > 0

      if (hasMeaningfulData) {
        try {
          const draftId = currentDraftId || generateContractId()
          const savedContract: SavedContract = {
            id: draftId,
            proposalId: proposalId,
            data: contractData,
            status: "draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          saveContractToStorage(savedContract)
          if (!currentDraftId) {
            setCurrentDraftId(draftId)
          }
        } catch (error) {
          console.error('Error auto-saving draft:', error)
        }
      }
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [contractData, proposalId, currentDraftId, isPreviewInitialized, proposal])

  // Update preview when contract data changes
  useEffect(() => {
    if (!isPreviewInitialized) return

    const hasChanges = JSON.stringify(contractData) !== JSON.stringify(previewData)
    if (hasChanges) {
      setPreviewData({ ...contractData })
    }
  }, [
    contractData.contractTitle,
    contractData.commencementDate,
    contractData.endDate,
    contractData.scopeOfService,
    contractData.performanceStandards,
    contractData.oyntcdaRole,
    contractData.partnerRole,
    contractData.projectCost,
    contractData.capitalStructure,
    contractData.paymentInstrument,
    contractData.revenueSharing,
    contractData.keyPerformanceIndicators,
    contractData.serviceLevelAgreement,
    contractData.monitoringReporting,
    contractData.disputeResolution,
    contractData.terminationClause,
    contractData.miscellaneous,
    contractData.oyntcdaSignature1,
    contractData.koderSignature1,
    contractData.milestones,
    isPreviewInitialized,
    previewData
  ])

  // Special effect for milestone changes
  useEffect(() => {
    const milestonesChanged = JSON.stringify(contractData.milestones) !== JSON.stringify(previewData.milestones)
    if (milestonesChanged && isPreviewInitialized) {
      setPreviewData(prev => ({ ...prev, milestones: [...contractData.milestones] }))
    }
  }, [contractData.milestones, previewData.milestones, isPreviewInitialized])

  const updateField = <K extends keyof ContractData>(field: K, value: ContractData[K]) => {
    setContractData((prev) => {
      const updated = { ...prev, [field]: value }
      return updated
    })

    // Immediate preview update for better UX
    setPreviewData((prev) => ({ ...prev, [field]: value }))
  }

  const displayProjectCost = formatCurrencyInput(contractData.projectCost)

  const handleSaveForLater = async () => {
    if (!proposal) {
      toast.error("Proposal data not loaded")
      return
    }

    setIsSaving(true)
    try {
      const savedContract: SavedContract = {
        id: proposalId,
        proposalId: proposalId,
        data: contractData,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      saveContractToStorage(savedContract)
      setCurrentDraftId(proposalId)

      toast.success("Contract saved as draft")
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Error saving contract draft:", error)
      const errorMessage = err.message || "Failed to save contract draft"
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateClick = () => {
    // Validate form before showing dialog
    const errors = validateForm(contractData)
    
    if (Object.keys(errors).length > 0) {
      // Show validation errors
      setValidationErrors(errors)
      
      // Find the first field with error and scroll to it
      const firstErrorField = Object.keys(errors)[0]
      
      // Special handling for milestones
      if (firstErrorField === 'milestones') {
        const element = document.getElementById('milestones-section')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else {
        const element = document.getElementById(firstErrorField)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }
      
      toast.error("Please fill in all required fields and ensure all milestones have both description and date")
      return
    }
    
    // If valid, show the confirmation dialog
    setShowGenerateDialog(true)
  }

  const handleGenerateAndSendContract = async () => {
    if (!proposal) {
      toast.error("Proposal data not loaded")
      return
    }

    // Double-check validation before submission
    const errors = validateForm(contractData)
    if (Object.keys(errors).length > 0) {
      toast.error("Please complete all required fields and ensure all milestones are fully filled out")
      setShowGenerateDialog(false)
      return
    }

    setIsSaving(true)
    try {
      const milestonesData = contractData.milestones.map(m => ({
        description: m.description,
        due_date: m.date ? format(m.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      }))

      // Always create a new contract in the backend - don't use localStorage draft ID
      const createData = {
        eoi_id: proposal.eoi.id,
        title: contractData.contractTitle || proposal.project.title,
        proposal_id: proposal.id,
        project_id: proposal.project.id,
        partner_id: proposal.eoi.id,
        estimated_project_cost: contractData.projectCost || proposal.project.estimated_cost || "0",
        commences_on: contractData.commencementDate
          ? format(contractData.commencementDate, 'yyyy-MM-dd')
          : proposal.project.proposed_start_date || format(new Date(), 'yyyy-MM-dd'),
        ends_on: contractData.endDate
          ? format(contractData.endDate, 'yyyy-MM-dd')
          : proposal.project.estimated_completion_date || format(new Date(), 'yyyy-MM-dd'),
        scope_of_service: contractData.scopeOfService,
        oyntcda_roles: contractData.oyntcdaRole,
        partner_responsibilities: contractData.partnerRole,
        capital_structure: contractData.capitalStructure,
        payment_mechanism: contractData.paymentInstrument,
        revenue_sharing: contractData.revenueSharing,
        kpis: contractData.keyPerformanceIndicators,
        slas: contractData.serviceLevelAgreement,
        monitoring_and_reporting: contractData.monitoringReporting,
        dispute_resolution: contractData.disputeResolution,
        termination_and_exit_clauses: contractData.terminationClause,
        miscellaneous: contractData.miscellaneous,
        milestones: milestonesData,
      }

      const result = await contractsAPI.create(createData)

      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to create contract")
      }

      const contractId = result.data.id

      await contractsAPI.send(contractId)

      // if (!sendResult.success) {
      //   throw new Error(sendResult.message || "Failed to send contract")
      // }

      // Delete from localStorage on successful generation
      deleteContractFromStorage(proposalId)

      toast.success("Contract generated and sent to partner for signature")
      setShowGenerateDialog(false)
      router.push(`/contracts/${contractId}/sign`)

    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Error generating contract:", error)
      const errorMessage = err.message || "Failed to generate contract"

      // More specific error messages
      if (errorMessage.includes("Not found")) {
        toast.error("Contract not found. Please try creating the contract again.")
      } else if (errorMessage.includes("Failed to create")) {
        toast.error("Failed to create contract. Please check your data and try again.")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Custom handler for milestone changes to ensure we validate
  const handleMilestonesChange = (items: TimelineItem[]) => {
    updateField("milestones", items)
    
    // Check for incomplete milestones and show visual feedback
    const incomplete = items.filter(m => !isMilestoneComplete(m))
    if (incomplete.length > 0) {
      setIncompleteMilestones(incomplete.map(m => m.id))
    } else {
      setIncompleteMilestones([])
    }
  }

  // Clear draft when leaving page (optional - you might want to keep it for later)
  useEffect(() => {
    return () => {
      // Optional: Clear draft when component unmounts
      // deleteContractFromStorage(proposalId)
    }
  }, [proposalId])

  // Check if there's any meaningful data to preview
  const hasPreviewContent =
    previewData.contractTitle ||
    previewData.scopeOfService ||
    previewData.performanceStandards ||
    previewData.oyntcdaRole ||
    previewData.partnerRole ||
    previewData.projectCost ||
    previewData.capitalStructure ||
    previewData.paymentInstrument ||
    previewData.revenueSharing ||
    previewData.keyPerformanceIndicators ||
    previewData.serviceLevelAgreement ||
    previewData.monitoringReporting ||
    previewData.disputeResolution ||
    previewData.terminationClause ||
    previewData.miscellaneous ||
    previewData.milestones.length > 0

  // Helper function to truncate long text for preview
  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  // Helper function to check if a section has content
  const hasSectionContent = (content: string) => {
    return content && content.trim().length > 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (contractAlreadyExists) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full mx-auto p-8 border rounded-lg bg-white shadow-sm text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Contract Already Generated</h2>
          <p className="text-sm text-muted-foreground">
            A contract has already been generated for this project. You cannot generate another contract for the same project.
          </p>
          <Button
            onClick={() => router.push("/proposals")}
            className="w-full bg-[#C13C3D] hover:bg-[#A02F30] text-white"
          >
            Back to Proposals
          </Button>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return <div className="p-8">Proposal not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Generate Contract Confirmation Dialog */}
      <AlertDialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate & Send Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to generate and send this contract to the partner? 
              This action will:
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Create a formal contract document</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Send it to the partner for their signature</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Notify the partner to review and sign</span>
                </li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Once sent, the partner will be able to review and sign the contract. 
                  You will be able to add your signature after the partner signs.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleGenerateAndSendContract}
              disabled={isSaving || !isFormValid}
              className="bg-[#C13C3D] hover:bg-[#A02F30] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating & Sending...
                </>
              ) : (
                "Yes, Generate & Send Contract"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto md:p-4">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Proposals</span>
            <span>›</span>
            <span>#{proposal.reference_id}</span>
            <span>›</span>
            <span className="text-foreground font-medium">Generate Contract</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Fill in the details carefully. Once generated, the contract will be sent to all parties for signing.
          </p>
          {/* Show validation summary if there are errors */}
          {/* {!isFormValid && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Please complete all required fields before generating the contract:
                  </p>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {Object.values(validationErrors).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )} */}
          {/* Show draft status indicator */}
          {currentDraftId && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Draft saved:</strong> Your progress is automatically saved locally.
              </p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="col-span-3 lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-1">Overview</h2>
              <p className="text-sm text-muted-foreground mb-6">Provide the core details of this contract.</p>
            </section>

            <section>
              <div className="space-y-2">
                <Label>Contract Title</Label>
                <Input
                  type="text"
                  placeholder="e.g. Construction of a new courthouse"
                  value={contractData.contractTitle}
                  onChange={(e) => updateField("contractTitle", e.target.value)}
                  disabled
                />
              </div>
            </section>

            <section>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commencement on</Label>
                    <Popover>
                      <PopoverTrigger asChild disabled>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start bg-[#F7F7F8] text-left font-normal",
                            !contractData.commencementDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contractData.commencementDate ? (
                            format(contractData.commencementDate, "PPP")
                          ) : (
                            <span>e.g. Jan 1900</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={contractData.commencementDate}
                          onSelect={(date) => updateField("commencementDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Ends on</Label>
                    <Popover>
                      <PopoverTrigger asChild disabled>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full bg-[#F7F7F8] justify-start text-left font-normal",
                            !contractData.endDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contractData.endDate ? format(contractData.endDate, "PPP") : <span>e.g. Dec 2026</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={contractData.endDate}
                          onSelect={(date) => updateField("endDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scopeOfService" className={cn(validationErrors.scopeOfService && "text-red-600")}>
                    Scope of service <span className="text-red-500">*</span>
                  </Label>
                  {validationErrors.scopeOfService && (
                    <span className="text-xs text-red-600">{validationErrors.scopeOfService}</span>
                  )}
                </div>
                <Textarea
                  id="scopeOfService"
                  placeholder="Provide a detailed description of the service to be provided here"
                  value={contractData.scopeOfService}
                  onChange={(e) => updateField("scopeOfService", e.target.value)}
                  className={cn(
                    "min-h-[120px]",
                    validationErrors.scopeOfService && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
              </div>
            </section>

            <section>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="performanceStandards" className={cn(validationErrors.performanceStandards && "text-red-600")}>
                    Performance standards <span className="text-red-500">*</span>
                  </Label>
                  {validationErrors.performanceStandards && (
                    <span className="text-xs text-red-600">{validationErrors.performanceStandards}</span>
                  )}
                </div>
                <Textarea
                  id="performanceStandards"
                  placeholder="Provide a detailed description of the service to be provided here"
                  value={contractData.performanceStandards}
                  onChange={(e) => updateField("performanceStandards", e.target.value)}
                  className={cn(
                    "min-h-[120px]",
                    validationErrors.performanceStandards && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
              </div>
            </section>

            <section id="milestones-section">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={cn(validationErrors.milestones && "text-red-600")}>
                    Project Milestones <span className="text-red-500">*</span>
                  </Label>
                  {validationErrors.milestones && (
                    <span className="text-xs text-red-600">{validationErrors.milestones}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Add milestones and key deliverables for this project, along with their expected completion dates. 
                  <span className="font-medium text-red-500"> Each milestone requires both a description and a date.</span>
                </p>
                <div className={cn(
                  validationErrors.milestones && "p-2 border-2 border-red-200 rounded-md bg-red-50/50",
                  incompleteMilestones.length > 0 && "p-2 border-2 border-orange-200 rounded-md bg-orange-50/50"
                )}>
                  <TimelineFeed
                    items={contractData.milestones}
                    onItemsChange={handleMilestonesChange}
                    title="Project Timeline"
                    description="Create a visual timeline of your project milestones"
                    addButtonText="Add More Milestones"
                    emptyStateText="No milestones added yet"
                    startDate={contractData.commencementDate}
                    endDate={contractData.endDate}
                  />
                  {incompleteMilestones.length > 0 && (
                    <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{incompleteMilestones.length} milestone(s) need both description and date</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-1">Roles & Responsibilities</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Define the specific duties and obligations of each party involved in this contract
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="oyntcda" className={cn(validationErrors.oyntcdaRole && "text-red-600")}>
                      OYNTCDA <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.oyntcdaRole && (
                      <span className="text-xs text-red-600">{validationErrors.oyntcdaRole}</span>
                    )}
                  </div>
                  <Textarea
                    id="oyntcda"
                    placeholder="e.g. Oversee project implementation, ensure compliance with PPP regulations, and provide periodic progress evaluations"
                    value={contractData.oyntcdaRole}
                    onChange={(e) => updateField("oyntcdaRole", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.oyntcdaRole && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="partner" className={cn(validationErrors.partnerRole && "text-red-600")}>
                      Partner <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.partnerRole && (
                      <span className="text-xs text-red-600">{validationErrors.partnerRole}</span>
                    )}
                  </div>
                  <Textarea
                    id="partner"
                    placeholder="e.g. Execute project in accordance with accepted proposal, submit agreed milestones, and maintain transparent reporting"
                    value={contractData.partnerRole}
                    onChange={(e) => updateField("partnerRole", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.partnerRole && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-1">Finance</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Provide a detailed breakdown of the project&apos;s financial framework.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectCost">Project Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <Input
                      id="projectCost"
                      type="text"
                      placeholder="00.00"
                      value={displayProjectCost}
                      onChange={(e) => updateField("projectCost", e.target.value)}
                      className="pl-7"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="capitalStructure" className={cn(validationErrors.capitalStructure && "text-red-600")}>
                      Capital structure <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.capitalStructure && (
                      <span className="text-xs text-red-600">{validationErrors.capitalStructure}</span>
                    )}
                  </div>
                  <Textarea
                    id="capitalStructure"
                    placeholder="Outline the capital structure"
                    value={contractData.capitalStructure}
                    onChange={(e) => updateField("capitalStructure", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.capitalStructure && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="paymentInstrument" className={cn(validationErrors.paymentInstrument && "text-red-600")}>
                      Payment mechanisms <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.paymentInstrument && (
                      <span className="text-xs text-red-600">{validationErrors.paymentInstrument}</span>
                    )}
                  </div>
                  <Textarea
                    id="paymentInstrument"
                    placeholder="Describe the payment mechanism (e.g., availability payments, tariff structure, or other applicable models)."
                    value={contractData.paymentInstrument}
                    onChange={(e) => updateField("paymentInstrument", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.paymentInstrument && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="revenueSharing" className={cn(validationErrors.revenueSharing && "text-red-600")}>
                      Revenue sharing <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.revenueSharing && (
                      <span className="text-xs text-red-600">{validationErrors.revenueSharing}</span>
                    )}
                  </div>
                  <Textarea
                    id="revenueSharing"
                    placeholder="Define how revenue will be shared between parties, if applicable."
                    value={contractData.revenueSharing}
                    onChange={(e) => updateField("revenueSharing", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.revenueSharing && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-1">Management & Compliance</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Outline performance standards, reporting duties, and other compliance requirements for all parties
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="kpi" className={cn(validationErrors.keyPerformanceIndicators && "text-red-600")}>
                      Key Performance Indicators <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.keyPerformanceIndicators && (
                      <span className="text-xs text-red-600">{validationErrors.keyPerformanceIndicators}</span>
                    )}
                  </div>
                  <Textarea
                    id="kpi"
                    placeholder="Define measurable performance targets aligned upon with the partner (e.g., service uptime must exceed 98% per quarter)"
                    value={contractData.keyPerformanceIndicators}
                    onChange={(e) => updateField("keyPerformanceIndicators", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.keyPerformanceIndicators && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sla" className={cn(validationErrors.serviceLevelAgreement && "text-red-600")}>
                      Service Level Agreement <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.serviceLevelAgreement && (
                      <span className="text-xs text-red-600">{validationErrors.serviceLevelAgreement}</span>
                    )}
                  </div>
                  <Textarea
                    id="sla"
                    placeholder="Define measurable performance targets aligned upon with the partner (e.g., Maintenance response time not to exceed 48 hours)"
                    value={contractData.serviceLevelAgreement}
                    onChange={(e) => updateField("serviceLevelAgreement", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.serviceLevelAgreement && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="monitoring" className={cn(validationErrors.monitoringReporting && "text-red-600")}>
                      Monitoring & Reporting <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.monitoringReporting && (
                      <span className="text-xs text-red-600">{validationErrors.monitoringReporting}</span>
                    )}
                  </div>
                  <Textarea
                    id="monitoring"
                    placeholder="Outline how performance will be tracked and reported over the contract duration (e.g., quarterly progress reports to be submitted to oyntcda within 10 business days after each quarter end)"
                    value={contractData.monitoringReporting}
                    onChange={(e) => updateField("monitoringReporting", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.monitoringReporting && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dispute" className={cn(validationErrors.disputeResolution && "text-red-600")}>
                      Dispute resolution <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.disputeResolution && (
                      <span className="text-xs text-red-600">{validationErrors.disputeResolution}</span>
                    )}
                  </div>
                  <Textarea
                    id="dispute"
                    placeholder="Outline procedures for resolving disagreements between parties"
                    value={contractData.disputeResolution}
                    onChange={(e) => updateField("disputeResolution", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.disputeResolution && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="termination" className={cn(validationErrors.terminationClause && "text-red-600")}>
                      Termination & Exit clause <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.terminationClause && (
                      <span className="text-xs text-red-600">{validationErrors.terminationClause}</span>
                    )}
                  </div>
                  <Textarea
                    id="termination"
                    placeholder="Define conditions under which the agreement may be terminated or exited by either party"
                    value={contractData.terminationClause}
                    onChange={(e) => updateField("terminationClause", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.terminationClause && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="misc" className={cn(validationErrors.miscellaneous && "text-red-600")}>
                      Miscellaneous <span className="text-red-500">*</span>
                    </Label>
                    {validationErrors.miscellaneous && (
                      <span className="text-xs text-red-600">{validationErrors.miscellaneous}</span>
                    )}
                  </div>
                  <Textarea
                    id="misc"
                    placeholder="Include any additional legal, administrative, or operational clauses not covered above"
                    value={contractData.miscellaneous}
                    onChange={(e) => updateField("miscellaneous", e.target.value)}
                    className={cn(
                      "min-h-[100px]",
                      validationErrors.miscellaneous && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-col justify-end sm:flex-row gap-3 pb-8">
              <Button
                variant="ghost"
                className="flex-1 sm:flex-none bg-transparent"
                onClick={() => router.push(`/proposals/${proposalId}`)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none bg-transparent"
                onClick={handleSaveForLater}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save for Later"
                )}
              </Button>
              <Button
                className="flex-1 sm:flex-none bg-[#C13C3D] hover:bg-[#A13334]"
                onClick={handleGenerateClick}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate & Send Contract"
                )}
              </Button>
            </div>
          </div>

          <div className="col-span-3 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
            <div className="border rounded-lg bg-card">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Preview Contract</h3>
                <p className="text-sm text-muted-foreground">Review contract before sending it out</p>
              </div>

              <div className="p-4">
                {hasPreviewContent ? (
                  <div className="space-y-6 text-sm max-h-[600px] overflow-y-auto">
                    {/* Contract Title */}
                    {previewData.contractTitle && (
                      <div>
                        <p className="text-xl font-bold text-balance leading-tight mb-2">{previewData.contractTitle}</p>
                        <div className="w-full h-px bg-border"></div>
                      </div>
                    )}

                    {/* Basic Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Basic Information</h4>

                      {(previewData.commencementDate || previewData.endDate) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <img src="/icons/calendar.svg" alt="calendar icon" />
                          <span>
                            {previewData.commencementDate && format(previewData.commencementDate, "PPP")}
                            {previewData.commencementDate && previewData.endDate && " to "}
                            {previewData.endDate && format(previewData.endDate, "PPP")}
                          </span>
                        </div>
                      )}

                      {previewData.projectCost && previewData.projectCost !== "0" && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <img src="/icons/wallet.svg" alt="wallet icon" />
                          <span>₦{formatNumberWithCommas(previewData.projectCost)}</span>
                        </div>
                      )}
                    </div>

                    {/* Scope of Service */}
                    {hasSectionContent(previewData.scopeOfService) && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Scope of Service</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          {truncateText(previewData.scopeOfService)}
                        </p>
                      </div>
                    )}

                    {/* Performance Standards */}
                    {hasSectionContent(previewData.performanceStandards) && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Performance Standards</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          {truncateText(previewData.performanceStandards)}
                        </p>
                      </div>
                    )}

                    {/* Milestones */}
                    {previewData.milestones.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Project Milestones</h4>
                        <div className="space-y-2">
                          {previewData.milestones.slice(0, 3).map((milestone, index) => (
                            <div key={milestone.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                              <CheckCircle className={cn(
                                "h-4 w-4 mt-0.5 flex-shrink-0",
                                isMilestoneComplete(milestone) ? "text-green-600" : "text-orange-400"
                              )} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {milestone.description || <span className="text-orange-500 italic">No description</span>}
                                </p>
                                {milestone.date ? (
                                  <p className="text-xs text-muted-foreground">
                                    Due: {format(milestone.date, "MMM d, yyyy")}
                                  </p>
                                ) : (
                                  <p className="text-xs text-orange-500 italic">No date set</p>
                                )}
                              </div>
                            </div>
                          ))}
                          {previewData.milestones.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{previewData.milestones.length - 3} more milestones
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Roles & Responsibilities */}
                    {(hasSectionContent(previewData.oyntcdaRole) || hasSectionContent(previewData.partnerRole)) && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Roles & Responsibilities</h4>
                        <div className="space-y-3">
                          {hasSectionContent(previewData.oyntcdaRole) && (
                            <div>
                              <p className="font-medium text-xs text-muted-foreground mb-1">OYNTCDA</p>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {truncateText(previewData.oyntcdaRole, 100)}
                              </p>
                            </div>
                          )}
                          {hasSectionContent(previewData.partnerRole) && (
                            <div>
                              <p className="font-medium text-xs text-muted-foreground mb-1">PARTNER</p>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {truncateText(previewData.partnerRole, 100)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Financial Information */}
                    {(hasSectionContent(previewData.capitalStructure) ||
                      hasSectionContent(previewData.paymentInstrument) ||
                      hasSectionContent(previewData.revenueSharing)) && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Financial Information</h4>
                          <div className="space-y-3">
                            {hasSectionContent(previewData.capitalStructure) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">CAPITAL STRUCTURE</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.capitalStructure, 100)}
                                </p>
                              </div>
                            )}
                            {hasSectionContent(previewData.paymentInstrument) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">PAYMENT MECHANISM</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.paymentInstrument, 100)}
                                </p>
                              </div>
                            )}
                            {hasSectionContent(previewData.revenueSharing) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">REVENUE SHARING</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.revenueSharing, 100)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Management & Compliance */}
                    {(hasSectionContent(previewData.keyPerformanceIndicators) ||
                      hasSectionContent(previewData.serviceLevelAgreement) ||
                      hasSectionContent(previewData.monitoringReporting) ||
                      hasSectionContent(previewData.disputeResolution) ||
                      hasSectionContent(previewData.terminationClause) ||
                      hasSectionContent(previewData.miscellaneous)) && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Management & Compliance</h4>
                          <div className="space-y-3">
                            {hasSectionContent(previewData.keyPerformanceIndicators) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">KEY PERFORMANCE INDICATORS</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.keyPerformanceIndicators, 80)}
                                </p>
                              </div>
                            )}
                            {hasSectionContent(previewData.serviceLevelAgreement) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">SERVICE LEVEL AGREEMENT</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.serviceLevelAgreement, 80)}
                                </p>
                              </div>
                            )}
                            {hasSectionContent(previewData.monitoringReporting) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">MONITORING & REPORTING</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.monitoringReporting, 80)}
                                </p>
                              </div>
                            )}
                            {hasSectionContent(previewData.disputeResolution) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">DISPUTE RESOLUTION</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.disputeResolution, 80)}
                                </p>
                              </div>
                            )}
                            {hasSectionContent(previewData.terminationClause) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">TERMINATION CLAUSE</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.terminationClause, 80)}
                                </p>
                              </div>
                            )}
                            {hasSectionContent(previewData.miscellaneous) && (
                              <div>
                                <p className="font-medium text-xs text-muted-foreground mb-1">MISCELLANEOUS</p>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {truncateText(previewData.miscellaneous, 80)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Completion Status */}
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Completion Status</span>
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(previewData).filter(key =>
                            key !== 'milestones' &&
                            key !== 'status' &&
                            previewData[key as keyof ContractData] &&
                            String(previewData[key as keyof ContractData]).length > 0
                          ).length} of {Object.keys(previewData).length - 3} sections
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(Object.keys(previewData).filter(key =>
                              key !== 'milestones' &&
                              key !== 'status' &&
                              previewData[key as keyof ContractData] &&
                              String(previewData[key as keyof ContractData]).length > 0
                            ).length / (Object.keys(previewData).length - 3)) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                    <div>
                      <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm">Nothing to preview yet</p>
                      <p className="text-xs mt-1">Start adding contract details to see preview here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}