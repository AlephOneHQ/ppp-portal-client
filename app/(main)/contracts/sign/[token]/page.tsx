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
import { SignatureInput } from "@/components/contract-signatory-input"
import { toast } from "sonner"
import {
  CheckCircle,
  Loader2,
  FileSignature,
  AlertCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface Signatory {
  id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export default function SignatorySigningPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [signatory, setSignatory] = useState<Signatory | null>(null)
  const [signature, setSignature] = useState("")
  const [signing, setSigning] = useState(false)
  const [verifying, setVerifying] = useState(true)

  /**
   * Verify signing token (TOKEN-ONLY FLOW)
   */
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setVerifying(true)

        const res = await contractsAPI.verifySignToken(token)

        if (!res.success || !res.data) {
          throw new Error("Invalid or expired signing link")
        }

        setSignatory({
          id: res.data.id,
          email: res.data.email,
          role: res.data.role,
          is_active: res.data.is_active,
          created_at: res.data.created_at,
        })
      } catch (error: unknown) {
        console.error("Token verification failed:", error)
        const errorMessage = error instanceof Error ? error.message : "Invalid or expired signing link"
        toast.error(errorMessage)
        router.replace("/")
      } finally {
        setVerifying(false)
      }
    }

    if (token) verifyToken()
  }, [token, router])

  /**
   * Submit signature
   */
  const handleSign = async () => {
    if (!signature) {
      toast.error("Please upload your signature")
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

      await contractsAPI.completeSignWithToken(token, signatureUrl)

      toast.success("Signature submitted successfully")
      router.replace("/contracts/sign/completed")
    } catch (error: unknown) {
      console.error("Signing failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to submit signature"
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
        <h1 className="text-xl font-semibold">Verifying signing link</h1>
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
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileSignature className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Sign Document</h1>
          <p className="text-muted-foreground">
            You have been invited to sign a document electronically.
          </p>

          {signatory?.email && (
            <Badge variant="outline" className="mt-2">
              Signing as {signatory.email}
            </Badge>
          )}
        </div>

        {/* Signature Card */}
        <Card>
          <CardHeader>
            <CardTitle>Add Your Signature</CardTitle>
            <CardDescription>
              Upload your signature image file
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <SignatureInput
              value={signature}
              onChange={setSignature}
              label="Your Signature"
              required
            />

            <Button
              onClick={handleSign}
              disabled={!signature || signing}
              size="lg"
              className="w-full py-6 text-lg"
            >
              {signing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Submit Signature
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Legal Notice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legal Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                By submitting your signature, you confirm that this electronic
                signature is legally binding and equivalent to a handwritten
                signature.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-6 border-t">
          OYNTCDA Contract Management System • Secure Digital Signing
        </div>
      </div>
    </div>
  )
}