"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, DownloadIcon, Info, AlertCircle, CheckCircle } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { contractsAPI } from "@/lib/api/contracts"
import { getCurrentUser } from "@/lib/user"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { signatureAPI } from "@/lib/cloudinary"
import { notificationAPI } from "@/lib/api/notifications"
import { SignatoryForm } from "@/components/signatory-form"

interface ContractData {
  referenceNumber: string
  projectTitle: string
  commencementDate: Date | undefined
  endDate: Date | undefined
  scopeOfService: string
  performanceStandards: string
  oyntcdaRole: string
  partnerName: string
  partnerRole: string
  projectCost: string
  capitalStructure: string
  paymentMechanisms: string
  keyPerformanceIndicators: string
  serviceLevelAgreement: string
  monitoringReporting: string
  disputeResolution: string
  terminationClause: string
  miscellaneous: string
  adminSignature: string
  partnerSignature: string
  submissionDate: Date | undefined
  status: string
  milestones: { id: string; description: string; due_date: string }[]
  adminSignedAt?: string
  partnerSignedAt?: string
  manually_signed_pdf_url?: string
}

interface Signatory {
  id: string;
  full_name: string;
  designation: string;
  email: string;
  status: string;
  token_expires_at: string;
  signed_at?: string;
  created_at: string;
}

interface ContractSignatoriesResponse {
  has_pending_signatories: boolean;
  current_signatories: Signatory[];
  completed_signatories: Signatory[];
  all_signatories_completed: boolean;
}

