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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = Cookies.get("refresh_token")
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          Cookies.set("access_token", access)
          originalRequest.headers.Authorization = `Bearer ${access}`

          return api(originalRequest)
        }
      } catch (refreshError) {
        logout()
        window.location.href = "/admin/login"
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