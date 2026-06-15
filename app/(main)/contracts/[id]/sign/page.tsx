"use client"

import { useState, useEffect, useCallback } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Users, Shield, ArrowLeft } from "lucide-react"
import { ContractDocumentViewer } from "@/components/contract-document-viewer"
import { WitnessInvitationForm } from "@/components/witness-invitation-form"
import { AuditTrailViewer } from "@/components/audit-trail-viewer"
import { ContractSigningSteps } from "@/components/contract-signing-steps"
import { digitalSignaturesAPI, SignatureRequest, SignableDocument } from "@/lib/api/digital-signatures"
import { contractsAPI, Contract as ApiContract } from "@/lib/api/contracts"
import { getCurrentUser } from "@/lib/user"
import { toast } from "sonner"
import { ContractData } from "@/types/contract"

export default function ContractSigningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contractId } = use(params)
  const router = useRouter()
  // Read user from cookie inside state so it's always fresh on mount,
  // preventing stale data from a previously logged-in session.
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const userRole = currentUser?.role || "partner"

  // Re-read the current user from the cookie whenever the contract changes
  // (e.g. after logout → login with a different account).
  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [contractId])

  const [loading, setLoading] = useState(true)
  const [signableDocument, setSignableDocument] = useState<SignableDocument | null>(null)
  const [contract, setContract] = useState<ContractData | null>(null)
  const [activeTab, setActiveTab] = useState("document")

  const loadContractAndDocument = useCallback(async () => {
    try {
      setLoading(true)

      // Load contract details
      const contractResponse = await contractsAPI.get(contractId)
      if (contractResponse.data) {
  const apiContract = contractResponse.data as ApiContract

  const normalizedContract: ContractData = {
    ...apiContract,
    estimated_project_cost: apiContract.estimated_project_cost
      ? Number(apiContract.estimated_project_cost)
      : undefined,
  }

  setContract(normalizedContract)
}

      // Load signable document
      const docResponse = await digitalSignaturesAPI.getSignableDocument(contractId)
      if (docResponse.data) {
        setSignableDocument(docResponse.data)
      }
    } catch (error: unknown) {
      console.error("Error loading contract:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load contract")
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    loadContractAndDocument()
  }, [loadContractAndDocument])

  const handleSignatureComplete = () => {
    toast.success("Signature added successfully!")
    loadContractAndDocument()
  }

  const handleDownloadPdf = async () => {
    try {
      if (signableDocument?.signed_pdf_url) {
        window.open(signableDocument.signed_pdf_url, "_blank")
      } else {
        const blob = await contractsAPI.getContractPdf(contractId)
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `contract_${contract?.reference_number || contractId}.pdf`
        link.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Failed to download PDF:", error)
      toast.error("Unable to download PDF")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm sm:text-base">Loading contract...</p>
        </div>
      </div>
    )
  }

  if (!signableDocument || !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="p-6 sm:p-8 text-center max-w-md w-full">
          <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold mb-2">Contract Not Found</h2>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            The contract you&apos;re looking for doesn&apos;t exist or hasn&apos;t been prepared for signing yet.
          </p>
          <Button onClick={() => router.push("/contracts")} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
        </Card>
      </div>
    )
  }

  const isAdmin = userRole === "admin"
  const witnessType = isAdmin ? "admin_witness" : "partner_witness"

  // Check signing status
  const allSigned = signableDocument.status === "fully_signed"
  const partiallySigned = signableDocument.status === "partially_signed"
  const pendingSigning = signableDocument.status === "pending"

  const reqs = signableDocument.signature_requests ?? []

  // ── Partner-side state ──────────────────────────────────────────────────────
  const partnerReq       = reqs.find((r: SignatureRequest) => r.signer_type === "partner")
  const partnerWitnessReq = reqs.find((r: SignatureRequest) => r.signer_type === "partner_witness")

  const partnerInvited        = !!partnerReq
  const partnerWitnessInvited = !!partnerWitnessReq
  const partnerWitnessSigned  = partnerWitnessReq?.status === "signed"
  const partnerSigned         = partnerReq?.status === "signed"

  // ── Admin-side state ────────────────────────────────────────────────────────
  const adminWitnessReq = reqs.find((r: SignatureRequest) => r.signer_type === "admin_witness")
  const adminReq        = reqs.find((r: SignatureRequest) => r.signer_type === "admin")

  const adminWitnessInvited = !!adminWitnessReq
  const adminWitnessSigned  = adminWitnessReq?.status === "signed"
  const adminSigned         = adminReq?.status === "signed"

  // ── Partner step-tracker counts ─────────────────────────────────────────────
  const partnerSideRequests = reqs.filter(
    (r: SignatureRequest) => r.signer_type === "partner" || r.signer_type === "partner_witness"
  )
  const partnerSideSignedCount = partnerSideRequests.filter((r: SignatureRequest) => r.status === "signed").length
  const partnerSideTotalCount  = partnerSideRequests.length || 2

  // ── Admin step-tracker counts ───────────────────────────────────────────────
  const adminSideRequests = reqs.filter(
    (r: SignatureRequest) => r.signer_type === "admin" || r.signer_type === "admin_witness"
  )
  const adminSideSignedCount = adminSideRequests.filter((r: SignatureRequest) => r.status === "signed").length
  const adminSideTotalCount  = adminSideRequests.length || 2

  // Partners must have fully signed before admin can invite their witness
  const allPartnersSigned = !!partnerSigned && !!partnerWitnessSigned

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/contracts")}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold truncate">{signableDocument.contract_title}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {signableDocument.project_title}
                  </p>
                  <Badge 
                    variant={allSigned ? "default" : partiallySigned ? "secondary" : "outline"}
                    className="text-xs w-fit"
                  >
                    {allSigned ? "Fully Signed" : partiallySigned ? "Partially Signed" : pendingSigning ? "Pending Signatures" : "Not Ready for Signing"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className={`grid w-full max-w-2xl mx-auto h-auto ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="document" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span>Document</span>
            </TabsTrigger>
            <TabsTrigger value="witnesses" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span>Witnesses</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="audit" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <Shield className="h-4 w-4" />
                <span>Audit Trail</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Document Tab */}
          <TabsContent value="document" className="space-y-4 sm:space-y-6">
            {/* Step tracker — partner only, while not fully signed */}
            {!isAdmin && !allSigned && (
              <ContractSigningSteps
                witnessInvited={partnerWitnessInvited}
                witnessSigned={partnerWitnessSigned}
                partnerSigned={!!partnerSigned}
                signedCount={partnerSideSignedCount}
                totalCount={partnerSideTotalCount}
              />
            )}

            {/* Step tracker — admin only, while not fully signed */}
            {isAdmin && !allSigned && (
              <ContractSigningSteps
                isAdmin
                partnerInvited={partnerInvited}
                partnerWitnessInvited={partnerWitnessInvited}
                partnerWitnessSigned={partnerWitnessSigned}
                partnerSigned={!!partnerSigned}
                adminWitnessInvited={adminWitnessInvited}
                adminWitnessSigned={adminWitnessSigned}
                adminSigned={adminSigned}
                signedCount={adminSideSignedCount}
                totalCount={adminSideTotalCount}
              />
            )}

            <Card className="overflow-hidden">
              <div className="h-[60vh] sm:h-[calc(100vh-250px)]">
                <ContractDocumentViewer
                  contract={contract}
                  signatureRequests={signableDocument.signature_requests || []}
                  currentUserEmail={currentUser?.email}
                  onSignatureComplete={handleSignatureComplete}
                  onDownloadPdf={handleDownloadPdf}
                  readOnly={allSigned}
                  logoUrl="/oyntcda.png"
                  oyoLogoUrl="/icons/oyo-logo.png"
                />
              </div>
            </Card>

            {/* Security Info */}
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Shield className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-base sm:text-lg mb-2">Digital Signature Security</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This document uses advanced digital signature technology to ensure authenticity and integrity.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium">Certified Hash</p>
                        <p className="text-muted-foreground text-xs sm:text-sm">SHA-256 cryptographic verification</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium">Qualified Timestamp</p>
                        <p className="text-muted-foreground text-xs sm:text-sm">eIDAS compliant timestamping</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium">Unique Signer ID</p>
                        <p className="text-muted-foreground text-xs sm:text-sm">UUID for signature validation</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium">QR Verification</p>
                        <p className="text-muted-foreground text-xs sm:text-sm">Scan to verify authenticity</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Witnesses Tab */}
          <TabsContent value="witnesses" className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {/* Admin: lock invite form until all partners have signed */}
              {isAdmin && !allPartnersSigned ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold text-blue-900">Witness Invitation Locked</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    You can only invite an admin witness after the partner and their witness have both signed the contract.
                  </p>
                </div>
              ) : (
                <WitnessInvitationForm
                  contractId={contractId}
                  witnessType={witnessType}
                  onWitnessInvited={loadContractAndDocument}
                  existingWitness={
                    reqs.find(
                      (req: SignatureRequest) => req.signer_type === witnessType
                    ) || null
                  }
                />
              )}

              {/* Current Witnesses */}
              <Card className="p-4 sm:p-6">
                <h3 className="font-semibold text-base sm:text-lg mb-4">Current Witnesses</h3>
                <div className="space-y-3">
                  {reqs
                    .filter((req: SignatureRequest) =>
                      req.signer_type === "admin_witness" || req.signer_type === "partner_witness"
                    )
                    .map((witness: SignatureRequest) => {
                      // Partners see admin witnesses as anonymous
                      const isAdminWitness = witness.signer_type === "admin_witness"
                      const displayName  = !isAdmin && isAdminWitness ? "Admin Witness" : witness.signer_name
                      const displayEmail = !isAdmin && isAdminWitness ? null : witness.signer_email

                      return (
                        <div key={witness.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 border rounded-lg gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{displayName}</p>
                            {displayEmail && (
                              <p className="text-sm text-muted-foreground truncate">{displayEmail}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {witness.signer_type_display}
                            </p>
                          </div>
                          <Badge
                            variant={witness.status === "signed" ? "default" : "secondary"}
                            className="w-fit shrink-0"
                          >
                            {witness.status_display}
                          </Badge>
                        </div>
                      )
                    })}
                  {!reqs.some((req: SignatureRequest) =>
                    req.signer_type === "admin_witness" || req.signer_type === "partner_witness"
                  ) && (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm sm:text-base">No witnesses invited yet</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Info Card */}
            <Card className="p-4 sm:p-6 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">About Witnesses</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 shrink-0">•</span>
                  <span>Witnesses do not need portal access to sign</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 shrink-0">•</span>
                  <span>They receive a secure email with a signing link</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 shrink-0">•</span>
                  <span>Links are valid for 72 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 shrink-0">•</span>
                  <span>All signatures are digitally certified and tracked</span>
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab — admin only */}
          {isAdmin && (
            <TabsContent value="audit" className="space-y-4 sm:space-y-6">
              <AuditTrailViewer contractId={contractId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}