export default function ViewContractPage() {
  const [contractData, setContractData] = useState<ContractData>({
    referenceNumber: "",
    projectTitle: "",
    commencementDate: undefined,
    endDate: undefined,
    scopeOfService: "",
    performanceStandards: "",
    oyntcdaRole: "",
    partnerName: "",
    partnerRole: "",
    projectCost: "",
    capitalStructure: "",
    paymentMechanisms: "",
    keyPerformanceIndicators: "",
    serviceLevelAgreement: "",
    monitoringReporting: "",
    disputeResolution: "",
    terminationClause: "",
    miscellaneous: "",
    adminSignature: "",
    partnerSignature: "",
    submissionDate: undefined,
    status: "",
    milestones: [],
    adminSignedAt: "",
    partnerSignedAt: "",
    manually_signed_pdf_url: "",
  })

  console.log("Loaded contract data:", contractData)

  const [previewData, setPreviewData] = useState<ContractData>(contractData)
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"
  const [isSigning, setIsSigning] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [hasPartnerSigned, setHasPartnerSigned] = useState(false)
  const [hasAdminSigned, setHasAdminSigned] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const params = useParams()
  const proposalId = params?.id as string
  const router = useRouter()
  const [contractId, setContractId] = useState<string>("")
  const [originalSignatureUrl, setOriginalSignatureUrl] = useState<string>("")
  const [signatoriesValid, setSignatoriesValid] = useState(false);
  const [hasUnsavedSignatoryChanges, setHasUnsavedSignatoryChanges] = useState(false);
  const [pdfDownloadRequired, setPdfDownloadRequired] = useState(false);
  const [allSignatoriesSigned, setAllSignatoriesSigned] = useState(false)
  const [signatoriesData, setSignatoriesData] = useState<ContractSignatoriesResponse | null>(null);
  const [showInviteReminder, setShowInviteReminder] = useState(false);
  const [contractSubmitted, setContractSubmitted] = useState(false);

  // Load contract and signatories
  const loadContractAndSignatories = async () => {
    if (!proposalId) return;

    try {
      // Load contract data
      const response = await contractsAPI.partnerGetByProposal(proposalId);
      if (response.data) {
        const contract = response.data;
        setContractId(contract.id);

        const partnerSignature = contract.partner_signature_url || "";
        const hasValidPartnerSignature = !!(partnerSignature && partnerSignature !== "NIL" &&
          (partnerSignature.startsWith("http") || partnerSignature.startsWith("data:image")));

        const isSubmitted = contract.status === 'submitted' || contract.status === 'under_review' || contract.status === 'approved';
        setContractSubmitted(isSubmitted);

        setContractData({
          referenceNumber: contract.reference_number || "NIL",
          projectTitle: contract.project_title || "NIL",
          commencementDate: contract.commences_on ? new Date(contract.commences_on) : undefined,
          endDate: contract.ends_on ? new Date(contract.ends_on) : undefined,
          scopeOfService: contract.scope_of_service || "NIL",
          performanceStandards: contract.performance_standards || "NIL",
          oyntcdaRole: contract.oyntcda_roles || "NIL",
          partnerName: contract.partner_name || "Partner",
          partnerRole: contract.partner_responsibilities || "NIL",
          projectCost: contract.estimated_project_cost || "NIL",
          capitalStructure: contract.capital_structure || "NIL",
          paymentMechanisms: contract.payment_mechanism || "NIL",
          keyPerformanceIndicators: contract.kpis || "NIL",
          serviceLevelAgreement: contract.slas || "NIL",
          monitoringReporting: contract.monitoring_and_reporting || "NIL",
          disputeResolution: contract.dispute_resolution || "NIL",
          terminationClause: contract.termination_and_exit_clauses || "NIL",
          miscellaneous: contract.miscellaneous || "NIL",
          adminSignature: contract.admin_signature_url || "",
          partnerSignature: partnerSignature,
          submissionDate: contract.submission_date ? new Date(contract.submission_date) : undefined,
          status: contract.status || "draft",
          milestones: contract.milestones || [],
          adminSignedAt: contract.admin_signed_at,
          partnerSignedAt: contract.partner_signed_at,
          manually_signed_pdf_url: contract.manually_signed_pdf_url || "",
        });
        setOriginalSignatureUrl(partnerSignature || "");
        setHasPartnerSigned(hasValidPartnerSignature);
        setHasAdminSigned(!!contract.admin_signature_url);
      }
    } catch (error) {
      console.error("Error loading contract:", error);
      toast.error("Failed to load contract");
    }

    // Load signatories data
    try {
      const signatoriesResponse = await contractsAPI.getContractSignatories(proposalId);
      if (signatoriesResponse.data) {
        const data = signatoriesResponse.data as unknown as ContractSignatoriesResponse;
        setSignatoriesData(data);

        // Set allSignatoriesSigned based on the API response
        setAllSignatoriesSigned(data.all_signatories_completed);

        // Show invitation reminder if contract is submitted but there are pending signatories
        const isSubmitted = contractData.status === 'submitted' || contractData.status === 'under_review';
        if (isSubmitted && data.has_pending_signatories) {
          setShowInviteReminder(true);
        }
      }
    } catch (error) {
      console.warn("Could not load signatories:", error);
      // Continue without signatories data
    }
  };

  // Update the loadContract function
  useEffect(() => {
    loadContractAndSignatories();
  }, [proposalId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewData(contractData);
    }, 5000);

    return () => clearInterval(interval);
  }, [contractData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "submitted":
      case "under_review":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200";
      case "approved":
        return "text-green-600 bg-green-50 border-green-200";
      case "withdrawn":
        return "text-muted-foreground bg-muted border-border";
      default:
        return "";
    }
  };

  const updateField = <K extends keyof ContractData>(field: K, value: ContractData[K]) => {
    setContractData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePdfDownload = async () => {
    try {
      const blob = await contractsAPI.getContractPdf(contractId);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contract_${contractData?.referenceNumber}.pdf`;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Unable to download PDF");
    }
  };

  const canSubmitContract = () => {
    // Check if partner has a valid signature (not placeholder)
    const hasSignature = contractData.partnerSignature &&
      contractData.partnerSignature !== "NIL" &&
      (contractData.partnerSignature.startsWith("http") ||
        contractData.partnerSignature.startsWith("data:image"));

    // Partner can submit even if additional signatory hasn't been added yet
    return hasSignature;
  };

  // Get current additional signatory from signatories data
  const getCurrentAdditionalSignatory = () => {
    if (!signatoriesData) return null;

    // First check current signatories (invited but not signed)
    if (signatoriesData.current_signatories && signatoriesData.current_signatories.length > 0) {
      return signatoriesData.current_signatories[0];
    }

    // Then check completed signatories (already signed)
    if (signatoriesData.completed_signatories && signatoriesData.completed_signatories.length > 0) {
      return signatoriesData.completed_signatories[0];
    }

    return null;
  };

  // Update the contract submission requirements display
  const renderSubmissionRequirements = () => {
    if (userRole !== "partner" || hasPartnerSigned) return null;

    // Check if partner has a valid signature (not placeholder)
    const hasValidSignature = contractData.partnerSignature &&
      contractData.partnerSignature !== "NIL" &&
      (contractData.partnerSignature.startsWith("http") ||
        contractData.partnerSignature.startsWith("data:image"));

    // Get the additional signatory
    const additionalSignatory = getCurrentAdditionalSignatory();
    const hasAdditionalSignatory = !!additionalSignatory;
    const additionalSignatorySigned = !!additionalSignatory?.signed_at;

    return (
      <div className="mb-4 p-4 border rounded-lg bg-muted/20">
        <h3 className="font-medium mb-2">Contract Submission Requirements</h3>
        <div className="space-y-3">
          {/* Step 1: Partner Signature */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${hasValidSignature ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              1
            </div>
            <div className="flex-1">
              <p className="font-medium">Sign the Contract</p>
              <p className="text-sm text-muted-foreground">Add your digital signature above</p>
              {hasValidSignature ? (
                <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                  <Check className="h-3 w-3" />
                  <span>Completed</span>
                </div>
              ) : (
                <div className="mt-2 text-sm text-amber-600">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Add your signature above first
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Submit to OYNTCDA */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gray-100 text-gray-800">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium">Submit to OYNTCDA</p>
              <p className="text-sm text-muted-foreground">
                Submit the contract for OYNTCDA&apos;s review
              </p>
              {hasValidSignature ? (
                <div className="mt-2 text-sm text-blue-600">
                  <Info className="h-3 w-3 inline mr-1" />
                  Ready to submit after you sign
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-500">
                  <Info className="h-3 w-3 inline mr-1" />
                  Available after you sign
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Add Additional Signatory */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${hasAdditionalSignatory ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              3
            </div>
            <div className="flex-1">
              <p className="font-medium">Add Additional Signatory</p>
              <p className="text-sm text-muted-foreground">
                {hasAdditionalSignatory
                  ? `${additionalSignatory.full_name} - ${additionalSignatory.designation}`
                  : "Required: Add another signatory from your organization"
                }
              </p>
              {hasAdditionalSignatory ? (
                <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                  <Check className="h-3 w-3" />
                  <span>Signatory Added</span>
                </div>
              ) : (
                <div className="mt-2 text-sm text-amber-600">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Required: You must add an additional signatory after submission
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Additional Signatory Signature */}
          {hasAdditionalSignatory && (
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${additionalSignatorySigned ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                4
              </div>
              <div className="flex-1">
                <p className="font-medium">Additional Signatory Signs</p>
                <p className="text-sm text-muted-foreground">
                  {additionalSignatorySigned
                    ? `${additionalSignatory.full_name} has signed`
                    : `${additionalSignatory.full_name} will be invited to sign after submission`
                  }
                </p>
                {additionalSignatorySigned && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600">
                      ✓ Both parties have signed. You can download the final contract.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                      onClick={handlePdfDownload}
                    >
                      <DownloadIcon className="h-3 w-3 mr-1" />
                      Download Updated Contract
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Important note about additional signatory requirement */}
        {!hasAdditionalSignatory && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800 font-medium">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Important: Adding an additional signatory is mandatory
            </p>
            <p className="text-xs text-amber-700 mt-1">
              You must add at least one additional signatory from your organization after submitting to OYNTCDA.
              The contract requires signatures from multiple representatives.
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleSubmitContract = async () => {
    if (contractData.status === 'completed') {
      toast.error("This contract is read-only and cannot be modified.");
      return;
    }

    // Check if signature is valid (not placeholder)
    if (!contractData.partnerSignature || contractData.partnerSignature === "NIL") {
      toast.error("Please add your signature before submitting");
      return;
    }

    if (!canSubmitContract()) {
      toast.error("Please complete all requirements before submitting");
      return;
    }

    if (!contractId) {
      toast.error("Contract ID not found");
      return;
    }

    setIsSigning(true);

    try {
      // Upload signature if it's base64
      let signature = contractData.partnerSignature;
      if (signature.startsWith("data:image")) {
        toast.info("Uploading signature...");
        const uploadedUrl = await signatureAPI.uploadSignature(signature);

        if (!uploadedUrl || !uploadedUrl.startsWith("http")) {
          throw new Error("Could not return a valid URL");
        }
        signature = uploadedUrl;
        setContractData((prev) => ({ ...prev, partnerSignature: uploadedUrl }));
        setOriginalSignatureUrl(uploadedUrl);
      }

      if (!signature.startsWith("http")) {
        throw new Error("Signature is not a valid URL after upload.");
      }

      // Submit contract
      await contractsAPI.partnerSign(contractId, signature);

      toast.success("Contract submitted successfully!");
      setShowSubmitDialog(false);
      setContractSubmitted(true);

      // Check if we should show invitation reminder
      if (signatoriesData?.has_pending_signatories) {
        setShowInviteReminder(true);
      }

      // Create notification
      try {
        await notificationAPI.create({
          title: "Contract Signed",
          message: `Contract for proposal ${contractData.referenceNumber} has been signed and submitted.`,
          notification_type: "CONTRACT_SIGNED",
          related_object_type: "contract",
          related_object_id: contractId,
        });
      } catch (error) {
        console.error("Failed to create notification:", error);
      }

      // Reload the contract data
      await loadContractAndSignatories();
    } catch (err: unknown) {
      console.error("Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to sign contract";
      toast.error(errorMessage);
    } finally {
      setIsSigning(false);
    }
  };

  const handleWithdraw = async () => {
    if (!contractId) {
      toast.error("Contract ID not found")
      return
    }
    if (contractData.status === 'completed') {
      toast.error("This contract is read-only and cannot be modified.")
      return
    }

    setIsWithdrawing(true)
    try {
      await contractsAPI.partnerWithdraw(contractId, "User chose to withdraw from contract")
      toast.success("Contract withdrawn successfully")
      window.location.href = "/proposals"
    } catch (error: unknown) {
      console.error("Error withdrawing contract:", error)
      toast.error(error instanceof Error ? error.message : "Failed to sign contract")
    } finally {
      setIsWithdrawing(false)
    }
  };

  // Handle closing the invitation reminder
  const handleCloseInviteReminder = () => {
    setShowInviteReminder(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Submit Contract Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign and submit this contract?
              <ul className="mt-2 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Your signature will be legally binding</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>The contract will be sent to OYNTCDA for their signature</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Once both parties sign, the contract becomes active</span>
                </li>
              </ul>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Please ensure all signatory information is correct before submitting.
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitContract}
              disabled={isSigning}
              className="bg-[#C13C3D] hover:bg-[#A02F30] text-white"
            >
              {isSigning ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Submitting...
                </>
              ) : (
                "Yes, Sign Contract"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          {contractData.status === 'completed' && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                <CheckCircle className="h-4 w-4 text-gray-600" />
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
            <span>#{contractData.referenceNumber}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {userRole === "partner"
              ? "Review the contract details and sign to accept the terms."
              : "View the contract details and partner signature."}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid max-w-6xl mx-auto bg-white rounded-lg shadow font-light">
          <div className="p-4 border-b">
            <div className="grid md:grid-cols-4  items-center gap-4 md:gap-8 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Reference ID</p>
                <p className="font-medium">#{contractData.referenceNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Date of submission</p>
                <p className="font-medium">
                  {contractData.submissionDate
                    ? new Date(contractData.submissionDate).toLocaleDateString("en-US", {
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
                  {contractData.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>

              <div>
                <p className="text-muted-foreground mb-1">View Contract Signing</p>
                <Button
                  size="sm"
                  onClick={() => window.open(`/contracts/${contractId}/sign/`)}
                  disabled={contractData.status === 'completed'}
                  variant={contractData.status === 'completed' ? "outline" : "default"}
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
                  <p className="capitalize text-[#040404]">{contractData.projectTitle}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="uppercase text-sm text-[#444444]">Commences on</p>
                    <p className="flex items-center gap-2 text-[#040404]">
                      <img src="/icons/calendar.svg" alt="calendar" />
                      {contractData.commencementDate
                        ? new Date(contractData.commencementDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : "Not submitted"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="uppercase text-sm text-[#444444]">Ends on</p>
                    <p className="flex items-center gap-2 text-[#040404]">
                      <img src="/icons/calendar.svg" alt="calendar" />
                      {contractData.endDate
                        ? new Date(contractData.endDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : "Not submitted"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <p className="uppercase text-sm text-[#444444]">Scope of service</p>

              <div className="space-y-2 text-[#040404]">{contractData.scopeOfService}</div>
            </section>

            <section>
              <p className="uppercase text-sm text-[#444444]">Performance standards</p>

              <div className="space-y-2 text-[#040404]">{contractData.performanceStandards}</div>
            </section>

            <section>
              <p className="text-xl font-semibold mb-1">Milestones & Deliverables</p>
              <div className="space-y-2 text-[#040404] py-4">
                <div className="flex flex-col mr-4">
                  {contractData.milestones.map((item, index) => (
                    <div key={item.id} className="flex group">
                      <div className="flex flex-col items-center mr-4">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-md bg-[#F6F6F6] flex items-center justify-center border-[#EEEEEF] z-10">
                          <Check className="h-4 w-4 text-[#707070]" />
                        </div>

                        {/* Vertical Line */}
                        {index < contractData.milestones.length - 1 && (
                          <div className="flex-1 border-l border-gray-300 border-dashed" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="pt-2 pb-10 text-sm">
                          {/* Date and Description */}
                          <div className="space-y-2">
                            {/* Date Picker */}
                            <div>
                              <p className="flex items-center gap-2 text-[#444444]">
                                {item.due_date
                                  ? new Date(item.due_date).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                  : "Not submitted"}
                              </p>
                            </div>

                            {/* Description */}
                            <div>
                              <p className="text-[#040404]">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <p className="text-xl font-semibold py-4 mb-1">Roles & Responsibilities</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">OYNTCDA</p>
                  <p>{contractData.oyntcdaRole}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-[#444444]">{contractData.partnerName}</p>
                  <p>{contractData.partnerRole}</p>
                </div>
              </div>
            </section>

            <section>
              <p className="text-xl font-semibold py-4 mb-1">Finance</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Project Cost</p>
                  <p className="text-[#040404]">
                    <span className="">₦</span>
                    {contractData.projectCost}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Capital structure</p>
                  <p className="text-[#040404]">{contractData.capitalStructure}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Payment Mechanisms</p>
                  <p className="text-[#040404]">{contractData.paymentMechanisms}</p>
                </div>
              </div>
            </section>

            <section>
              <p className="text-xl font-semibold py-4 mb-1">Management & Compliance</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Key Performance Indicators</p>
                  <p className="text-[#040404]">{contractData.keyPerformanceIndicators}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Service Level Agreement</p>
                  <p className="text-[#040404]">{contractData.serviceLevelAgreement}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Monitoring & Reporting</p>
                  <p className="text-[#040404]">{contractData.monitoringReporting}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Dispute resolution</p>
                  <p className="text-[#040404]">{contractData.disputeResolution}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Termination & Exit clause</p>
                  <p className="text-[#040404]">{contractData.terminationClause}</p>
                </div>

                <div className="space-y-2">
                  <p className="uppercase text-sm text-[#444444]">Miscellaneous</p>
                  <p className="text-[#040404]">{contractData.miscellaneous}</p>
                </div>
              </div>
            </section>

            {/* Admin view - read only */}
            {userRole === "admin" && (
              <div className="flex justify-end pb-8">
                <Button variant="outline" onClick={() => window.history.back()}>
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}