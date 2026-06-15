"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PagaRedirectButtonProps {
  publicKey: string
  amount: string
  email: string
  currency?: string
  paymentReference: string
  callbackUrl?: string
  chargeUrl?: string
  phoneNumber?: string
  displayImage?: string
  fundingSources?: string
  isTestMode?: boolean
  onSuccess?: () => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

export function PagaRedirectButton({
  publicKey,
  amount,
  email,
  currency = "NGN",
  paymentReference,
  callbackUrl,
  chargeUrl,
  phoneNumber,
  displayImage,
  fundingSources,
  onSuccess,
  onError,
  disabled = false,
  className,
}: PagaRedirectButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_PAGA_BASE_URL

  const handlePayment = () => {
    try {
      setIsLoading(true)

      // Build Paga checkout URL

      const params = new URLSearchParams({
        public_key: publicKey,
        amount: amount,
        currency: currency,
        payment_reference: paymentReference,
        email: email,
      })

      // Add optional parameters
      if (callbackUrl) params.append("callback_url", callbackUrl)
      if (chargeUrl) params.append("charge_url", chargeUrl)
      if (phoneNumber) params.append("phone_number", phoneNumber)
      if (displayImage) params.append("display_image", displayImage)
      if (fundingSources) params.append("funding_sources", fundingSources)

      const checkoutUrl = `${baseUrl}?${params.toString()}`

      console.log("[v0] Opening Paga checkout:", checkoutUrl)

      // Open in new tab
      const paymentWindow = window.open(checkoutUrl, "_blank", "width=600,height=700")

      if (!paymentWindow) {
        throw new Error("Failed to open payment window. Please allow popups for this site.")
      }

      // Monitor the payment window
      const checkWindowClosed = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(checkWindowClosed)
          setIsLoading(false)

          // Callback success when window closes
          // In production, you should verify payment status via webhook/callback
          onSuccess?.()
        }
      }, 1000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initiate payment"
      console.error("[v0] Payment error:", error)

      toast.error(errorMessage || "Payment Error")

      onError?.(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handlePayment} disabled={disabled || isLoading} className={className} size="lg">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        "Pay with Paga"
      )}
    </Button>
  )
}
