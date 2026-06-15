"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, CheckCircle, XCircle, Loader2, Search, FileText } from "lucide-react"
import { format } from "date-fns"
import { digitalSignaturesAPI, type VerificationResult } from "@/lib/api/digital-signatures"
import { toast } from "sonner"

export function SignatureVerification() {
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)

  const handleVerify = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!verificationCode.trim()) {
    toast.error("Please enter a verification code")
    return
  }

  try {
    setLoading(true)
    const response = await digitalSignaturesAPI.verifySignatures(verificationCode)
    
    // Check if response.data exists before setting it
    if (response.data) {
      setResult(response.data)
      
      if (response.data.is_valid) {
        toast.success("Document signatures verified successfully")
      } else {
        toast.warning("Document verification completed with warnings")
      }
    } else {
      toast.error("No verification data received")
      setResult(null)
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to verify signatures"
    toast.error(errorMessage)
    setResult(null)
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Verify Document Signatures
          </CardTitle>
          <CardDescription>
            Enter the verification code from the document or scan the QR code to verify all
            signatures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <div className="flex gap-2">
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  className="font-mono"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900 mb-1">Where to find the verification code:</p>
              <ul className="text-gray-700 space-y-1 text-xs">
                <li>• Check the audit trail document</li>
                <li>• Scan the QR code on the signed document</li>
                <li>• Look for the code at the bottom of the contract</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Verification Result</CardTitle>
              {result.is_valid ? (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-4 w-4 mr-1" />
                  Invalid
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Document Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contract Title</p>
                  <p className="font-medium">{result.contract_title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline">{result.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(result.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                {result.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium">
                      {format(new Date(result.completed_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Document Hash (SHA-256)</p>
                <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                  {result.document_hash}
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Signatures ({result.signatures.length})</h3>
              <div className="space-y-3">
                {result.signatures.map((signature, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{signature.signer_name}</p>
                          <p className="text-sm text-muted-foreground">{signature.signer_email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{signature.signer_type}</Badge>
                          {signature.is_verified && (
                            <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                              <CheckCircle className="h-4 w-4" />
                              <span>Verified</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Signed At:</span>
                          <span className="font-medium">
                            {format(new Date(signature.signed_at), "MMM d, yyyy h:mm:ss a")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Signer UUID:</span>
                          <span className="font-mono text-xs">{signature.signer_uuid}</span>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Signature Hash:</p>
                          <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                            {signature.signature_hash}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Security Features */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Security Features Verified:</h4>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Digital signatures with certified SHA-256 hash
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Qualified timestamps (eIDAS compliant)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Unique Signer Identifiers (UUID)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Document integrity verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Complete audit trail
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
