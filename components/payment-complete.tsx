"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import paymentAPI from "@/lib/api/payments"
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import eoiAPI from "@/lib/api/eoi"

export default function PaymentCompletePage() {
  const router = useRouter()
  const params = useSearchParams()

  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading")
  const [eoiId, setEoiId] = useState<string | null>(null)

  // NEW: Button should be disabled until EOI update finishes
  const [eoiUpdateDone, setEoiUpdateDone] = useState(false)

  const statusCode = params.get("status_code")
  const paymentReference = params.get("charge_reference") ?? undefined

  const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 } }

  useEffect(() => {
    if (!paymentReference || statusCode === null) {
      toast.error("Invalid callback URL.")
      return router.replace("/eoi")
    }

    verifyPayment()
  }, [paymentReference, statusCode])

  const verifyPayment = async () => {
    try {
      // Find payment
      const list = await paymentAPI.list({ payment_reference: paymentReference })

      if (!list.success || !list.data?.results?.length)
        throw new Error("Payment record not found.")

      const payment = list.data.results[0]

      if (!payment?.eoi_id)
        throw new Error("Missing linked EOI.")

      const eoiId = payment.eoi_id
      setEoiId(eoiId)

      const code = Number(statusCode)

      // SUCCESS
      if (code === 0) {
        await eoiAPI.update(eoiId, { payment_status: "paid" })
        setStatus("success")
        setEoiUpdateDone(true)   // 🔥 Backend update complete → enable button
        toast.success("Payment successful 🎉")
        return
      }

      // PENDING
      if (code === 2) {
        await eoiAPI.update(eoiId, { payment_status: "unpaid" })
        setStatus("pending")
        setEoiUpdateDone(true)   // 🔥 EOI updated, even if pending
        toast.info("Payment is pending…")
        return
      }

      // FAILED
      await eoiAPI.update(eoiId, { payment_status: "unpaid" })
      setStatus("failed")
      setEoiUpdateDone(true)     // 🔥 Update still completed
      toast.error("Payment failed.")

    } catch (err) {
      console.error(err)
      setStatus("failed")
      toast.error("Could not verify payment.")

      setTimeout(() => router.replace("/eoi"), 2600)
    }
  }

  const goToEoi = async () => {
    if (!eoiId) return
    router.push(`/eoi/${eoiId}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <AnimatePresence mode="wait">

        {status === "loading" && (
          <motion.div key="loading" {...fadeIn} className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Finalizing Payment…</h2>
            <p className="text-muted-foreground">
              Please wait while we confirm your transaction.
            </p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div key="success" {...fadeIn} className="space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-semibold text-green-700">Payment Successful 🎉</h2>

            <Button
              className="w-full bg-[#C13C3D] hover:bg-[#A02F30] text-white px-8"
              onClick={goToEoi}
              disabled={!eoiUpdateDone}     // 🔥 Disable until backend done
            >
              {eoiUpdateDone ? "Go To EOI" : "Updating…"}
            </Button>
          </motion.div>
        )}

        {status === "pending" && (
          <motion.div key="pending" {...fadeIn} className="space-y-4">
            <Clock className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-semibold text-yellow-600">Payment Pending</h2>

            <Button
              className="w-full bg-[#C13C3D] hover:bg-[#A02F30] text-white px-8"
              onClick={goToEoi}
              disabled={!eoiUpdateDone}
            >
              {eoiUpdateDone ? "Go To EOI" : "Updating…"}
            </Button>
          </motion.div>
        )}

        {status === "failed" && (
          <motion.div key="failed" {...fadeIn} className="space-y-4">
            <XCircle className="h-12 w-12 text-red-600 mx-auto" />
            <h2 className="text-xl font-semibold text-red-600">Payment Failed</h2>

            <Button
              className="w-full bg-[#C13C3D] hover:bg-[#A02F30] text-white px-8"
              onClick={goToEoi}
              disabled={!eoiUpdateDone}
            >
              {eoiUpdateDone ? "Go To EOI" : "Updating…"}
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
