"use client"

import { SignatureVerification } from "@/components/signature-verification"

export default function VerifySignaturePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Verify Contract Signatures</h1>
          <p className="text-muted-foreground">
            Enter the verification code from your contract document to verify all signatures
          </p>
        </div>
        
        <SignatureVerification />
      </div>
    </div>
  )
}
