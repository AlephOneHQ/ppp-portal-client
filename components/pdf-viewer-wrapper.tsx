"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface PdfViewerWrapperProps {
  children: React.ReactNode
}

export function PdfViewerWrapper({ children }: PdfViewerWrapperProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading PDF viewer...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
