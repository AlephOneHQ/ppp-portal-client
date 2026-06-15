"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"

import paymentAPI from "@/lib/api/payments"
import { Button } from "@/components/ui/button"

import { Loader2, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react"
import { PaymentProgress } from "@/components/payment/payment-progress"
import { AnimatedCheck } from "@/components/ui/animated-check"
import { fireConfetti } from "@/components/ui/confetti"

import { PagaRedirectButton } from "@/components/payment/paga-redirect-button"
import type { PagaWidgetParams } from "@/types/payment"

// ----------------------------------
// PAYMENT STATUS TYPE
// ----------------------------------
type PaymentStatus = "idle" | "pending" | "verifying" | "paid" | "failed"

// ----------------------------------
// MAP EOI.payment_status → UI payment state
// ----------------------------------
function translateEoiStatus(eoiStatus: string | undefined): PaymentStatus {
  switch (eoiStatus) {
    case "paid":
      return "paid"
    case "processing":
    case "pending":
      return "pending"
    default:
      return "failed"
  }
}

export default function EoiPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { eoiId } = useParams() as { eoiId: string }

  const [loading, setLoading] = useState(false)
  const [initiated, setInitiated] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [widgetParams, setWidgetParams] = useState<PagaWidgetParams | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")

  // ----------------------------------
  // Load existing payment & EOI payment_status
  // ----------------------------------
  const loadPaymentStatus = async () => {
    const res = await paymentAPI.getByEoiId(eoiId)
    if (!res.success || !res.data?.results?.length) return

    const payment = res.data.results[0]
    setPaymentId(payment.payment_reference)

    const status = translateEoiStatus(payment.eoi?.payment_status)
    setPaymentStatus(status)

    if (status === "paid") fireConfetti()
  }

  useEffect(() => {
    loadPaymentStatus()
  }, [eoiId])

  // ----------------------------------
  // Handle redirect callback from Paga
  // ----------------------------------
  useEffect(() => {
    const statusCode = searchParams.get("status_code")
    const paymentRef = searchParams.get("payment_reference") || searchParams.get("charge_reference")

    if (paymentRef && statusCode) {
      refreshFromDatabase()
    }
  }, [searchParams])

  // ----------------------------------
  // Always refresh status from EOI table
  // ----------------------------------
  const refreshFromDatabase = async () => {
    toast.info("Updating payment status...")
    setPaymentStatus("verifying")

    const res = await paymentAPI.getByEoiId(eoiId)
    if (!res.success || !res.data?.results?.length) {
      setPaymentStatus("failed")
      return toast.error("Payment not found.")
    }

    const payment = res.data.results[0]
    const translated = translateEoiStatus(payment.eoi?.payment_status)

    setPaymentStatus(translated)

    if (translated === "paid") {
      fireConfetti()
      toast.success("Payment confirmed!")
    } else if (translated === "pending") {
      toast.info("Payment still pending…")
    } else {
      toast.error("Payment failed.")
    }
  }

  // ----------------------------------
  // Triggered when Paga popup closes
  // ----------------------------------
  const handlePaymentSuccess = async () => {
    await refreshFromDatabase()
  }

  // ----------------------------------
  // User clicks “Refresh Status”
  // ----------------------------------
  const verifyExistingPayment = async () => {
    await refreshFromDatabase()
  }

  // ----------------------------------
  // Start a new payment
  // ----------------------------------
  const initiatePayment = async () => {
    if (paymentStatus === "pending") {
      return toast.info("A payment is still pending. Refresh to continue.")
    }

    setLoading(true)
    setPaymentStatus("pending")

    const res = await paymentAPI.initiate(eoiId)

    if (!res.success || !res.data) {
      setLoading(false)
      setPaymentStatus("failed")
      return toast.error("Payment initiation failed.")
    }

    setWidgetParams(res.data.paga_widget_params)
    setPaymentId(res.data.payment_id)
    setInitiated(true)
    setLoading(false)

    toast.success("Payment session created.")
  }

  // ----------------------------------
  // Derived UI flags
  // ----------------------------------
  const paid = paymentStatus === "paid"
  const pending = paymentStatus === "pending" || paymentStatus === "verifying"
  const failed = paymentStatus === "failed"

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EOI Payment</h1>
          <p className="text-muted-foreground">Complete your Expression of Interest payment.</p>
        </div>
      </div>

      <PaymentProgress status={paymentStatus} />

      {/* SUCCESS VIEW */}
      {paid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-white border rounded-xl text-center"
        >
          <p className="flex justify-center"><AnimatedCheck /></p>
          <h2 className="text-xl text-green-700 mt-4">Payment successful!</h2>

          <Button className="mt-6 w-full" onClick={() => router.push(`/eoi/${eoiId}`)}>
            Continue
          </Button>
        </motion.div>
      )}

      {/* PENDING VIEW */}
      {pending && !initiated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6 bg-white border rounded-xl shadow-sm text-center space-y-4"
        >
          <h2 className="text-lg text-[#C13C3D]">Payment Pending Verification</h2>

          <Button className="w-full" variant="outline" onClick={verifyExistingPayment}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
          </Button>

          {failed && (
            <p className="text-red-600 text-sm flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Payment failed — you can try again.
            </p>
          )}
        </motion.div>
      )}

      {/* INITIATE PAYMENT */}
      {!paid && !pending && (
        <>
          <div className="p-6 bg-muted/50 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-lg">How it works</h3>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Create a secure payment session</li>
              <li>• Complete payment on Paga</li>
              <li>• We update your payment status automatically</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold mb-2">Start Payment</h3>
            <Button className="w-full" onClick={initiatePayment} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  Preparing…
                </>
              ) : (
                "Initiate Payment"
              )}
            </Button>
          </div>
        </>
      )}

      {/* PAYMENT SUMMARY */}
      {initiated && widgetParams && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-semibold text-lg">Payment Summary</h3>
          <p>Amount: ₦{Number(widgetParams.amount).toLocaleString()}</p>
          <p>Reference: {widgetParams.payment_reference}</p>

          <PagaRedirectButton
            publicKey={widgetParams.public_key}
            amount={widgetParams.amount}
            email={widgetParams.email}
            currency={widgetParams.currency}
            paymentReference={widgetParams.payment_reference}
            callbackUrl={widgetParams.callback_url}
            chargeUrl={widgetParams.charge_url}
            onSuccess={handlePaymentSuccess}
            onError={() => toast.error("Payment popup failed")}
          />
        </div>
      )}
    </div>
  )
}
