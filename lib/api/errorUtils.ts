/**
 * Extracts a human-readable error message from the backend error response.
 *
 * Backend error shape:
 * {
 *   "message": "Validation error",
 *   "extra": {
 *     "fields": { "status": ["Cannot delete project..."] },
 *     "non_field_errors": ["Some error"]
 *   }
 * }
 *
 * Priority:
 * 1. First message from extra.fields (any field)
 * 2. First message from extra.non_field_errors
 * 3. Top-level message
 * 4. Fallback string
 */
export function extractErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  const err = error as {
    response?: {
      data?: {
        message?: string
        extra?: {
          fields?: Record<string, string[]>
          non_field_errors?: string[]
        }
      }
    }
    message?: string
  }

  const data = err?.response?.data
  if (!data) return err?.message || fallback

  const fields = data.extra?.fields
  if (fields) {
    const firstField = Object.values(fields)[0]
    if (Array.isArray(firstField) && firstField.length > 0) {
      return firstField[0]
    }
  }

  const nonField = data.extra?.non_field_errors
  if (Array.isArray(nonField) && nonField.length > 0) {
    return nonField[0]
  }

  return data.message || err?.message || fallback
}
