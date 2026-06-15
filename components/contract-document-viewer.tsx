"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Maximize2, Minimize2, Download, FileText, AlertCircle
} from "lucide-react"
import { SignatureCanvas } from "@/components/signature-canvas"
import { ContractTemplate, type ContractData as ContractTemplateData, type Milestone } from "@/components/contract-template"
import { generateContractPDF, type PdfContractData, type DigitalSignature } from "@/lib/pdf-generator"
import { digitalSignaturesAPI } from "@/lib/api/digital-signatures"
import { toast } from "sonner"
import { ContractData } from "@/types/contract"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SignatureRequest {
  id: string
  signer_name: string
  signer_email: string
  signer_type: string
  signer_type_display: string
  signer_designation?: string
  status: string
  status_display: string
  signature_page: number
  signature_x: number
  signature_y: number
  signature_width: number
  signature_height: number
  signing_token: string
  signed_at?: string
  digital_signature?: {
    signer_uuid: string
    signature_image_url: string
    certified_timestamp: string
  }
}

interface ContractDocumentViewerProps {
  contract: ContractData
  signatureRequests: SignatureRequest[]
  currentUserEmail?: string
  currentUserType?: string // Add this to identify if user is partner or admin
  onSignatureComplete?: () => void
  onDownloadPdf?: () => void
  readOnly?: boolean
  logoUrl?: string
  oyoLogoUrl?: string
  watermarkLogoUrl?: string
}

