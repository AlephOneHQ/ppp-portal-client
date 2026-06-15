"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { contractsAPI } from "@/lib/api/contracts"
import { signatureAPI } from "@/lib/cloudinary"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SignatureInput } from "@/components/contract-signatory-input"
import { toast } from "sonner"
import {
  Loader2,
  Upload,
  QrCode,
  Info,
  AlertCircle,
  Building2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface AdminSignatory {
  id: string
  email: string
  is_active: boolean
  role: string
  created_at: string
}

interface ContractInfo {
  id: string
  title: string
  contract_id: string
  partner_name: string
  contract_summary: string
}

interface VerifyTokenResponse {
  success: boolean
  data?: {
    id: string
    email: string
    role: string
    is_active: boolean
    created_at: string
    contract_id?: string
    contract_title?: string
    partner_name?: string
    contract_summary?: string
  }
}

interface APIError extends Error {
  message: string
}

export default function AdminSigningPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [admin, setAdmin] = useState<AdminSignatory | null>(null)
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null)
  const [signature, setSignature] = useState("")
  const [signing, setSigning] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [activeTab, setActiveTab] = useState<"upload" | "qr">("upload")

  /**
   * Verify admin signing token
   */
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setVerifying(true)

        const res: VerifyTokenResponse = await contractsAPI.verifyAdminSignToken(token)

        if (!res.success || !res.data) {
          throw new Error("Invalid or expired admin signing link")
        }

        setAdmin({
          id: res.data.id,
          email: res.data.email,
          role: res.data.role,
          is_active: res.data.is_active,
          created_at: res.data.created_at,
        })

        // Note: The verifyAdminSignToken endpoint might return contract info
        // If not, we might need a separate endpoint to get contract details
        // For now, we'll show generic info
        setContractInfo({
          id: res.data.contract_id || "N/A",
          title: res.data.contract_title || "Contract Title",
          contract_id: res.data.contract_id || "N/A",
          partner_name: res.data.partner_name || "Partner Name",
          contract_summary: res.data.contract_summary || "No summary available",
        })
      } catch (error: unknown) {
        console.error("Admin token verification failed:", error)
        const errorMessage = error instanceof Error ? error.message : "Invalid or expired admin signing link"
        toast.error(errorMessage)
        router.replace("/")
      } finally {
        setVerifying(false)
      }
    }

    if (token) verifyToken()
  }, [token, router])

  /**
   * Submit admin signature
   */
  const handleSign = async () => {
    if (!signature) {
      toast.error("Please provide a signature")
      return
    }

    setSigning(true)

    try {
      let signatureUrl = signature

      if (signature.startsWith("data:image")) {
        toast.info("Uploading signature...")
        const uploadedUrl = await signatureAPI.uploadSignature(signature)

        if (!uploadedUrl || !uploadedUrl.startsWith("http")) {
          throw new Error("Signature upload failed")
        }

        signatureUrl = uploadedUrl
      }

      await contractsAPI.completeAdminSignWithToken(token, signatureUrl)

      toast.success("Admin signature submitted successfully")
      router.replace(`/contracts/admin-signing/completed?token=${token}`)
    } catch (error: unknown) {
      console.error("Admin signing failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to submit admin signature"
      toast.error(errorMessage)
    } finally {
      setSigning(false)
    }
  }

  /**
   * Loading / verifying screen
   */
  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-semibold">Verifying Admin Signing Link</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Please wait…
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Sign Contract as OYNTCDA Admin</h1>
          <p className="text-muted-foreground">
            You have been invited to sign a contract on behalf of OYNTCDA.
          </p>

          {admin?.email && (
            <Badge variant="outline" className="mt-2 bg-blue-50">
              Signing as OYNTCDA Representative
            </Badge>
          )}
        </div>

        {/* Contract Info Card */}
        {contractInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
              <CardDescription>
                Information about the contract you are signing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contract Title</p>
                  <p className="font-medium">{contractInfo.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="font-medium">{contractInfo.contract_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Partner</p>
                  <p className="font-medium">{contractInfo.partner_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Role</p>
                  <p className="font-medium">OYNTCDA Admin Signatory</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Contract Summary</p>
                  <p className="font-medium">{contractInfo.contract_summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Card */}
        <Card>
          <CardHeader>
            <CardTitle>Add Your Signature</CardTitle>
            <CardDescription>
              Provide your signature to execute the contract
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "upload" | "qr")}
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="upload" className="flex gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Signature
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="pt-6">
                <SignatureInput
                  value={signature}
                  onChange={setSignature}
                  label="Your Official Signature"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  This signature represents OYNTCDA&apos;s official approval
                </p>
              </TabsContent>

              <TabsContent value="qr" className="pt-6">
                <SignatureInput
                  value={signature}
                  onChange={setSignature}
                  label="Your Official Signature"
                  required
                />
                <Alert className="mt-4">
                  <QrCode className="h-4 w-4" />
                  <AlertDescription>
                    Use your mobile device for more precise signature drawing.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> By signing, you confirm that you are authorized 
                  to sign this contract on behalf of OYNTCDA.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSign}
                disabled={!signature || signing}
                size="lg"
                className="w-full py-6 text-lg bg-[#C13C3D] hover:bg-[#C13C3D]/90 text-white"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Signing Contract…
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Sign as OYNTCDA Representative
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legal Notice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legal Authorization</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                By submitting this signature, you confirm that you are duly authorized 
                to execute this contract on behalf of OYNTCDA and that this electronic 
                signature is legally binding.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-6 border-t">
          OYNTCDA Contract Management System • Official Admin Signing Portal
        </div>
      </div>
    </div>
  )
}