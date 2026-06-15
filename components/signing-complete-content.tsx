"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Home } from "lucide-react"

export default function SigningCompleteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Get query parameters if needed
  const contractId = searchParams.get("contractId")
  const signatureId = searchParams.get("signatureId")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <Card className="max-w-md w-full border-green-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Signature Submitted!</CardTitle>
          <CardDescription>
            Your signature has been successfully submitted to the contract
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-green-800 mb-2">What happens next?</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• The contract administrator will review all signatures</li>
              <li>• The contract will become active once all parties have signed</li>
              {contractId && <li>• Contract ID: {contractId}</li>}
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => router.push("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}