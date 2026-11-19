import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { extractErrorMessage } from "./errorUtils"

const handleNotificationError = (error: unknown): { message: string } => {
  return { message: extractErrorMessage(error, "Notification operation failed") }
}

export interface NotificationData {
  id: string
  title: string
  message: string
  notification_type: string
  related_object_type?: string
  related_object_id?: string
  is_read: boolean
  created_by?: {
    id: string
    email: string
  }
  created_at: string
  updated_at: string
}

export interface CreateNotificationData {
  title: string
  message: string
  notification_type: string
  related_object_type?: string
  related_object_id?: string
}

export interface NotificationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: NotificationData[]
}

export interface NotificationFilters {
  is_read?: boolean
  notification_type?: string
  limit?: number
  offset?: number
  ordering?: string
}

// Notification API functions
export const notificationAPI = {
  list: async (filters: NotificationFilters = {}): Promise<ApiResponse<NotificationListResponse>> => {
    try {
      // Background fetch: notification polling must not reset the inactivity timer.
      const response = await api.get("/notifications/", { params: filters, backgroundRequest: true } as never)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleNotificationError(error)
      return {
        success: false,
        message: message || "Failed to fetch notifications",
      }
    }
  },

  create: async (data: CreateNotificationData): Promise<ApiResponse<NotificationData>> => {
    try {
      const response = await api.post("/notifications/", data)
      return {
        success: true,
        data: response.data,
        message: "Notification created successfully",
      }
    } catch (error: unknown) {
      const { message } = handleNotificationError(error)
      return {
        success: false,
        message: message || "Failed to create notification",
      }
    }
  },

  get: async (notificationId: string): Promise<ApiResponse<NotificationData>> => {
    try {
      const response = await api.get(`/notifications/${notificationId}/`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleNotificationError(error)
      return {
        success: false,
        message: message || "Failed to fetch notification",
      }
    }
  },

  markAsRead: async (notificationId: string): Promise<ApiResponse<NotificationData>> => {
    try {
      const response = await api.post(`/notifications/${notificationId}/mark_read/`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleNotificationError(error)
      return {
        success: false,
        message: message || "Failed to mark notification as read",
      }
    }
  },

  markAllAsRead: async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.post("/notifications/mark_all_read/")
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleNotificationError(error)
      return {
        success: false,
        message: message || "Failed to mark all notifications as read",
      }
    }
  },

  markAsUnread: async (notificationId: string): Promise<ApiResponse<NotificationData>> => {
    try {
      const response = await api.post(`/notifications/${notificationId}/mark_unread/`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: unknown) {
      const { message } = handleNotificationError(error)
      return {
        success: false,
        message: message || "Failed to mark notification as unread",
      }
    }
  },

  delete: async (notificationId: string): Promise<ApiResponse<void>> => {
    try {
      await api.delete(`/notifications/${notificationId}/`)
      return {
        success: true,
        message: "Notification deleted successfully",
      }
    } catch (error: unknown) {
      const { message } = handleNotificationError(error)
      return {
        success: false,
        message: message || "Failed to delete notification",
      }
    }
  },
}

export default notificationAPI
