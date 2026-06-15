"use client"

import { useState, useEffect, useCallback } from "react"
import { use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, Shield, CheckCircle, Clock, AlertCircle, Loader2, 
  User, Briefcase, Calendar, Eye 
} from "lucide-react"
import { SignatureCanvas } from "@/components/signature-canvas"
import { ContractTemplate } from "@/components/contract-template"
import { digitalSignaturesAPI } from "@/lib/api/digital-signatures"
import { signatureAPI } from "@/lib/cloudinary"
import { toast } from "sonner"
import { format } from "date-fns"
import Image from "next/image"

// Define types based on the actual API response structure
interface DigitalSignature {
  certified_timestamp: string;
  signer_uuid: string;
  signature_image_url: string;
  signature_data_url: string;
  ip_address: string;
  user_agent: string;
}

interface Contract {
  id?: string;
  title?: string;
  reference_number: string;
  commences_on: string;
  ends_on: string;
  estimated_project_cost: number;
  scope_of_service: string;
  oyntcda_roles: string;
  partner_responsibilities: string;
  capital_structure: string;
  payment_mechanism: string;
  revenue_sharing: string;
  kpis: string;
  slas: string;
  monitoring_and_reporting: string;
  dispute_resolution: string;
  termination_and_exit_clauses: string;
  miscellaneous: string;
  partner_contact_name?: string;
  milestones?: Array<{
    id: string;
    description: string;
    due_date: string;
    status: string;
  }>;
}

interface DocumentSignatureRequest {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_type: string;
  signer_type_display: string;
  signer_designation?: string;
  status: string;
  status_display: string;
  signed_at?: string;
  digital_signature?: DigitalSignature;
}

interface Document {
  id: string;
  contract_title?: string;
  project_title?: string;
  partner_name?: string;
  contract?: Contract;
  signature_requests?: DocumentSignatureRequest[];
}

// This matches the actual API response structure
interface SignatureRequest {
  id: string;
  token_expires_at: string;
  signer_name: string;
  signer_email: string;
  signer_designation?: string;
  signer_type: string;
  signer_type_display: string;
  status: string;
  status_display: string;
  signed_at?: string;
  digital_signature?: DigitalSignature;
  document?: Document;
}

interface ErrorWithMessage {
  message: string;
}

