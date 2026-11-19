import axios from "axios"
import Cookies from "js-cookie"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface LoginResponse {
  success: boolean;
  user_id?: string;
  message?: string;
  // Authenticator-app (TOTP) 2FA: present on first login, before an app is linked
  mfa_setup_required?: boolean;
  totp_secret?: string;
  otpauth_uri?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  user?: User;
  access_token?: string;
  refresh_token?: string;
  message?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  user_id?: string;
  email?: string;
  reset_token_id?: string;
  message?: string;
  errors?: Record<string, string> | undefined;
}

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
})

/**
 * Redirects the user to the appropriate login page after their session has
 * been invalidated (manual logout or inactivity timeout). When the session
 * expired due to inactivity we surface a message via a query flag so the login
 * page can explain why the user was signed out.
 */
export const handleSessionExpired = (reason?: "inactivity"): void => {
  if (typeof window === "undefined") {
    logout()
    return
  }

  let isAdmin = false
  try {
    const userStr = Cookies.get("user")
    isAdmin = userStr ? JSON.parse(userStr)?.role === "admin" : false
  } catch {
    isAdmin = false
  }

  logout()

  const loginPath = isAdmin ? "/admin/login" : "/partner/login"
  const suffix = reason === "inactivity" ? "?session=expired" : ""

  // Avoid redirect loops if we're already on an auth page.
  if (window.location.pathname.includes("/login")) return
  window.location.href = `${loginPath}${suffix}`
}

const isSessionExpiredError = (error: unknown): boolean => {
  const axiosErr = error as { response?: { data?: { extra?: { code?: string }; code?: string } } }
  const data = axiosErr?.response?.data
  const code = data?.extra?.code || data?.code
  return code === "session_expired"
}

// Request interceptor to add auth token.
// By default every request counts as deliberate user activity and carries the
// X-User-Activity header so the server resets the inactivity timer. Background
// requests (polling, auto-refresh) opt out by setting `backgroundRequest: true`
// on the axios config so they do NOT extend the session.
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const isBackground = (config as { backgroundRequest?: boolean }).backgroundRequest === true
    if (!isBackground) {
      config.headers["X-User-Activity"] = "1"
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh and session expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest?._retry) {
      // The session was invalidated server-side (inactivity or logout). Do not
      // try to refresh - refreshing an expired session is rejected too.
      if (isSessionExpiredError(error)) {
        handleSessionExpired("inactivity")
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const refreshToken = Cookies.get("refresh_token")
        if (refreshToken) {
          // Refresh must NOT count as user activity, so it bypasses the api
          // instance (no X-User-Activity header).
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          Cookies.set("access_token", access)
          originalRequest.headers.Authorization = `Bearer ${access}`

          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed - if it was because the session is inactive, show the
        // inactivity message; otherwise just send the user back to login.
        handleSessionExpired(isSessionExpiredError(refreshError) ? "inactivity" : undefined)
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Utility functions
export const logout = (): void => {
  Cookies.remove("access_token")
  Cookies.remove("refresh_token")
  Cookies.remove("user")
}

export const getCurrentUser = (): User | null => {
  if (typeof window !== "undefined") {
    const userStr = Cookies.get("user")
    return userStr ? JSON.parse(userStr) : null
  }
  return null
}

export const isAuthenticated = (): boolean => {
  return !!Cookies.get("access_token")
}

// Export constants
export { API_BASE_URL }
export default api