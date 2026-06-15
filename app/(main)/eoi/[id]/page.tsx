"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Download, ExternalLink, FileText, Loader2, CreditCard, AlertCircle } from "lucide-react"
import { getCurrentUser } from "@/lib/user"
import { eoiAPI } from "@/lib/api/projects"
import type { EOI } from "@/lib/api/projects"
import { toast } from "sonner"
import { PagaRedirectButton } from "@/components/payment/paga-redirect-button"
import { paymentAPI } from "@/lib/api/payments"
import { proposalAPI } from "@/lib/api/proposals"
import type { PagaWidgetParams } from "@/types/payment"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

export default function EOIDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [eoi, setEoi] = useState<EOI | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentParams, setPaymentParams] = useState<PagaWidgetParams | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [hasProposal, setHasProposal] = useState(false)
  const [isCheckingProposal, setIsCheckingProposal] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"

  useEffect(() => {
    const fetchEOI = async () => {
      try {
        const result = await eoiAPI.get(id)
        if (result.success && result.data) {
          setEoi(result.data)

          // Check if proposal exists for this EOI
          await checkProposalExists(id)

          if (userRole === "admin" && result.data.payment_status === "unpaid" && result.data.status === "submitted") {
            await eoiAPI.updateStatus(id, "processing")
            const updatedResult = await eoiAPI.get(id)
            if (updatedResult.success && updatedResult.data) {
              setEoi(updatedResult.data)
            }
          }
        } else {
          toast.error("Failed to load EOI")
          router.push("/eoi")
        }
      } catch (error) {
        console.error("Error fetching EOI:", error)
        toast.error("Error loading EOI")
        router.push("/eoi")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEOI()
  }, [id, router, userRole])

  const checkProposalExists = async (eoiId: string) => {
    setIsCheckingProposal(true)
    try {
      // Call your API to check if proposal exists for this EOI
      const proposalResult = await proposalAPI.getByEOI(id)

      // More explicit type checking to ensure we get a boolean
      const proposalExists = Boolean(
        proposalResult.success &&
        proposalResult.data &&
        proposalResult.data.results &&
        proposalResult.data.results.length > 0,
      )

      setHasProposal(proposalExists)
    } catch (error) {
      console.error("Error checking proposal:", error)
      setHasProposal(false)
      // Don't show toast error here as it's a background check
    } finally {
      setIsCheckingProposal(false)
    }
  }

  const viewPaymentProcess = async () => {
    setTimeout(() => {
      router.push(`/payment/${id}`)
    }, 2000)
  }

  const handleProceedToPayment = async () => {
    setTimeout(() => {
      router.push(`/payment/${id}`)
    }, 2000)
  };

  const handlePaymentSuccess = async () => {
    toast.success("Payment window closed. Verifying status...")
    setPaymentParams(null)

    // Refresh EOI data to get updated payment status
    const result = await eoiAPI.get(id)
    if (result.success && result.data) {
      setEoi(result.data)

      // Check if payment was successful
      if (result.data.payment_status === "paid") {
        toast.success("Payment verified successfully!")
      } else if (result.data.payment_status === "processing") {
        toast.info("Payment is being processed. Please check back in a few minutes.")
      }
    }
  }

  const handlePaymentError = (error: string) => {
    toast.error(`Payment error: ${error}`)
    setPaymentParams(null)
  }

  const handlePaymentClose = () => {
    setShowPaymentModal(false)
    setPaymentParams(null)
    toast.info("Payment cancelled")
  }

  const handleApprove = async () => {
    setIsProcessingAction(true)
    try {
      const result = await eoiAPI.updateStatus(id, "approved")
      if (result.success) {
        toast.success("EOI approved successfully")
        setEoi(result.data || null)
        setShowApproveDialog(false)
      } else {
        toast.error("Failed to approve EOI")
      }
    } catch {
      toast.error("Error approving EOI")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleReject = async () => {
    setIsProcessingAction(true)
    try {
      const result = await eoiAPI.updateStatus(id, "rejected")
      if (result.success) {
        toast.success("EOI rejected")
        setEoi(result.data || null)
        setShowRejectDialog(false)
      } else {
        toast.error("Failed to reject EOI")
      }
    } catch {
      toast.error("Error rejecting EOI")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleWithdraw = async () => {
    setIsProcessingAction(true)
    try {
      // Check again if proposal exists before withdrawing
      await checkProposalExists(id)

      if (hasProposal) {
        toast.error("Cannot withdraw EOI: A proposal already exists for this EOI")
        setShowWithdrawDialog(false)
        return
      }

      const result = await eoiAPI.updateStatus(id, "withdrawn")
      if (result.success) {
        toast.success("EOI withdrawn successfully")
        setEoi(result.data || null)
        setShowWithdrawDialog(false)
      } else {
        toast.error("Failed to withdraw EOI")
      }
    } catch (error) {
      console.error("Error withdrawing EOI:", error)
      toast.error("Error withdrawing EOI")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleResubmit = () => {
    if (!eoi) {
      toast.error("EOI data not available")
      return
    }

    const projectId = eoi.project?.id || eoi.project_id
    if (!projectId) {
      toast.error("Project information not available")
      return
    }

    if (eoi.status === "withdrawn") {
      // Withdrawn EOIs: start a fresh EOI (backend creates a new one)
      router.push(`/projects/${projectId}/express-interest?resubmit=${eoi.id}`)
    } else {
      // Rejected EOIs: use the resubmit endpoint (pre-fills from old data)
      router.push(`/projects/${projectId}/express-interest?resubmit=${eoi.id}`)
    }
  }

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "text-gray-600 bg-gray-50 border-gray-200"
    switch (status) {
      case "draft":
        return "text-gray-600 bg-gray-50 border-gray-200"
      case "submitted":
      case "under_review":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200"
      case "approved":
        return "text-green-600 bg-green-50 border-green-200"
      default:
        return ""
    }
  }

  const getPaymentStatusColor = (status: string | undefined) => {
    if (!status) return "text-gray-600 bg-gray-50 border-gray-200"
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-50 border-green-200"
      case "processing":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "unpaid":
      case "failed":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const formatStatus = (status: string | undefined) => {
    if (!status) return "Unknown"
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Check if withdraw should be allowed
  const canWithdraw = () => {
    if (!eoi) return false

    // Partner can only withdraw if:
    // 1. EOI status is "submitted" or "approved"
    // 2. No proposal exists for this EOI
    // 3. Payment status is not "processing"
    return (
      userRole === "partner" &&
      (eoi.status === "submitted" || eoi.status === "approved") &&
      !hasProposal &&
      eoi.payment_status !== "processing"
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading EOI...</p>
      </div>
    )
  }

  if (!eoi) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p>EOI not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8 md:p-8 w-full">
      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve EOI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this Expression of Interest? This action will allow the partner to
              proceed with submitting their proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isProcessingAction}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessingAction ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                "Yes, Approve EOI"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject EOI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this Expression of Interest? This action cannot be undone and the partner
              will need to resubmit their EOI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessingAction}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessingAction ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                "Yes, Reject EOI"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw EOI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw your Expression of Interest? This action cannot be undone and you will
              need to resubmit if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              disabled={isProcessingAction}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessingAction ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Withdrawing...
                </>
              ) : (
                "Yes, Withdraw EOI"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/eoi" className="hover:text-foreground transition-colors">
          EOI
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">#{eoi.reference_id}</span>
      </div>

      <div className="w-full mx-auto px-4 py-6 max-w-5xl border shadow-sm rounded-lg bg-white space-y-10">
        {/* Header */}
        <div className="border-b pb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-6">EOI for {eoi.project.title}</h1>

          <div className={`grid md:grid-cols-2 gap-4 mb-6 text-sm ${userRole === "partner" ? "lg:grid-cols-3" : ""}`}>
            <div>
              <p className="text-muted-foreground mb-1">Reference ID</p>
              <p className="font-medium">#{eoi.reference_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Date Of Submission</p>
              <p className="font-medium">{new Date(eoi.created_at).toLocaleDateString()}</p>
            </div>
            {userRole === "partner" && (
              <>
                <div>
                  <p className="text-muted-foreground mb-1">Submission Status</p>
                  <Badge
                    variant="outline"
                    className={`text-xs whitespace-nowrap px-3 py-1 rounded-md ${getStatusColor(eoi.status)}`}
                  >
                    {formatStatus(eoi.status)}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {hasProposal && eoi.status !== "rejected" && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                A proposal has already been submitted for this EOI
              </AlertDescription>
            </Alert>
          )}

          {paymentError && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{paymentError}</AlertDescription>
            </Alert>
          )}

          {userRole === "partner" && eoi.status !== "draft" && (
            <div className="flex gap-2 mt-4">
              {eoi.status === "submitted" && (
                <div className="w-full">
                  <Button
                    className="w-full bg-[#C13C3D] capitalize hover:bg-[#A02F30] text-white px-8"
                    onClick={() => router.push(`/eoi/${id}/submit-proposal`)}
                    disabled={eoi.status === "submitted" || hasProposal || isCheckingProposal}
                  >
                    {isCheckingProposal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Checking...
                      </>
                    ) : hasProposal ? (
                      "Proposal Already Submitted"
                    ) : (
                      "Proceed to submit proposal"
                    )}
                  </Button>
                </div>
              )}
              {eoi.status === "approved" && (
                <div className="w-full">
                  <Button
                    className="w-full bg-[#C13C3D] capitalize hover:bg-[#A02F30] text-white px-8"
                    onClick={() => router.push(`/eoi/${id}/submit-proposal`)}
                    disabled={hasProposal || isCheckingProposal}
                  >
                    {isCheckingProposal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Checking...
                      </>
                    ) : hasProposal ? (
                      "Proposal Already Submitted"
                    ) : (
                      "Proceed to submit proposal"
                    )}
                  </Button>
                </div>
              )}
              {(eoi.status === "rejected" || eoi.status === "withdrawn") && (
                <div className="w-full">
                  <Button
                    className="w-full bg-[#C13C3D] capitalize hover:bg-[#A02F30] text-white px-8"
                    onClick={handleResubmit}
                  >
                    {eoi.status === "withdrawn" ? "Express Interest Again" : "Resubmit EOI"}
                  </Button>
                </div>
              )}

              {canWithdraw() && (
                <Button variant="outline" onClick={() => setShowWithdrawDialog(true)} disabled={isCheckingProposal}>
                  {isCheckingProposal ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    "Withdraw EOI"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        {eoi.company_bio && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Bio</h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>{eoi.company_bio}</p>
            </div>
          </section>
        )}


        {/* Interest Letter */}
        {eoi.interest_letter_url && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Interest letter</h2>
            <div className="flex flex-wrap items-center justify-between py-2 rounded-lg bg-card gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#C13C3D] underline">Interest Letter</p>
                  <p className="text-xs text-muted-foreground">Submitted on company letterhead</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                asChild
              >
                <a href={eoi.interest_letter_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </section>
        )}

        {/* Key Personnel */}
        {eoi.key_personnel && eoi.key_personnel.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Key Personnel</h2>
            <div className="flex flex-wrap items-center gap-4">
              {eoi.key_personnel.map((person, index) => (
                <div key={index} className="flex items-center gap-2 p-2">
                  <div className="flex items-center justify-center">{index + 1}</div>
                  <div className="flex gap-1">
                    <p className="font-medium text-sm">{person.name},</p>
                    <p className="text-sm text-muted-foreground">{person.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}


        {/* Experience */}
        {eoi.experience && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Experience</h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p className="whitespace-pre-wrap">{eoi.experience}</p>
            </div>
          </section>
        )}


        {/* Portfolio */}
        {(eoi.portfolio_link || eoi.portfolio_file_url) && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Portfolio</h2>
            <div className="space-y-3">
              {eoi.portfolio_link && (
                <div className="flex flex-wrap gap-2 items-center justify-between p-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-muted">
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <a
                        href={eoi.portfolio_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#C13C3D] underline break-all"
                      >
                        {eoi.portfolio_link}
                      </a>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                    asChild
                  >
                    <a href={eoi.portfolio_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
              {eoi.portfolio_file_url && (
                <div className="flex flex-wrap gap-2 items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#C13C3D] underline">Portfolio Document</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                    asChild
                  >
                    <a href={eoi.portfolio_file_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {eoi.client_reference_url && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Client References</h2>
            <div className="flex flex-wrap items-center justify-between p-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#C13C3D] underline">Client Reference Letter</p>
                  <p className="text-xs text-muted-foreground">Verified client reference documentation</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                asChild
              >
                <a href={eoi.client_reference_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </section>
        )}

        {/* Project Plan */}
        {eoi.project_plan && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Project Plan</h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p className="whitespace-pre-wrap">{eoi.project_plan}</p>
            </div>
          </section>
        )}


        {/* Consortium Details */}
        {eoi.consortium_members && eoi.consortium_members.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Consortium Details</h2>
            <div className="space-y-4">
              {eoi.consortium_members.map((member, index) => (
                <div key={index} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#C13C3D]/10 text-[#C13C3D] font-semibold text-sm">
                      {index + 1}
                    </div>
                    <p className="font-semibold text-base">{member.member_name}</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Role</p>
                      <p className="font-medium">{member.role}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Country</p>
                      <p className="font-medium">{member.country_of_incorporation}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Registration Number</p>
                      <p className="font-medium">{member.registration_number}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {eoi.consortium_agreement_url && (
              <div className="mt-4 flex flex-wrap items-center justify-between p-4 gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#C13C3D] underline">Consortium Agreement</p>
                    <p className="text-xs text-muted-foreground">Signed consortium partnership agreement</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                  asChild
                >
                  <a href={eoi.consortium_agreement_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Financial Information */}
        {eoi.bank_statement_url || eoi.proof_of_funds_url ? (
          <section>
            <h2 className="text-lg font-semibold mb-4">Financial Information</h2>
            <div className="space-y-4">
              {eoi.bank_statement_url && (
                <div>
                  <p className="px-6 text-sm font-medium mb-2">Bank Statements (12 months)</p>
                  <div className="flex flex-wrap gap-2 items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-[#C13C3D] underline">Bank Statement (12 months)</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                      asChild
                    >
                      <a href={eoi.bank_statement_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              {eoi.proof_of_funds_url && (
                <div>
                  <p className="px-6 text-sm font-medium mb-2">Proof of Funds</p>
                  <div className="flex flex-wrap gap-2 items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#C13C3D] underline">Proof of Funds</p>
                        <p className="text-xs text-muted-foreground">Financial capacity verification</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 bg-[#EED8D8] border-[#C13C3D] text-[#C13C3D] hover:bg-[#F7E1E1]"
                      asChild
                    >
                      <a href={eoi.proof_of_funds_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}


        {eoi.miscellaneous && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed bg-muted/20 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{eoi.miscellaneous}</p>
            </div>
          </section>
        )}

        <div className="pt-6 border-t">
          <div className="flex items-center justify-between">
            <div className="text-right text-sm text-muted-foreground">
              <p>Last updated: {new Date(eoi.updated_at).toLocaleString()}</p>
            </div>
            {userRole === "admin" &&
              (eoi.status === "processing" || eoi.status === "submitted") && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-[#C13C3D] text-[#C13C3D] hover:text-[#C13C3D] bg-transparent"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    Reject
                  </Button>
                  <Button
                    className="bg-[#C13C3D] hover:bg--[#C13C3D]/70 text-white"
                    onClick={() => setShowApproveDialog(true)}
                  >
                    Approve Submission
                  </Button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
