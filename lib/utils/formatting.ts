// lib/utils/formatting.ts

/**
 * Format a number with comma separators for thousands
 */
export const formatNumberWithCommas = (value: string | number): string => {
  if (!value) return ''
  
  const stringValue = value.toString()
  
  // Remove all non-digit characters except decimal point
  const cleanValue = stringValue.replace(/[^\d.]/g, '')
  
  // Split into whole and decimal parts
  const [whole, decimal] = cleanValue.split('.')
  
  // Format whole number part with commas
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  
  // Combine with decimal part if it exists
  return decimal !== undefined ? `${formattedWhole}.${decimal}` : formattedWhole
}

/**
 * Parse a comma-formatted string back to a plain number string
 */
export const parseCommaFormattedNumber = (value: string): string => {
  if (!value) return ''
  
  // Remove all commas and any non-digit characters except decimal point
  return value.replace(/,/g, '').replace(/[^\d.]/g, '')
}

/**
 * Format currency input with comma separators
 */
export const formatCurrencyInput = (value: string): string => {
  const cleanValue = parseCommaFormattedNumber(value)
  return formatNumberWithCommas(cleanValue)
}

/**
 * Handle currency input change
 */
export const handleCurrencyChange = (
  value: string,
  onChange: (value: string) => void
): void => {
  const cleanValue = parseCommaFormattedNumber(value)
  onChange(cleanValue)
}

/**
 * Formats two ISO date strings into "Month Year - Month Year" format.
 * Example: "2026-04-01", "2027-12-31" → "April 2026 - December 2027"
 */
export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null
): string {
  if (!startDate && !endDate) return "N/A"

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ""
    return date.toLocaleString("en-US", { month: "long", year: "numeric" })
  }

  const start = formatDate(startDate)
  const end = formatDate(endDate)

  if (start && end) return `${start} - ${end}`
  return start || end || "N/A"
}
