import axios from "axios"
import Cookies from "js-cookie"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const api = axios.create({
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
  },
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
  },
)

export const authAPI = {
  // Admin login (request OTP)
  adminLogin: async (email, password) => {
    try {
      const response = await api.post("/auth/login/", {
        email,
        password,
      })

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      }
    }
  },

  // Partner login (request OTP)
  partnerLogin: async (email, password) => {
    try {
      const response = await api.post("/auth/partner/login/", {
        email,
        password,
      })

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      }
    }
  },

  // Verify OTP
  verifyOTP: async (user_id, code, email) => {
    try {
      const response = await api.post("/auth/verify-otp/", {
        user_id,
        code,
        email: email,
      })

      if (response.data.access_token) {
        Cookies.set("access_token", response.data.access_token)
        Cookies.set("refresh_token", response.data.refresh_token)

        const userData = {
          id: response.data.user_id,
          email: response.data.email,
          name: response.data.name || response.data.email.split("@")[0],
          role: response.data.role,
        }
        Cookies.set("user", JSON.stringify(userData))

        return {
          success: true,
          user: userData,
          message: response.data.message,
        }
      }

      return { success: false, message: "OTP verification failed" }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "OTP verification failed",
      }
    }
  },

  verifyPartnerOTP: async (user_id, otp_code, email) => {
    try {
      const response = await api.post("/auth/partner/verify-otp/", {
        user_id,
        otp_code,
        email: email,
      })

      return {
        success: true,
        email: response.data.email,
        setup_token: response.data.setup_token,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "OTP verification failed",
      }
    }
  },

  partnerSetPassword: async (passwordData) => {
    try {
      const response = await api.post("/auth/partner/set-password/", passwordData);

      if (response.data.access_token) {
        Cookies.set("access_token", response.data.access_token)
        Cookies.set("refresh_token", response.data.refresh_token)

        const userData = {
          id: response.data.user_id,
          email: response.data.email,
          name: response.data.full_name || response.data.email.split("@")[0],
          role: response.data.role,
        }
        Cookies.set("user", JSON.stringify(userData))
      }

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Password setup failed",
      }
    }
  },

  // Password reset request
  passwordResetRequest: async (email) => {
    try {
      const response = await api.post("/auth/password-reset/request/", {
        email,
      })

      return {
        success: true,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Password reset request failed",
        errors: error.response?.data?.extra?.fields || {},
      }
    }
  },

  // Verify password reset OTP
  verifyPasswordResetOTP: async (email, code) => {
    try {
      const response = await api.post("/auth/password-reset/verify-otp/", {
        email,
        code,
      })

      return {
        success: true,
        user_id: response.data.user_id,
        email: response.data.email,
        reset_token_id: response.data.reset_token_id,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "OTP verification failed",
        errors: error.response?.data?.extra?.fields || {},
      }
    }
  },

  // Complete password reset
  completePasswordReset: async (email, reset_token_id, new_password, confirm_password) => {
    try {
      const response = await api.post("/auth/password-reset/complete/", {
        email,
        reset_token_id,
        new_password,
        confirm_password,
      })

      return {
        success: true,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Password reset failed",
        errors: error.response?.data?.extra?.fields || {},
      }
    }
  },

  // Change password for authenticated user
  changePassword: async (oldPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.post("/api/password/change/", {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Password change failed",
        errors: error.response?.data?.extra?.fields || {},
      };
    }
  },

  // Partner signup
  partnerSignup: async (userData) => {
    try {
      console.log("Registering user with data:", userData)
      const response = await api.post("/auth/partner/signup/", userData)

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      }
    }
  },

  // Logout
  logout: async () => {
    try {
      const refreshToken = Cookies.get("refresh_token")
      if (refreshToken) {
        await api.post("/api/logout/", { refresh_token: refreshToken })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      Cookies.remove("access_token")
      Cookies.remove("refresh_token")
      Cookies.remove("user")
    }
  },

  getCurrentUser: () => {
    if (typeof window !== "undefined") {
      const userStr = Cookies.get("user")
      return userStr ? JSON.parse(userStr) : null
    }
    return null
  },

  isAuthenticated: () => {
    return !!Cookies.get("access_token")
  },
}

export default api