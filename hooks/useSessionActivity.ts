"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { api, isAuthenticated } from "@/lib/apiConfig"

/**
 * Session inactivity heartbeat.
 *
 * The server enforces a 30-minute inactivity timeout by tracking the last
 * qualifying activity per session. Most deliberate API calls already carry the
 * `X-User-Activity` header (see lib/apiConfig), which resets the timer. This
 * hook covers the remaining case: a user actively interacting with the UI
 * (clicks, typing, scrolling, navigation) without triggering an API call.
 *
 * On qualifying DOM activity it sends a lightweight, debounced heartbeat so the
 * server resets the timer. Background processes (polling, auto-refresh) do not
 * call this, so they never extend the session.
 */

// Only send a heartbeat at most once per this interval, to avoid spamming the
// server on every keystroke/mouse move while still keeping the timer fresh.
const HEARTBEAT_THROTTLE_MS = 60 * 1000 // 1 minute

export function useSessionActivity() {
  const pathname = usePathname()
  const lastPingRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === "undefined") return

    const sendHeartbeat = () => {
      if (!isAuthenticated()) return
      const now = Date.now()
      if (now - lastPingRef.current < HEARTBEAT_THROTTLE_MS) return
      lastPingRef.current = now

      // Explicitly a user-activity request; omit backgroundRequest so the
      // X-User-Activity header is attached and the server resets the timer.
      api.post("/auth/session/activity/", {}).catch(() => {
        // Errors (including 401 on an expired session) are handled by the
        // global response interceptor.
      })
    }

    // Qualifying, deliberate interactions only. We intentionally exclude
    // programmatic/background events.
    const events: (keyof DocumentEventMap)[] = [
      "mousedown",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ]

    events.forEach((evt) =>
      document.addEventListener(evt, sendHeartbeat, { passive: true })
    )

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, sendHeartbeat))
    }
  }, [])

  // Navigation is also qualifying activity: reset the throttle and ping on
  // every route change within the authenticated app.
  useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated()) return
    lastPingRef.current = Date.now()
    api.post("/auth/session/activity/", {}).catch(() => {})
  }, [pathname])
}
