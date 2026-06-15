import { Suspense } from "react"
import PaymentCompletePage from "@/components/payment-complete"

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PaymentCompletePage />
    </Suspense>
  )
}
