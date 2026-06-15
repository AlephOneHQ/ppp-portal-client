"use client"

import { sanitizeHTML, isPlainText } from "@/lib/utils/html-sanitizer"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { useEffect, useState } from "react"

interface ContentDisplayProps {
  content: string
  className?: string
  as?: "div" | "p" | "span"
  isLoading?: boolean
}

export function ContentDisplay({
  content,
  className,
  as: Component = "div",
  isLoading = false,
}: ContentDisplayProps) {
  const [processedContent, setProcessedContent] = useState<string>("")

  useEffect(() => {
    if (!content || content.trim() === "") {
      setProcessedContent("")
      return
    }

    const timeoutId = setTimeout(() => {
      setProcessedContent(isPlainText(content) ? content : sanitizeHTML(content))
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [content])

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Spinner className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Loading content...</span>
      </div>
    )
  }

  if (!content || content.trim() === "") return null

  if (isPlainText(content)) {
    return (
      <Component className={cn("whitespace-pre-line", className)}>
        {content}
      </Component>
    )
  }

  return (
    <Component
      className={cn("content-display", className)}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  )
}
