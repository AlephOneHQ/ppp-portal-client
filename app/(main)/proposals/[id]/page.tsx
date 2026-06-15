"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, MoreVertical, Loader2, FileText, Download } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getCurrentUser } from "@/lib/user"
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
import { toast } from "sonner"
import { proposalAPI, type ProposalDetail } from "@/lib/api/proposals"
import { contractsAPI, type Contract } from "@/lib/api/contracts"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function EOIDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"

  const [loading, setLoading] = useState(true)
  const [proposal, setProposal] = useState<ProposalDetail | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [matchedContract, setMatchedContract] = useState<Contract | null>(null)
  const [contractsLoading, setContractsLoading] = useState(false)
  const [isActioning, setIsActioning] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [showContractExistsDialog, setShowContractExistsDialog] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("contractExists") === "true"
  )
  const [projectContractExists, setProjectContractExists] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch proposal
        const proposalResponse = await proposalAPI.getById(id)
        if (proposalResponse.success && proposalResponse.data) {
          setProposal(proposalResponse.data)
        } else {
          throw new Error("Failed to fetch proposal")
        }
      } catch (error) {
        console.error("Error fetching proposal:", error)
        toast.error("Failed to load proposal details")
        router.push("/proposals")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  // Fetch contract by project_id — one call covers both cases
  useEffect(() => {
    const fetchContracts = async () => {
      if (!proposal) return

      try {
        setContractsLoading(true)

        const contractRes = await contractsAPI.getByProjectId(proposal.project.id)

        if (contractRes.success && contractRes.data) {
          const contract = contractRes.data
          // Check if this contract belongs to this partner's proposal
          if (contract.proposal_id === id) {
            setMatchedContract(contract)
            setContracts([contract])
          } else {
            // Contract exists for a different proposal — block both partners and admins
            setProjectContractExists(true)
          }
        }
      } catch (error) {
        console.error("Error fetching contracts:", error)
      } finally {
        setContractsLoading(false)
      }
    }

    fetchContracts()
  }, [proposal, id, userRole])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "submitted":
      case "under_review":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200"
      case "approved":
        return "text-green-600 bg-green-50 border-green-200"
      case "withdrawn":
        return "text-muted-foreground bg-muted border-border"
      default:
        return ""
    }
  }

  const getContractStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "draft":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "sent":
      case "under_review":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "signed":
        return "text-green-600 bg-green-50 border-green-200"
      case "withdrawn":
      case "terminated":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const handleWithdrawProposal = async () => {
    setIsActioning(true)
    try {
      const response = await proposalAPI.withdraw(id)

      if (response.success) {
        toast.success("Proposal withdrawn successfully")
        setShowWithdrawDialog(false)

        // Refresh proposal data
        const updatedResponse = await proposalAPI.getById(id)
        if (updatedResponse.success && updatedResponse.data) {
          setProposal(updatedResponse.data)
        }
      } else {
        throw new Error(response.message || "Failed to withdraw proposal")
      }
    } catch (error) {
      console.error("Error withdrawing proposal:", error)
      toast.error("Failed to withdraw proposal")
    } finally {
      setIsActioning(false)
    }
  }

  const handleRejectProposal = async () => {
    setIsActioning(true)
    try {
      const response = await proposalAPI.reject(id, rejectionReason)
      if (response.success) {
        toast.success("Proposal rejected successfully")

        setShowRejectDialog(false)
        setRejectionReason("")

        // Refresh proposal data
        const updatedResponse = await proposalAPI.getById(id)
        if (updatedResponse.success && updatedResponse.data) {
          setProposal(updatedResponse.data)
        }
      } else {
        throw new Error(response.message || "Failed to reject proposal")
      }
    } catch (error) {
      console.error("Error rejecting proposal:", error)
      toast.error("Failed to reject proposal")
    } finally {
      setIsActioning(false)
    }
  }

  const handleApproveProposal = async () => {
    setIsActioning(true)
    try {
      const response = await proposalAPI.approve(id)
      if (response.success) {
        toast.success("Proposal approved successfully")

        setShowApproveDialog(false)

        // Refresh proposal data
        const updatedResponse = await proposalAPI.getById(id)
        if (updatedResponse.success && updatedResponse.data) {
          setProposal(updatedResponse.data)
        }

        handleGenerateContract()
      } else {
        throw new Error(response.message || "Failed to approve proposal")
      }
    } catch (error) {
      console.error("Error approving proposal:", error)
      toast.error("Failed to approve proposal")
    } finally {
      setIsActioning(false)
    }
  }

  const handleResubmitProposal = () => {
    router.push(`/eoi/${proposal?.eoi.id}/submit-proposal?resubmit=${proposal?.id}`)
  }

  const handleGenerateContract = () => {
    if (matchedContract || projectContractExists) {
      setShowContractExistsDialog(true)
      return
    }
    router.push(`/proposals/${id}/generate-contract`)
  }

  const handleViewContract = () => {
    if (matchedContract) {
      router.push(`/proposals/${matchedContract.id}/view-contract`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!proposal) {
    return <div className="p-8">Proposal not found</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-8 md:p-8 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/proposals" className="hover:text-foreground transition-colors">
          Proposals
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">#{proposal.reference_id}</span>
      </div>

      <div className="w-full mx-auto px-4 py-6 max-w-5xl border shadow-sm rounded-lg bg-white space-y-10">
        {/* Header */}
        <div className="border-b pb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-6">
            {proposal.eoi.company_name}: Proposal for {proposal.project.title}
          </h1>
          <div className="grid md:grid-cols-3 items-center gap-4 md:gap-8 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Reference ID</p>
              <p className="font-medium">#{proposal.reference_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Date of submission</p>
              <p className="font-medium">
                {proposal.submitted_at
                  ? new Date(proposal.submitted_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                  : "Not submitted"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Submission Status</p>
              <Badge
                variant="outline"
                className={`text-xs whitespace-nowrap px-3 py-2 rounded-md ${getStatusColor(proposal.status)}`}
              >
                {proposal.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Contract Information */}
          {contractsLoading ? (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">Checking for contracts...</span>
            </div>
          ) : projectContractExists && !matchedContract ? (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-medium">Project No Longer Available</p>
              <p className="text-xs text-red-600 mt-1">
                A contract has already been awarded for this project to another partner.
              </p>
            </div>
          ) : matchedContract ? (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    Contract Available:{" "}
                    {matchedContract.reference_number || `Contract #${matchedContract.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Status:{" "}
                    <span className="font-medium">{matchedContract.status.replace("_", " ").toUpperCase()}</span>
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs whitespace-nowrap px-3 py-1 rounded-md ${getContractStatusColor(matchedContract.status)}`}
                >
                  {matchedContract.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          ) : (
            (proposal.status === "submitted" || proposal.status === "under_review" || proposal.status === "approved") && !projectContractExists && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    {userRole === "partner" ? (
                      <>
                        <p className="text-sm text-yellow-800 font-medium">Your proposal is being reviewed</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          If approved, a contract will be generated, and you will receive a notification to review and sign it.
                        </p>
                      </>
                    ) : proposal.status === "approved" ? (
                      <>
                        <p className="text-sm text-yellow-800 font-medium">Proposal Approved — Contract Pending</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          This proposal has been approved. Generate a contract to proceed with the partner.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-yellow-800 font-medium">Proposal Under Review</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Review this proposal and approve it to generate a contract for the partner.
                        </p>
                      </>
                    )}
                  </div>
                  {userRole === "admin" && proposal.status === "approved" && (
                    <Button
                      onClick={handleGenerateContract}
                      className="bg-[#C13C3D] hover:bg-[#A02F30] text-white"
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Contract
                    </Button>
                  )}
                </div>
              </div>
            )
          )}

          {userRole === "partner" && (
            <div className="flex gap-2 my-2">
              {proposal.status !== "rejected" && proposal.status !== "withdrawn" && (
                <div className="w-full">
                  <Button
                    className="w-full bg-[#C13C3D] capitalize hover:bg-[#A02F30] text-white px-8"
                    onClick={handleViewContract}
                    disabled={proposal.status !== "approved" || !matchedContract || contractsLoading || projectContractExists}
                  >
                    {contractsLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Contract...
                      </>
                    ) : matchedContract ? (
                      "View Contract"
                    ) : (
                      "Contract Not Available"
                    )}
                  </Button>
                </div>
              )}

              {(proposal.status === "rejected" || proposal.status === "withdrawn") && (
                <div className="w-full">
                  <Button
                    className="w-full bg-[#C13C3D] capitalize hover:bg-[#A02F30] text-white px-8"
                    onClick={handleResubmitProposal}
                  >
                    {proposal.status === "withdrawn" ? "Resubmit Proposal" : "Resubmit Proposal"}
                  </Button>
                </div>
              )}

              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 px-6 bg-transparent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {proposal.status !== "withdrawn" && (
                      <DropdownMenuItem onClick={() => setShowWithdrawDialog(true)}>
                        Withdraw Proposal
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>{proposal.summary}</p>
          </div>
        </section>

        {/* Implementation Plan */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Implementation Plan</h2>
          <div
            className="space-y-4 text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: proposal.implementation_plan }}
          />
        </section>

        {proposal.document_url && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Supporting Document</h2>
            <div className="flex flex-wrap items-center justify-between p-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#C13C3D] underline">Supporting Document</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                asChild
              >
                <a href={proposal.document_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </section>
        )}

        {userRole === "admin" && proposal.status === "submitted" && (
          <div className="flex flex-col gap-3 pt-4">
            {projectContractExists && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800 font-medium">Contract Already Exists for This Project</p>
                <p className="text-xs text-amber-700 mt-1">
                  A contract has already been generated for this project. You cannot approve this proposal or generate another contract.
                </p>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                className="border-[#C13C3D] text-[#C13C3D] hover:text-[#C13C3D] bg-transparent"
                disabled={isActioning || projectContractExists}
                onClick={() => setShowRejectDialog(true)}
              >
                Reject
              </Button>

              <Button
                className="bg-[#C13C3D] hover:bg-[#A02F30] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowApproveDialog(true)}
                disabled={isActioning || projectContractExists}
                title={projectContractExists ? "A contract already exists for this project" : undefined}
              >
                {isActioning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Approve Proposal"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Contract Already Exists Dialog */}
      <AlertDialog open={showContractExistsDialog} onOpenChange={setShowContractExistsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contract Already Generated</AlertDialogTitle>
            <AlertDialogDescription>
              A contract has already been generated for this project
              {matchedContract?.reference_number ? ` (${matchedContract.reference_number})` : ""}.
              You cannot generate another contract for the same project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push("/proposals")}
              className="bg-[#C13C3D] hover:bg-[#A02F30] text-white"
            >
              Back to Proposals
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this proposal? This action cannot be undone and you will need to resubmit if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleWithdrawProposal}
              disabled={isActioning}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isActioning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Withdrawing...
                </>
              ) : (
                "Yes, Withdraw Proposal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this proposal? This will allow you to generate a contract for the partner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApproveProposal}
              disabled={isActioning}
              className="bg-green-600 hover:bg-green-700"
            >
              {isActioning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                "Yes, Approve Proposal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this proposal? The partner will be able to resubmit a revised proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Rejection Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectProposal}
              className="bg-red-600 hover:bg-red-700"
              disabled={isActioning}
            >
              {isActioning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}