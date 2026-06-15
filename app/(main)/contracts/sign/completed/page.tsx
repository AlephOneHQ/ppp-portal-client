"use client"

import { Suspense } from "react"
import SigningCompleteContent from "@/components/signing-complete-content"

export default function SigningCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <div className="max-w-md w-full border border-green-200 rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <div className="h-6 w-6 text-green-600 animate-pulse">⌛</div>
            </div>
            <p className="text-muted-foreground">Loading signature details...</p>
          </div>
        </div>
      </div>
    }>
      <SigningCompleteContent />
    </Suspense>
  )
}