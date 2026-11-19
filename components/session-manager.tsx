"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useSessionActivity } from "@/hooks/useSessionActivity"
import { isAuthenticated } from "@/lib/apiConfig"

// Keep in sync with the server-side INACTIVITY_TIMEOUT_MINUTES (30 minutes).
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
// Warn the user this long before the session would expire from inactivity.
const WARNING_BEFORE_MS = 2 * 60 * 1000

/**
 * Mounts the session inactivity heartbeat and shows a non-intrusive warning
 * shortly before the session would expire due to inactivity. The warning does
 * NOT extend the session - only genuine user activity does.
 */
export function SessionManager() {
  useSessionActivity()

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const clearWarningTimer = () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current)
        warningTimerRef.current = null
      }
    }

    const scheduleWarning = () => {
      clearWarningTimer()
      if (!isAuthenticated()) return
      warningTimerRef.current = setTimeout(() => {
        toast.warning(
          "You've been inactive for a while. You'll be signed out soon unless you continue.",
          { duration: 60 * 1000 }
        )
      }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)
    }

    const events = ["mousedown", "keydown", "click", "scroll", "touchstart"]
    const onActivity = () => scheduleWarning()

    events.forEach((evt) =>
      document.addEventListener(evt, onActivity, { passive: true })
    )
    scheduleWarning()

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, onActivity))
      clearWarningTimer()
    }
  }, [])

  return null
}
