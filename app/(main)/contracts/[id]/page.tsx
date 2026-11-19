"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, AlertCircle, PenLine, Clock, FileSearch } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { contractsAPI } from "@/lib/api/contracts"
import type { Contract, ContractMilestone, Signatory } from "@/lib/api/contracts"
import { getCurrentUser } from "@/lib/user"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { projectAPI } from "@/lib/api/projects"
import { formatNumberWithCommas } from "@/lib/utils/formatting"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ContractSignatoriesResponse {
  has_pending_signatories: boolean;
  current_signatories: Signatory[];
  completed_signatories: Signatory[];
  all_signatories_completed: boolean;
}

export default function ViewContractPage() {
  const router = useRouter()
  const [contractData, setContractData] = useState<Contract | null>(null)
  const [adminSignature, setAdminSignature] = useState("")
  const [partnerSignature, setPartnerSignature] = useState("")
  const [partnerSignatories, setPartnerSignatories] = useState<Signatory[]>([])
  const [adminSignatories, setAdminSignatories] = useState<Signatory[]>([])

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"
  const [isSigning, setIsSigning] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [hasPartnerSigned, setHasPartnerSigned] = useState(false)
  const [hasAdminSigned, setHasAdminSigned] = useState(false)
  const params = useParams()
  const proposalId = params?.id as string
  const [contractId, setContractId] = useState<string>("")
  const [projectId, setProjectId] = useState<string>("")
  const [updatingMilestone, setUpdatingMilestone] = useState<string | null>(null)
  const [originalPartnerSigUrl, setOriginalPartnerSigUrl] = useState("")
  const [originalAdminSigUrl, setOriginalAdminSigUrl] = useState("")
  
  // New states for signatory functionality
  const [signatoriesData, setSignatoriesData] = useState<ContractSignatoriesResponse | null>(null);
  const [showInviteReminder, setShowInviteReminder] = useState(false);
  const [contractSubmitted, setContractSubmitted] = useState(false);
  const [loading, setLoading] = useState(true)
  const [contractNotFound, setContractNotFound] = useState(false)

  // Load contract and signatories
  const loadContractAndSignatories = async () => {
    if (!proposalId) return;

    setLoading(true);
    try {
      // Load contract data
      const response = await contractsAPI.partnerGetByProposal(proposalId);
      if (response.data) {
        const contract = response.data;
        setContractId(contract.id);
        setContractData(contract);
        setHasPartnerSigned(!!contract.partner_signature_url);
        setHasAdminSigned(!!contract.admin_signature_url);
        setPartnerSignature(contract.partner_signature_url || "/placeholder.png");
        setAdminSignature(contract.admin_signature_url || "/placeholder.png");
        setProjectId(contract.project_id || "");

        // Check if contract is submitted
        const isSubmitted = contract.status === 'submitted' || 
                           contract.status === 'under_review' || 
                           contract.status === 'pending_admin_signature' ||
                           contract.status === 'approved';
        setContractSubmitted(isSubmitted);
      } else {
        setContractNotFound(true);
      }
    } catch (error) {
      console.error("Error loading contract:", error);
      setContractNotFound(true);
    }

    // Load signatories data
    try {
      const contractIdForSignatories = contractId || (contractData?.id);
      if (contractIdForSignatories) {
        const signatoriesResponse = await contractsAPI.getContractSignatories(contractIdForSignatories);
        if (signatoriesResponse.data) {
          const data = signatoriesResponse.data as unknown as ContractSignatoriesResponse;
          setSignatoriesData(data);

          // Separate partner and admin signatories
          const allSignatories = [
            ...(data.completed_signatories || []),
            ...(data.current_signatories || [])
          ];

          // Assuming partner signatories have different designation or type
          const partnerSignatories = allSignatories.filter(s => 
            !s.designation?.toLowerCase().includes('admin') && 
            !s.designation?.toLowerCase().includes('oyntcda')
          );
          const adminSignatories = allSignatories.filter(s => 
            s.designation?.toLowerCase().includes('admin') || 
            s.designation?.toLowerCase().includes('oyntcda')
          );
          
          setPartnerSignatories(partnerSignatories);
          setAdminSignatories(adminSignatories);

          // Show invitation reminder if contract is submitted but there are pending signatories
          const isSubmitted = contractData?.status === 'submitted' || 
                            contractData?.status === 'under_review' ||
                            contractData?.status === 'pending_admin_signature';
          if (isSubmitted && data.has_pending_signatories) {
            setShowInviteReminder(true);
          }
        }
      }
    } catch (error) {
      console.warn("Could not load signatories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect to use the new function
  useEffect(() => {
    loadContractAndSignatories();
  }, [proposalId, contractId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "submitted":
      case "under_review":
      case "pending_admin_signature":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "rejected":
      case "withdrawn":
        return "text-red-600 bg-red-50 border-red-200"
      case "approved":
        return "text-green-600 bg-green-50 border-green-200"
      case "active":
      case "pending_signature":
        return "text-purple-600 bg-purple-50 border-purple-200"
      case "completed":
        return "text-purple-600 bg-purple-50 border-purple-200"
      default:
        return ""
    }
  }

  const getStatusLabel = (status: string) => {
    if (status === "active" || status === "pending_signature") return "AWAITING SIGNATURE"
    return status.replace(/_/g, " ").toUpperCase()
  }

  const allMilestonesCompleted = Boolean(
    contractData &&
    Array.isArray(contractData.milestones) &&
    contractData.milestones.length > 0 &&
    contractData.milestones.every((m) => m.is_completed)
  );

  const handleProjectCloseOut = async () => {
    if (!projectId) {
      toast.error("Project ID missing");
      return;
    }
    if (contractData?.status === 'completed') {
      toast.error("This contract is read-only and cannot be modified.");
      return;
    }

    try {
      await projectAPI.closeOut(projectId);

      toast.success("Project successfully closed out!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to close out project");
    } finally {
      loadContractAndSignatories(); 
    }
  };

  const handleWithdraw = async () => {
    if (!contractId) {
      toast.error("Contract ID not found")
      return
    }

    setIsWithdrawing(true)
    try {
      await contractsAPI.partnerWithdraw(contractId, "User chose to withdraw from contract")
      toast.success("Contract withdrawn successfully")
      window.location.href = "/proposals"
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Error withdrawing contract:", error)
      toast.error(err.message || "Failed to withdraw contract")
    } finally {
      setIsWithdrawing(false)
    }
  }

  const handleMilestoneToggle = async (milestone: ContractMilestone) => {
    if (!contractId) {
      toast.error("Contract ID not found")
      return
    }
    if (contractData?.status === 'completed') {
      toast.error("This contract is read-only and cannot be modified.");
      return;
    }

    setUpdatingMilestone(milestone.id)
    try {
      await contractsAPI.updateMilestone(contractId, milestone.id, {
        is_completed: !milestone.is_completed,
      })

      // Reload contract to get updated milestones and status
      const response = await contractsAPI.get(contractId)
      if (response.data) {
        setContractData(response.data)
        toast.success(milestone.is_completed ? "Milestone marked as incomplete" : "Milestone marked as complete")
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Error updating milestone:", error)
      toast.error(err.message || "Failed to update milestone")
    } finally {
      setUpdatingMilestone(null)
    }
  }
  
  // Handle closing the invitation reminder
  const handleCloseInviteReminder = () => {
    setShowInviteReminder(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading contract...</p>
      </div>
    )
  }

  if (!contractData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-auto text-center px-6 py-12">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border border-amber-200 mx-auto mb-5">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-[#040404] mb-2">
            {userRole === "partner" ? "Proposal Under Review" : "Contract Not Yet Generated"}
          </h2>
          <p className="text-sm text-[#444444] mb-6 leading-relaxed">
            {userRole === "partner"
              ? "Your proposal is being reviewed. If accepted, a contract will be generated, and you will receive a notification to review and sign it."
              : "No contract has been generated for this proposal yet. Once the proposal is accepted, you can generate a contract from the proposal details page."}
          </p>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left mb-6">
            <p className="text-xs font-medium text-amber-800 mb-1">What happens next?</p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              {userRole === "partner" ? (
                <>
                  <li>The review team evaluates your proposal</li>
                  <li>You will be notified once a decision is made</li>
                  <li>If accepted, a contract will appear here for signing</li>
                </>
              ) : (
                <>
                  <li>Review and approve the proposal</li>
                  <li>Generate a contract from the proposal page</li>
                  <li>The partner will be notified to review and sign</li>
                </>
              )}
            </ul>
          </div>
          <Button variant="outline" onClick={() => router.push("/proposals")}>
            Back to Proposals
          </Button>
        </div>
      </div>
    )
  }

  const canPartnerSign = userRole === "partner" && !hasPartnerSigned
  const canAdminSign = userRole === "admin" && hasPartnerSigned && !hasAdminSigned
  const bothPartiesSigned = contractData.all_signatures_complete ?? (hasPartnerSigned && hasAdminSigned)

  // Contract is read-only when it has been completed (project closed out)
  const isContractReadOnly = contractData.status === 'completed'

  return (
    <div className="min-h-screen bg-background">
      {/* Invitation Reminder Alert - Show after submission */}
      {showInviteReminder && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
          <Alert className="border-amber-200 bg-amber-50 shadow-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <p className="font-medium">Required: Add Additional Signatory</p>
                <p className="text-sm">
                  Your contract has been submitted to OYNTCDA.{" "}
                  <span className="font-medium">You must now add an additional signatory</span> from your organization.
                  This is a mandatory requirement for the contract.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      setShowInviteReminder(false);
                      // Scroll to signatory form
                      document
                        .querySelector("[data-signatory-form]")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Add Signatory Now
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                    onClick={handleCloseInviteReminder}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="mx-auto md:p-4">
        <div className="mb-6">
          {/* Read-only banner for completed/closed contracts */}
          {isContractReadOnly && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                <FileSearch className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">Project Closed</p>
                <p className="text-sm text-gray-500">
                  This project has been closed out. The contract is now in read-only mode and cannot be modified.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Contracts</span>
            <span>›</span>
            <span>#{contractData.reference_number}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {userRole === "partner"
              ? "Review the contract details and sign to accept the terms."
              : "View the contract details and manage milestones."}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid max-w-6xl mx-auto bg-white rounded-lg shadow font-light">
          <div className="p-4 border-b">
            <div className="grid md:grid-cols-4  items-center gap-4 md:gap-8 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Reference ID</p>
                <p className="font-medium">#{contractData.reference_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Date of submission</p>
                <p className="font-medium">
                  {contractData.submission_date
                    ? new Date(contractData.submission_date).toLocaleDateString("en-US", {
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
                  className={`text-xs whitespace-nowrap px-3 py-2 rounded-md ${getStatusColor(contractData.status)}`}
                >
                  {getStatusLabel(contractData.status)}
                </Badge>
              </div>

              <div>
                <p className="text-muted-foreground mb-1">View Contract Signing</p>
                <Button
                  size="sm"
                  onClick={() => window.open(`/contracts/${contractId}/sign/`)}
                  disabled={isContractReadOnly}
                  variant={isContractReadOnly ? "outline" : "default"}
                >
                  View And Sign Contract
                </Button>
              </div>

            </div>
          </div>
          <div className="grid gap-4 p-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Overview</h2>
            </div>

            <section>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Contract Title</p>
                  <p className="capitalize text-[#040404]">{contractData.project_title || contractData.title}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="uppercase text-sm text-[#444444]">Commences on</p>
                    <p className="flex items-center gap-2 text-[#040404]">
                      <img src="/icons/calendar.svg" alt="calendar" />
                      {contractData.commences_on
                        ? new Date(contractData.commences_on).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : "Not set"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="uppercase text-sm text-[#444444]">Ends on</p>
                    <p className="flex items-center gap-2 text-[#040404]">
                      <img src="/icons/calendar.svg" alt="calendar" />
                      {contractData.ends_on
                        ? new Date(contractData.ends_on).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <p className="uppercase text-sm text-[#444444]">Scope of service</p>

              <div className="space-y-2 text-[#040404]">{contractData.scope_of_service}</div>
            </section>

            <section>
              <p className="uppercase text-sm text-[#444444]">Performance standards</p>

              <div className="space-y-2 text-[#040404]">{contractData.performance_standards}</div>
            </section>

            <section>
              <p className="text-xl font-semibold mb-1">Milestones & Deliverables</p>
              <div className="space-y-2 text-[#040404] py-4">
                <div className="flex flex-col mr-4">
                  {contractData.milestones &&
                    contractData.milestones.map((item, index) => (
                      <div key={item.id} className="flex group">
                        <div className="flex flex-col items-center mr-4">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-md flex items-center justify-center border z-10",
                              item.is_completed ? "bg-[#C13C3D]" : "bg-[#F6F6F6] border-[#EEEEEF]",
                            )}
                          >
                            {item.is_completed ? (
                              <Check className="h-5 w-5 text-white" />
                            ) : (
                              <Check className="h-4 w-4 text-[#707070]" />
                            )}
                          </div>

                          {/* Vertical Line */}
                          {index < contractData.milestones!.length - 1 && (
                            <div className="flex-1 border-l border-gray-300 border-dashed" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="pt-2 pb-10 text-sm">
                            {/* Date and Description */}
                            <div className="space-y-2">
                              {/* Date */}
                              <div className="flex items-center justify-between">
                                <p className="flex items-center gap-2 text-[#444444]">
                                  {item.due_date
                                    ? new Date(item.due_date).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                    : "Not set"}
                                </p>

                                {userRole === "admin" && bothPartiesSigned && !isContractReadOnly && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-2 rounded-md">
                                        <Checkbox
                                          checked={item.is_completed}
                                          disabled={updatingMilestone === item.id}
                                          onClick={(e) => e.preventDefault()}
                                          onCheckedChange={() => { }}
                                        />

                                        <span className="text-xs text-muted-foreground">
                                          {item.is_completed ? "Completed" : "Mark as complete"}
                                        </span>
                                      </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {item.is_completed ? "Mark Milestone as Incomplete" : "Complete Milestone"}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {item.is_completed
                                            ? "Are you sure you want to mark this milestone as incomplete? This action will update the contract status if needed."
                                            : "Are you sure you want to mark this milestone as complete? This action will update the contract status if all milestones are completed."}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleMilestoneToggle(item)}
                          disabled={updatingMilestone === item.id}
                        >
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                                )}
                              </div>

                              {/* Description */}
                              <div>
                                <p className="text-[#040404]">{item.description}</p>
                                {item.is_completed && item.completed_at && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Completed on{" "}
                                    {new Date(item.completed_at).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              {userRole === "admin" && allMilestonesCompleted && !isContractReadOnly && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="bg-[#C13C3D] text-white hover:bg-[#A13334]">
                      Close Out Project
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Project Closure</AlertDialogTitle>
                      <AlertDialogDescription>
                        All milestones are completed. Are you sure you want to officially close out this project?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleProjectCloseOut}
                        className="bg-[#C13C3D] text-white hover:bg-[#A13334]"
                      >
                        Confirm Close Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}


            </section>

            <section>
              <p className="text-xl font-semibold py-4 mb-1">Roles & Responsibilities</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">OYNTCDA</p>
                  <p>{contractData.oyntcda_roles}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-[#444444]">{contractData.partner_name}</p>
                  <p>{contractData.partner_responsibilities}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold py-4 mb-1">Finance</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Project Cost</p>
                  <p className="text-[#040404]">
                    <span className="">₦</span>
                    {formatNumberWithCommas(contractData.estimated_project_cost)}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Capital structure</p>
                  <p className="text-[#040404]">{contractData.capital_structure}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Payment Mechanisms</p>
                  <p className="text-[#040404]">{contractData.payment_mechanism}</p>
                </div>

                {contractData?.revenue_sharing && (
                  <div className="space-y-2">
                    <p className="uppercase text-sm text-[#444444]">Revenue Sharing</p>
                    <p className="text-[#040404]">{contractData?.revenue_sharing}</p>
                  </div>
                )}

              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold py-4 mb-1">Management & Compliance</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Key Performance Indicators</p>
                  <p className="text-[#040404]">{contractData.kpis}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Service Level Agreement</p>
                  <p className="text-[#040404]">{contractData.slas}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Monitoring & Reporting</p>
                  <p className="text-[#040404]">{contractData.monitoring_and_reporting}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Dispute resolution</p>
                  <p className="text-[#040404]">{contractData.dispute_resolution}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Termination & Exit clause</p>
                  <p className="text-[#040404]">{contractData.termination_and_exit_clauses}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Miscellaneous</p>
                  <p className="text-[#040404]">{contractData.miscellaneous}</p>
                </div>
              </div>
            </section>

            {/* Sign CTA — shown when the contract is ready to be signed */}
            {!bothPartiesSigned && !isContractReadOnly && (
              <section className="border-t pt-6 mt-2">
                <div className="rounded-lg bg-[#FDF2F2] border border-[#F0C4C4] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#040404]">Ready to sign this contract?</p>
                    <p className="text-sm text-[#444444] mt-1">
                      You have reviewed all the terms. Proceed to the signing step to add your signature.
                    </p>
                  </div>
                  <Button
                    className="bg-[#C13C3D] hover:bg-[#A13334] text-white shrink-0 gap-2"
                    onClick={() => router.push(`/contracts/${contractId}/sign/`)}
                  >
                    <PenLine className="h-4 w-4" />
                    Proceed to Sign
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}