import { api, logout, getCurrentUser, isAuthenticated } from "../apiConfig"
import type { LoginResponse, VerifyOTPResponse, PasswordResetResponse, ApiResponse, User } from "../apiConfig"
import Cookies from "js-cookie"
import { AxiosError } from "axios"

export interface PartnerSignupData {
  email: string
  phone_number: string
  business_name: string
  country_of_incorporation: string
  cac_number?: string
  business_type: string
  business_address?: string
  contact_person_name: string
}

export interface PasswordData {
  setup_token: string
  password: string
  confirm_password: string
}

export interface ChangePasswordData {
  old_password: string
  new_password: string
  confirm_password: string
}

interface AuthErrorResponse {
  message?: string
  extra?: {
    fields?: Record<string, string>
  }
}

const handleApiError = (error: unknown): { message: string; errors?: Record<string, string> } => {
  if (error instanceof AxiosError) {
    const errorData = error.response?.data as AuthErrorResponse
    return {
      message: errorData?.message || "Request failed",
      errors: errorData?.extra?.fields,
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: "An unexpected error occurred" }
}

export const authAPI = {
  // Admin login (password step; then authenticator-app code)
  adminLogin: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post("/auth/login/", {
        email,
        password,
      })

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
        mfa_setup_required: response.data.mfa_setup_required ?? false,
        totp_secret: response.data.totp_secret,
        otpauth_uri: response.data.otpauth_uri,
      }
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "Login failed",
      }
    }
  },

  // Partner login (password step; then authenticator-app code)
  partnerLogin: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post("/auth/partner/login/", {
        email,
        password,
      })

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
        mfa_setup_required: response.data.mfa_setup_required ?? false,
        totp_secret: response.data.totp_secret,
        otpauth_uri: response.data.otpauth_uri,
      }
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "Login failed",
      }
    }
  },

  // Verify authenticator-app (TOTP) code for login
  verifyOTP: async (user_id: string, code: string, email: string): Promise<VerifyOTPResponse> => {
    try {
      const response = await api.post("/auth/verify-otp/", {
        user_id,
        code,
        email,
      })

      if (response.data.access_token) {
        Cookies.set("access_token", response.data.access_token)
        Cookies.set("refresh_token", response.data.refresh_token)

        const userData: User = {
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
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "OTP verification failed",
      }
    }
  },

  verifyPartnerOTP: async (
    user_id: string,
    otp_code: string,
    email: string,
  ): Promise<ApiResponse<{ email: string; setup_token: string }>> => {
    try {
      const response = await api.post("/auth/partner/verify-otp/", {
        user_id,
        otp_code,
        email: email,
      })

      return {
        success: true,
        data: {
          email: response.data.email,
          setup_token: response.data.setup_token,
        },
        message: response.data.message,
      }
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "OTP verification failed",
      }
    }
  },

  partnerSetPassword: async (passwordData: PasswordData): Promise<LoginResponse> => {
    try {
      const response = await api.post("/auth/partner/set-password/", passwordData)

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
      }
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "Password setup failed",
      }
    }
  },

  // Password reset request
  passwordResetRequest: async (email: string): Promise<ApiResponse> => {
    try {
      const response = await api.post("/auth/password-reset/request/", {
        email,
      })

      return {
        success: true,
        message: response.data.message,
      }
    } catch (error: unknown) {
      const { message, errors } = handleApiError(error)
      return {
        success: false,
        message: message || "Password reset request failed",
        errors: errors || {},
      }
    }
  },

  // Verify password reset OTP
  verifyPasswordResetOTP: async (email: string, code: string): Promise<PasswordResetResponse> => {
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
    } catch (error: unknown) {
      const { message, errors } = handleApiError(error)
      return {
        success: false,
        message: message || "OTP verification failed",
        errors: errors || {},
      }
    }
  },

  // Complete password reset
  completePasswordReset: async (
    email: string,
    reset_token_id: string,
    new_password: string,
    confirm_password: string,
  ): Promise<ApiResponse> => {
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
    } catch (error: unknown) {
      const { message, errors } = handleApiError(error)
      return {
        success: false,
        message: message || "Password reset failed",
        errors: errors || {},
      }
    }
  },

  // Change password for authenticated user
  changePassword: async (oldPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResponse> => {
    try {
      const response = await api.post("/api/password/change/", {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      return {
        success: true,
        message: response.data.message,
      }
    } catch (error: unknown) {
      const { message, errors } = handleApiError(error)
      return {
        success: false,
        message: message || "Password change failed",
        errors: errors || {},
      }
    }
  },

  // Resend OTP for partner login
  resendPartnerOTP: async (email: string): Promise<ApiResponse> => {
    try {
      const response = await api.post("/auth/partner/resend-otp/", { email })
      return {
        success: true,
        message: response.data.message,
      }
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "Failed to resend OTP",
      }
    }
  },

  // Partner signup
  partnerSignup: async (userData: PartnerSignupData): Promise<LoginResponse> => {
    try {
      console.log("Registering user with data:", userData)
      const response = await api.post("/auth/partner/signup/", userData)

      return {
        success: true,
        user_id: response.data.user_id,
        message: response.data.message,
      }
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "Registration failed",
      }
    }
  },

  // Accept admin invitation
  acceptInvitation: async (
    token: string,
    passwordData: Omit<PasswordData, "setup_token">,
  ): Promise<LoginResponse> => {
    try {
      const response = await api.post("/auth/invitations/accept/", {
        token,
        password: passwordData.password,
        confirm_password: passwordData.confirm_password,
      })

      return {
        success: true,
        user_id: response.data.id,
        message: "Invitation accepted successfully",
      }
    } catch (error: unknown) {
      const { message } = handleApiError(error)
      return {
        success: false,
        message: message || "Failed to accept invitation",
      }
    }
  },

  // Logout - invalidates the session immediately server-side, then clears cookies
  logout: async (): Promise<void> => {
    try {
      const refreshToken = Cookies.get("refresh_token")
      await api.post("/auth/logout/", { refresh_token: refreshToken ?? "" })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      logout()
    }
  },

  getCurrentUser,
  isAuthenticated,
}

export default authAPI
