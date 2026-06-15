import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { extractErrorMessage } from "./errorUtils"

export interface AdminUser {
  id: string
  email: string
  is_active: boolean
  role: string
  created_at: string
}

export interface Invitation {
  id: string
  email: string
  first_name: string
  last_name: string
  status: string
  expires_at: string
  invited_by?: string
  created_at: string
}

export interface TeamMember {
  id: string
  full_name: string
  role: string
  created_at: string
}

export interface InviteUserData {
  email: string
  first_name: string
  last_name: string
}

export interface TeamMemberData {
  full_name: string
  role: string
}

export const usersAPI = {
  // Admin: List all active admins
  async listAdmins(): Promise<ApiResponse<AdminUser[]>> {
    try {
      const response = await api.get<AdminUser[]>("/users/admins/")
      return {
        success: true,
        data: response.data,
        message: "Admins fetched successfully",
      }
    } catch (error: unknown) {
      console.error("Error fetching admins:", error)
      throw new Error(extractErrorMessage(error, "Failed to fetch admins"))
    }
  },

  async inviteUser(data: InviteUserData): Promise<ApiResponse<Invitation>> {
    try {
      const response = await api.post<Invitation>("/users/invitations/", data)
      return { success: true, data: response.data, message: "Invitation sent successfully" }
    } catch (error: unknown) {
      console.error("Error inviting user:", error)
      throw new Error(extractErrorMessage(error, "Failed to send invitation"))
    }
  },

  async resendInvitation(invitationId: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/users/invitations/resend/`, { invitation_id: invitationId })
      return { success: true, message: response.data.message || "Invitation resent successfully" }
    } catch (error: unknown) {
      console.error("Error resending invitation:", error)
      throw new Error(extractErrorMessage(error, "Failed to resend invitation"))
    }
  },

  async listInvitations(): Promise<ApiResponse<Invitation[]>> {
    try {
      const response = await api.get<Invitation[]>("/users/invitations/")
      return { success: true, data: response.data, message: "Invitations fetched successfully" }
    } catch (error: unknown) {
      console.error("Error fetching invitations:", error)
      throw new Error(extractErrorMessage(error, "Failed to fetch invitations"))
    }
  },

  async removeAdmin(adminId: string): Promise<ApiResponse> {
    try {
      const response = await api.post(`/users/admins/${adminId}/remove/`)
      return { success: true, message: response.data.message || "Admin removed successfully" }
    } catch (error: unknown) {
      console.error("Error removing admin:", error)
      throw new Error(extractErrorMessage(error, "Failed to remove admin"))
    }
  },

  async addTeamMember(data: TeamMemberData): Promise<ApiResponse<TeamMember>> {
    try {
      const response = await api.post<TeamMember>("/users/team-members/", data)
      return { success: true, data: response.data, message: "Team member added successfully" }
    } catch (error: unknown) {
      console.error("Error adding team member:", error)
      throw new Error(extractErrorMessage(error, "Failed to add team member"))
    }
  },

  async listTeamMembers(): Promise<ApiResponse<TeamMember[]>> {
    try {
      const response = await api.get<TeamMember[]>("/users/team-members/")
      return { success: true, data: response.data, message: "Team members fetched successfully" }
    } catch (error: unknown) {
      console.error("Error fetching team members:", error)
      throw new Error(extractErrorMessage(error, "Failed to fetch team members"))
    }
  },

  async removeTeamMember(memberId: string): Promise<ApiResponse> {
    try {
      await api.delete(`/users/team-members/${memberId}/`)
      return { success: true, message: "Team member removed successfully" }
    } catch (error: unknown) {
      console.error("Error removing team member:", error)
      throw new Error(extractErrorMessage(error, "Failed to remove team member"))
    }
  },

  async changePassword(data: { old_password: string; new_password: string; confirm_password: string }): Promise<ApiResponse> {
    try {
      const response = await api.post("/api/password/change/", data)
      return { success: true, message: response.data.message || "Password changed successfully" }
    } catch (error: unknown) {
      console.error("Error changing password:", error)
      throw new Error(extractErrorMessage(error, "Failed to change password"))
    }
  },
}