export default function WitnessSigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureComplete, setSignatureComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const loadSignatureRequest = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await digitalSignaturesAPI.getSignatureRequestByToken(token)
      // The API returns the data directly in the response
      if (response.data) {
        setSignatureRequest(response.data as SignatureRequest)
        
        // Check if already signed
        if (response.data.status === "signed") {
          setSignatureComplete(true)
        }
      }
    } catch (error: unknown) {
      console.error("Error loading signature request:", error)
      const errorWithMessage = error as ErrorWithMessage
      setError(errorWithMessage.message || "Invalid or expired signing link")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadSignatureRequest()
  }, [loadSignatureRequest])

  const handleSignatureSubmit = async (signatureDataUrl: string) => {
    try {
      setSigning(true)

      // Upload signature to cloud storage
      toast.info("Uploading signature...")
      const uploadedUrl = await signatureAPI.uploadSignature(signatureDataUrl)

      if (!uploadedUrl || !uploadedUrl.startsWith("http")) {
        throw new Error("Failed to upload signature")
      }

      // Complete signature
      await digitalSignaturesAPI.completeSignature(token, {
        signature_image_url: uploadedUrl,
        signature_data_url: signatureDataUrl,
      })

      toast.success("Signature added successfully!")
      setShowSignatureModal(false)
      setSignatureComplete(true)
      
      // Reload to show updated status
      await loadSignatureRequest()
    } catch (error: unknown) {
      console.error("Error adding signature:", error)
      const errorWithMessage = error as ErrorWithMessage
      toast.error(errorWithMessage.message || "Failed to add signature")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle>Invalid Link</CardTitle>
                <CardDescription>This signing link is not valid</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p>This could happen if:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The link has expired (links are valid for 72 hours)</li>
                <li>The document has already been signed</li>
                <li>The link is incorrect or incomplete</li>
              </ul>
              <p className="mt-4">
                Please contact the person who sent you this link for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!signatureRequest) {
    return null
  }

  const isExpired = new Date(signatureRequest.token_expires_at) < new Date()
  const canSign = !signatureComplete && !isExpired

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 mb-3 sm:mb-4">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold mb-2">Document Signature Request</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            You&apos;ve been invited to sign a contract document
          </p>
        </div>

        {/* Status Banner */}
        {signatureComplete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <span className="font-bold">Signature Complete!</span> You have successfully signed this document.
              Thank you for your participation.
            </AlertDescription>
          </Alert>
        )}

        {isExpired && !signatureComplete && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <span className="font-bold">Link Expired</span> - This signing link has expired. Please contact the
              sender for a new invitation.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Overview</TabsTrigger>
            <TabsTrigger value="document" className="text-xs sm:text-sm py-2">
              <Eye className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Document Preview</span>
              <span className="sm:hidden">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm py-2">
              <Shield className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Security</span>
              <span className="sm:hidden">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
                <CardDescription>Review the details before signing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contract</p>
                      <p className="font-medium">
                        {signatureRequest.document?.contract_title || "Contract Document"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Project</p>
                      <p className="font-medium">
                        {signatureRequest.document?.project_title || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Partner</p>
                      <p className="font-medium">
                        {signatureRequest.document?.partner_name || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expires</p>
                      <p className="font-medium">
                        {format(new Date(signatureRequest.token_expires_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Signer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>You are signing as</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{signatureRequest.signer_name}</p>
                      <p className="text-sm text-muted-foreground">{signatureRequest.signer_email}</p>
                      {signatureRequest.signer_designation && (
                        <p className="text-sm text-muted-foreground">
                          {signatureRequest.signer_designation}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">{signatureRequest.signer_type_display}</Badge>
                </div>

                {signatureRequest.digital_signature && (
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900">Signed</p>
                        <p className="text-sm text-green-700">
                          {format(
                            new Date(signatureRequest.digital_signature.certified_timestamp),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </p>
                        <p className="text-xs text-green-600 mt-1 font-mono">
                          UUID: {signatureRequest.digital_signature.signer_uuid}
                        </p>
                      </div>
                      <div className="relative h-16 w-32">
                        <Image
                          src={signatureRequest.digital_signature.signature_image_url}
                          alt="Signature"
                          fill
                          className="object-contain border border-green-200 rounded bg-white p-2"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sign Button */}
            {canSign && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      By signing this document, you acknowledge that you have reviewed and agree to its
                      contents.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setShowSignatureModal(true)}
                      disabled={signing}
                      className="w-full md:w-auto"
                    >
                      {signing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5 mr-2" />
                          Sign Document
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="document" className="space-y-6">
            {/* Document Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Document</CardTitle>
                <CardDescription>
                  Review the complete contract before signing
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {signatureRequest.document ? (
                  <div className="border rounded-lg bg-white overflow-x-auto">
                    <div className="min-w-[320px]">
                      <ContractTemplate
                        contract={{
                          title: signatureRequest.document.contract?.title || signatureRequest.document.contract_title || "Contract Document",
                          reference_number: signatureRequest.document.contract?.reference_number || "",
                          project_title: signatureRequest.document.project_title || "",
                          partner_name: signatureRequest.document.partner_name || "",
                          partner_contact_name: signatureRequest.document.contract?.partner_contact_name || "",
                          commences_on: signatureRequest.document.contract?.commences_on || "",
                          ends_on: signatureRequest.document.contract?.ends_on || "",
                          estimated_project_cost: signatureRequest.document.contract?.estimated_project_cost || 0,
                          scope_of_service: signatureRequest.document.contract?.scope_of_service || "",
                          oyntcda_roles: signatureRequest.document.contract?.oyntcda_roles || "",
                          partner_responsibilities: signatureRequest.document.contract?.partner_responsibilities || "",
                          capital_structure: signatureRequest.document.contract?.capital_structure || "",
                          payment_mechanism: signatureRequest.document.contract?.payment_mechanism || "",
                          revenue_sharing: signatureRequest.document.contract?.revenue_sharing || "",
                          kpis: signatureRequest.document.contract?.kpis || "",
                          slas: signatureRequest.document.contract?.slas || "",
                          monitoring_and_reporting: signatureRequest.document.contract?.monitoring_and_reporting || "",
                          dispute_resolution: signatureRequest.document.contract?.dispute_resolution || "",
                          termination_and_exit_clauses: signatureRequest.document.contract?.termination_and_exit_clauses || "",
                          miscellaneous: signatureRequest.document.contract?.miscellaneous || "",
                        }}
                        milestones={signatureRequest.document.contract?.milestones || []}
                        partner_contract_signatories={
                          signatureRequest.document.signature_requests
                            ?.filter((req) => req.signer_type === 'partner' || req.signer_type === 'partner_witness')
                            .map((req) => ({
                              id: req.id,
                              name: req.signer_name,
                              email: req.signer_email,
                              role: req.signer_designation || req.signer_type_display,
                              signature_url: req.digital_signature?.signature_image_url,
                              signed_at: req.signed_at,
                            })) || []
                        }
                        admin_contract_signatories={
                          signatureRequest.document.signature_requests
                            ?.filter((req) => req.signer_type === 'admin' || req.signer_type === 'admin_witness')
                            .map((req) => ({
                              id: req.id,
                              name: req.signer_name,
                              email: req.signer_email,
                              role: req.signer_designation || req.signer_type_display,
                              signature_url: req.digital_signature?.signature_image_url,
                              signed_at: req.signed_at,
                            })) || []
                        }
                        showSignatures={true}
                        watermarkLogoUrl="/oyntcda.png"
                        oyoLogoUrl="/icons/oyo-logo.png"
                        logoUrl="/oyntcda.png"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Document content not available for preview</p>
                    <p className="text-sm">Please contact the sender for more information</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Signature Status */}
            {signatureRequest.document?.signature_requests && signatureRequest.document.signature_requests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Signature Status</CardTitle>
                  <CardDescription>Current signing progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {signatureRequest.document.signature_requests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            req.status === 'signed' 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {req.status === 'signed' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{req.signer_name}</p>
                            <p className="text-sm text-muted-foreground">{req.signer_type_display}</p>
                          </div>
                        </div>
                        <Badge variant={req.status === 'signed' ? 'default' : 'secondary'}>
                          {req.status_display}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sign Button */}
            {canSign && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      By signing this document, you acknowledge that you have reviewed and agree to its
                      contents.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setShowSignatureModal(true)}
                      disabled={signing}
                      className="w-full md:w-auto"
                    >
                      {signing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5 mr-2" />
                          Proceed to Sign
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Security Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-900">Digital Signature Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Your signature is certified with a SHA-256 cryptographic hash</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>A qualified timestamp is added (eIDAS, ESIGN & UETA compliant)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>You receive a Unique Signer Identifier (UUID) for verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>All actions are recorded in an immutable audit trail</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Document integrity is verified with QR code and verification code</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            This is a secure signing request from the PPP Portal. If you have any questions or
            concerns, please contact the sender.
          </p>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && signatureRequest && (
        <SignatureCanvas
          open={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSubmit={handleSignatureSubmit}
          signerName={signatureRequest.signer_name}
        />
      )}
    </div>
  )
}