// components/payment/payment-retry.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"

interface PaymentRetryProps {
  onRetry: () => void
  isRetrying: boolean
  error: string
}

export function PaymentRetry({ onRetry, isRetrying, error }: PaymentRetryProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-3">
        <span>{error}</span>
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="w-fit bg-transparent border-white text-white hover:bg-white hover:text-destructive"
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              Try Again
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}