export function ContractDocumentViewer({
  contract,
  signatureRequests,
  currentUserEmail,
  currentUserType,
  onSignatureComplete,
  onDownloadPdf,
  readOnly = false,
  logoUrl = "/oyntcda.png",
  oyoLogoUrl = "/icons/oyo-logo.png",
  watermarkLogoUrl = "/oyntcda.png",
}: ContractDocumentViewerProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [selectedSignatureRequest, setSelectedSignatureRequest] = useState<SignatureRequest | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info("Opening print dialog...")

      // Use browser's native print which is most reliable
      await generateContractPDF(
        contract.title,
        contract.reference_number
      )

      toast.success("Print dialog opened. Save as PDF to download.")
    } catch (error: unknown) {
      console.error("PDF generation error:", error)

      // Fallback to simple text-based PDF
      if (error instanceof Error && error.message?.includes('popup')) {
        toast.error("Please allow popups and try again")
      } else {
        toast.info("Using alternative PDF generation...")
        try {
          const { generateSimplePDF } = await import('@/lib/pdf-generator')
          const contractForPDF: PdfContractData = {
            id: contract.id,
            title: contract.title,
            reference_number: contract.reference_number || '',
            project_title: contract.project_title || '',
            partner_name: contract.partner_name || '',
            commences_on: contract.commences_on || '',
            ends_on: contract.ends_on || '',
            estimated_project_cost: contract.estimated_project_cost || 0,
            scope_of_service: contract.scope_of_service || '',
            oyntcda_roles: contract.oyntcda_roles || '',
            partner_responsibilities: contract.partner_responsibilities || '',
            capital_structure: contract.capital_structure || '',
            payment_mechanism: contract.payment_mechanism || '',
            revenue_sharing: contract.revenue_sharing || '',
            kpis: contract.kpis || '',
            slas: contract.slas || '',
            monitoring_and_reporting: contract.monitoring_and_reporting || '',
            dispute_resolution: contract.dispute_resolution || '',
            termination_and_exit_clauses: contract.termination_and_exit_clauses || '',
            miscellaneous: contract.miscellaneous || '',
          }

          // Convert SignatureRequest[] to DigitalSignature[] for PDF generation
          const signaturesForPDF: DigitalSignature[] = signatureRequests
            .filter(req => req.signed_at) // Only include signed requests
            .map(req => ({
              signer_name: req.signer_name,
              signer_type: req.signer_type_display,
              signed_at: req.signed_at || '',
            }))

          await generateSimplePDF(
            contract.title,
            contractForPDF,
            signaturesForPDF
          )
          toast.success("PDF downloaded successfully")
        } catch (fallbackError) {
          console.error("Fallback PDF error:", fallbackError)
          toast.error("Failed to generate PDF. Please try printing the page instead.")
        }
      }
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSignClick = (signatureRequest: SignatureRequest) => {
    if (readOnly || signatureRequest.status === "signed") {
      return
    }
    setSelectedSignatureRequest(signatureRequest)
    setShowSignatureModal(true)
  }

  const handleSignatureSubmit = async (signatureDataUrl: string) => {
    if (!selectedSignatureRequest) return

    try {
      const token = selectedSignatureRequest.signing_token

      // Use the digitalSignaturesAPI instead of direct fetch
      const response = await digitalSignaturesAPI.completeSignature(token, {
        signature_image_url: signatureDataUrl,
        signature_data_url: signatureDataUrl,
      })

      if (response.data) {
        toast.success("Signature added successfully")
        setShowSignatureModal(false)
        setSelectedSignatureRequest(null)
        onSignatureComplete?.()
      } else {
        throw new Error('Failed to submit signature')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add signature"
      toast.error(errorMessage)
      console.error("Signature submission error:", error)
    }
  }

  const userCanSign = (signatureRequest: SignatureRequest) => {
    return (
      currentUserEmail &&
      signatureRequest.signer_email === currentUserEmail &&
      signatureRequest.status !== "signed" &&
      !readOnly
    )
  }

  const completedSignatures = signatureRequests.filter(req => req.status === "signed")
  const currentUserSignatureRequest = signatureRequests.find(req =>
    currentUserEmail && req.signer_email === currentUserEmail && req.status !== "signed"
  )

  // Separate signature requests by type
  const adminSignatures = signatureRequests.filter(req =>
    req.signer_type === 'admin' ||
    req.signer_type === 'admin_witness'
  )

  const partnerSignatures = signatureRequests.filter(req =>
    req.signer_type === 'partner' ||
    req.signer_type === 'partner_witness'
  )

  // Check if partner and partner's witness have signed (for admin signing restriction)
  const partnerSigned = signatureRequests.some(req =>
    req.signer_type === 'partner' && req.status === 'signed'
  )
  const partnerWitnessSigned = signatureRequests.some(req =>
    req.signer_type === 'partner_witness' && req.status === 'signed'
  )
  const partnerWitnessExists = signatureRequests.some(req =>
    req.signer_type === 'partner_witness'
  )

  // Admin can only sign after partner, partner_witness, AND admin_witness have all signed
  const isAdminUser = currentUserSignatureRequest?.signer_type === 'admin' || currentUserType === 'admin'
  const adminWitnessSigned = signatureRequests.some(req =>
    req.signer_type === 'admin_witness' && req.status === 'signed'
  )
  const adminWitnessExists = signatureRequests.some(req =>
    req.signer_type === 'admin_witness'
  )
  const adminWitnessPending = adminWitnessExists && !adminWitnessSigned

  const canAdminSign = !isAdminUser || (
    partnerSigned &&
    (partnerWitnessExists ? partnerWitnessSigned : true) &&
    adminWitnessSigned
  )

  // Check if current user is partner
  const isPartnerUser = currentUserSignatureRequest?.signer_type === 'partner' || currentUserType === 'partner'

  // Check if partner's witness exists and hasn't signed yet
  const partnerWitnessPending = signatureRequests.some(req =>
    req.signer_type === 'partner_witness' && req.status !== 'signed'
  )

  console.log("Debug Info:", {
    isAdminUser,
    partnerSigned,
    partnerWitnessExists,
    partnerWitnessSigned,
    adminWitnessExists,
    adminWitnessSigned,
    canAdminSign,
    isPartnerUser,
    partnerWitnessPending,
  })

  // Determine if we should show the partner instruction note
  const showPartnerInstruction =
    isPartnerUser &&
    !partnerSigned &&
    partnerWitnessPending

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border-b bg-white shadow-sm gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{contract.title}</h3>
            <Badge variant="outline" className="text-xs mt-1 w-fit">
              {completedSignatures.length} / {signatureRequests.length} signed
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentUserSignatureRequest && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* span wrapper needed so tooltip works on disabled button */}
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      onClick={() => handleSignClick(currentUserSignatureRequest)}
                      disabled={!canAdminSign || (isPartnerUser && !partnerWitnessSigned)}
                      className="bg-[#C13C3D] hover:bg-[#C13C3D]/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Sign Document</span>
                      <span className="sm:hidden">Sign</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                {((!canAdminSign && isAdminUser) || (isPartnerUser && partnerWitnessPending && !partnerSigned)) && (
                  <TooltipContent side="bottom" className="max-w-xs text-center">
                    {isPartnerUser && partnerWitnessPending
                      ? "The invited witness has to sign the contract before you can sign the contract."
                      : adminWitnessPending
                        ? "The invited witness has to sign the contract before you can sign the contract."
                        : "You can only sign after the partner, their witness, and your admin witness have all signed."}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          {onDownloadPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="text-xs sm:text-sm"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {isGeneratingPDF ? "Generating..." : "Download PDF"}
              </span>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="p-2">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="p-2 sm:p-4">
        {/* Partner Instruction Note */}
        {showPartnerInstruction && (
          <Alert className="mb-4 border-amber-500 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-semibold text-sm sm:text-base">Important: Signature Process</AlertTitle>
            <AlertDescription className="text-amber-700 text-sm">
              <p className="mb-2">
                <strong>Before you sign:</strong> Please ensure you have invited your witness to sign the contract.
                The admin will only sign after both you and your witness have completed signing.
              </p>
              <p className="text-xs sm:text-sm">
                If you haven&apos;t sent the witness invitation yet, navigate to the &quot;Witnesses&quot; section to send them an email.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>


      {/* Contract Content with Signatures */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <ContractTemplate
          contract={{
            title: contract.title,
            reference_number: contract.reference_number || '',
            project_title: contract.project_title || '',
            partner_name: contract.partner_name || '',
            partner_contact_name: contract.partner_contact_name || '',
            commences_on: contract.commences_on || '',
            ends_on: contract.ends_on || '',
            estimated_project_cost: contract.estimated_project_cost || 0,
            scope_of_service: contract.scope_of_service || '',
            oyntcda_roles: contract.oyntcda_roles || '',
            partner_responsibilities: contract.partner_responsibilities || '',
            capital_structure: contract.capital_structure || '',
            payment_mechanism: contract.payment_mechanism || '',
            revenue_sharing: contract.revenue_sharing || '',
            kpis: contract.kpis || '',
            slas: contract.slas || '',
            monitoring_and_reporting: contract.monitoring_and_reporting || '',
            dispute_resolution: contract.dispute_resolution || '',
            termination_and_exit_clauses: contract.termination_and_exit_clauses || '',
            miscellaneous: contract.miscellaneous || '',
            status: contract.status,
          } satisfies ContractTemplateData}
          milestones={(contract.milestones as Milestone[]) || []}
          partner_contract_signatories={partnerSignatures.map(req => ({
            id: req.id,
            name: req.signer_name,
            email: req.signer_email,
            role: req.signer_designation || req.signer_type_display,
            signature_url: req.digital_signature?.signature_image_url,
            signed_at: req.signed_at,
          }))}
          admin_contract_signatories={adminSignatures.map(req => ({
            id: req.id,
            name: req.signer_name,
            email: req.signer_email,
            role: req.signer_designation,
            signature_url: req.digital_signature?.signature_image_url,
            signed_at: req.signed_at,
          }))}
          logoUrl={logoUrl}
          oyoLogoUrl={oyoLogoUrl}
          watermarkLogoUrl={watermarkLogoUrl}
          showSignatures={true}
        />
      </div>

      {/* Signature Modal */}
      {showSignatureModal && selectedSignatureRequest && (
        <SignatureCanvas
          open={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSubmit={handleSignatureSubmit}
          signerName={selectedSignatureRequest.signer_name}
        />
      )}
    </div>
  )
}