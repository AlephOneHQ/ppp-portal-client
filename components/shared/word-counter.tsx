"use client"

import { cn } from "@/lib/utils"
import { countWords, MAX_WORDS } from "@/lib/utils/wordCount"

interface WordCounterProps {
  /** The current text value of the associated field. */
  value: string | null | undefined
  /** Maximum allowed words. Defaults to 4000. */
  max?: number
  /** id of the field this counter describes, for aria wiring. */
  fieldId?: string
  className?: string
}

/**
 * Real-time word counter displayed beneath a long-text field.
 *
 * Shows the current word count against the maximum in the format
 * "N/4000 words" and updates live as the user types, pastes, or deletes.
 * Exceeding the limit is indicated visually and announced to assistive tech.
 */
export function WordCounter({ value, max = MAX_WORDS, fieldId, className }: WordCounterProps) {
  const count = countWords(value)
  const overLimit = count > max

  return (
    <div
      id={fieldId ? `${fieldId}-word-counter` : undefined}
      className={cn(
        "mt-1 text-sm flex flex-wrap items-center gap-x-2",
        overLimit ? "text-red-600" : "text-muted-foreground",
        className
      )}
      aria-live="polite"
    >
      <span>
        {count}/{max} words
      </span>
      {overLimit && (
        <span className="font-medium">
          You have exceeded the {max}-word limit. Please shorten your response.
        </span>
      )}
    </div>
  )
}
