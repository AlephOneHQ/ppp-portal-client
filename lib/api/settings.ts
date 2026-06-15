import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { extractErrorMessage } from "./errorUtils"

export interface Admin {
  id: string
  email: string
  full_name?: string
  is_active: boolean
  role: string
  designation?: string
  created_at: string
}

export interface InvitationResponse {
  id: string
  email: string
  first_name: string
  last_name: string
  designation?: string
  role?: string
  status: string
  expires_at?: string
  full_name?: string
}

export interface PaginatedInvitationResponse {
  limit: number
  offset: number
  count: number
  next: string | null
  previous: string | null
  results: InvitationResponse[]
}

export interface TeamMember {
  id: string
  full_name: string
  role: string
  created_at: string
}

export interface Session {
  id: string
  device_name: string
  location: string
  status: string
  last_active: string
}

export interface NotificationPreference {
  notification_type: string
  in_app_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
}

interface NotificationPreferencesResponse {
  PROJECTS?: NotificationPreference[]
  SYSTEM?: NotificationPreference[]
}

export const settingsAPI = {
  async listAdmins(): Promise<ApiResponse<Admin[]>> {
    try {
      const response = await api.get<Admin[]>("/auth/admins/")
      return {
        success: true,
        data: response.data,
        message: "Admins fetched successfully",
      }
    } catch (error: unknown) {
      console.error("Error fetching admins:", error)
      return { success: false, message: extractErrorMessage(error, "Failed to fetch admins") }
    }
  },

  async removeAdmin(adminId: string): Promise<ApiResponse> {
    try {
      await api.post(`/auth/admins/${adminId}/remove/`)
      return { success: true, message: "Admin removed successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to remove admin") }
    }
  },

  async inviteAdmin(email: string, firstName: string, lastName: string, designation: string): Promise<ApiResponse<InvitationResponse>> {
    try {
      const response = await api.post<InvitationResponse>("/auth/invitations/", {
        email,
        first_name: firstName,
        last_name: lastName,
        designation,
      })
      return { success: true, data: response.data, message: "Invitation sent successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to send invitation") }
    }
  },

  async listPendingInvitations(): Promise<ApiResponse<InvitationResponse[]>> {
    try {
      const response = await api.get<PaginatedInvitationResponse>("/auth/invitations/")
      const invitations = response.data.results.map((inv) => ({
        ...inv,
        full_name: `${inv.first_name} ${inv.last_name}`,
      }))
      return { success: true, data: invitations, message: "Invitations fetched successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to fetch invitations") }
    }
  },

  async resendInvitation(invitationId: string): Promise<ApiResponse> {
    try {
      await api.post("/auth/invitations/resend/", { invitation_id: invitationId })
      return { success: true, message: "Invitation resent successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to resend invitation") }
    }
  },

  async revokeInvitation(invitationId: string): Promise<ApiResponse> {
    try {
      await api.patch(`/auth/invitations/${invitationId}/`)
      return { success: true, message: "Invitation revoked successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to revoke invitation") }
    }
  },

  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResponse> {
    try {
      await api.post("/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      return { success: true, message: "Password changed successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to change password") }
    }
  },

  async getNotificationPreferences(): Promise<ApiResponse<NotificationPreference[]>> {
    try {
      const response = await api.get<NotificationPreferencesResponse>("/notifications/preferences/")
      const preferences: NotificationPreference[] = [
        ...(response.data.PROJECTS || []),
        ...(response.data.SYSTEM || []),
      ]
      return { success: true, data: preferences, message: "Preferences fetched successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to fetch notification preferences") }
    }
  },

  async updateNotificationPreference(
    notificationType: string,
    inAppEnabled: boolean,
    emailEnabled: boolean,
    smsEnabled: boolean,
  ): Promise<ApiResponse> {
    try {
      await api.patch(`/notifications/preferences/${notificationType}/`, {
        in_app_enabled: inAppEnabled,
        email_enabled: emailEnabled,
        sms_enabled: smsEnabled,
      })
      return { success: true, message: "Notification preference updated successfully" }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, "Failed to update notification preference") }
    }
  },
}
