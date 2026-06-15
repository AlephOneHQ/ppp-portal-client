"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

function RedirectHandlerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const redirectUrl = searchParams.get("redirect")
    
    if (redirectUrl) {
      // Decode the redirect URL
      const decodedUrl = decodeURIComponent(redirectUrl)
      
      // Check if this is a signing link
      if (decodedUrl.includes("/contracts/sign/")) {
        // Extract the token from the URL
        const tokenMatch = decodedUrl.match(/\/contracts\/sign\/([^/]+)/)
        if (tokenMatch && tokenMatch[1]) {
          const token = tokenMatch[1]
          // Redirect to the signing page
          router.push(`/sign/${token}`)
          return
        }
      }
      
      // For other redirects, go to the decoded URL
      router.push(decodedUrl)
    } else {
      // No redirect parameter, go to homepage
      router.push("/")
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Redirecting...</p>
      </div>
    </div>
  )
}

export default function RedirectHandlerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <RedirectHandlerContent />
    </Suspense>
  )
}