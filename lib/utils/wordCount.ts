/**
 * Shared word-counting rules for long-text fields.
 *
 * Words are counted as sequences of non-whitespace characters separated by
 * whitespace. Leading, trailing, and repeated whitespace do not add to the
 * count. These rules must match the server-side implementation so client and
 * server validation agree.
 */

export const MAX_WORDS = 4000

export function countWords(text: string | null | undefined): number {
  if (!text) return 0
  const trimmed = text.trim()
  if (trimmed === "") return 0
  return trimmed.split(/\s+/).length
}

export function isWithinWordLimit(
  text: string | null | undefined,
  max: number = MAX_WORDS
): boolean {
  return countWords(text) <= max
}
