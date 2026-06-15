// app/api/paga/get-redirect/[sessionId]/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/redis"

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Retrieve session from store
    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 404 })
    }

    // Generate the actual Paga redirect URL server-side
    const baseUrl = session.checkout_base_url
    const pagaParams = new URLSearchParams({
      public_key: session.public_key,
      email: session.email,
      amount: session.amount,
      currency: session.currency,
      payment_reference: session.payment_reference,
      charge_url: encodeURIComponent(session.charge_url),
      callback_url: encodeURIComponent(session.callback_url),
      mode: "redirect",
      version: "2.0",
    })

    const redirectUrl = `${baseUrl}/?${pagaParams.toString()}`

    return NextResponse.json({
      success: true,
      redirectUrl,
    })
  } catch (error) {
    console.error("Error getting redirect URL:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}