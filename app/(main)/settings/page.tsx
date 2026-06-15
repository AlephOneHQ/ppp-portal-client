"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Eye, EyeOff } from "lucide-react"
import { getCurrentUser } from "@/lib/user"
import { toast } from "sonner"
import { AddUserModal } from "@/components/modal/add-user-modal"
import { settingsAPI, type Admin } from "@/lib/api/settings"

interface User extends Admin {
  full_name?: string
  added_by?: string
}

interface NotificationPreference {
  notification_type: string
  push_enabled: number
  in_app_enabled: number
  email_enabled: number
  sms_enabled: number
  [key: `${string}_enabled`]: number
}

interface Session {
  id: string
  device_name: string
  location: string
  status: string
  last_active: string
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const user = currentUser || { id: "", email: "", name: "", role: "partner" as const }

  const [activeTab, setActiveTab] = useState(() => {
    const u = getCurrentUser()
    return u?.role === "admin" ? "users" : "notifications"
  })
  const [showAddUserModal, setShowAddUserModal] = useState(false)

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [pendingInvites, setPendingInvites] = useState<User[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationPreference[]>([])

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const fetchUsers = useCallback(async () => {
    if (user.role !== "admin") return

    setIsLoadingUsers(true)
    try {
      const [adminsResult, invitesResult] = await Promise.all([
        settingsAPI.listAdmins(),
        settingsAPI.listPendingInvitations(),
      ])

      if (adminsResult.success && adminsResult.data) {
        setUsers(adminsResult.data)
        console.log("Fetched admins:", adminsResult.data)
      } else {
        toast.error(adminsResult.message || "Failed to fetch admins")
      }

      if (invitesResult.success && invitesResult.data) {
        // Cast Invitation[] to User[] for the state, as they share similar structure for display
        setPendingInvites(invitesResult.data as unknown as User[])
        console.log("Fetched invitations:", invitesResult.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
      toast.error("Failed to fetch users")
    } finally {
      setIsLoadingUsers(false)
    }
  }, [user.role])

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await settingsAPI.getNotificationPreferences()
      if (result.success && result.data) {
        const prefs = result.data.map((pref) => ({
          notification_type: pref.notification_type,
          push_enabled: 0,
          in_app_enabled: pref.in_app_enabled ? 1 : 0,
          email_enabled: pref.email_enabled ? 1 : 0,
          sms_enabled: pref.sms_enabled ? 1 : 0,
        }))
        setNotifications(prefs)
      }
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
    }
  }, [])

  const fetchSessions = useCallback(async () => {
    // Note: Session management endpoints need to be implemented on backend
    // For now, use mock data
    setSessions([
      {
        id: "1",
        device_name: "Chrome on Windows",
        location: "Lagos, Nigeria",
        status: "active",
        last_active: new Date().toISOString(),
      },
    ])
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchNotifications()
    fetchSessions()
  }, [fetchUsers, fetchNotifications, fetchSessions])

  const handleDeleteUser = async (id: string, type: string) => {
    try {
      if (type === "user" && user.role === "admin") {
        const result = await settingsAPI.removeAdmin(id)
        if (result.success) {
          toast.success("Admin removed successfully")
          fetchUsers()
        } else {
          toast.error(result.message || "Failed to remove admin")
        }
      } else {
        toast.error("Cannot delete this user")
      }
    } catch {
      toast.error("Failed to delete user")
    }
  }

  const handleResendInvite = async (id: string) => {
    try {
      const result = await settingsAPI.resendInvitation(id)
      if (result.success) {
        toast.success("Invitation resent successfully")
      } else {
        toast.error(result.message || "Failed to resend invitation")
      }
    } catch {
      toast.error("Failed to resend invitation")
    }
  }

  const handleRevokeInvite = async (id: string) => {
    try {
      const result = await settingsAPI.revokeInvitation(id)
      if (result.success) {
        toast.success("Invitation revoked successfully")
        fetchUsers() // Refresh the list
      } else {
        toast.error(result.message || "Failed to revoke invitation")
      }
    } catch {
      toast.error("Failed to revoke invitation")
    }
  }

  const handleNotificationChange = async (notificationType: string, channel: string, enabled: boolean) => {
    const notification = notifications.find((n) => n.notification_type === notificationType) || {
      notification_type: notificationType,
      push_enabled: 0,
      in_app_enabled: 1,
      email_enabled: 1,
      sms_enabled: 1,
    }

    const updatedNotification = {
      ...notification,
      [`${channel}_enabled`]: enabled ? 1 : 0,
    }

    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.notification_type === notificationType ? updatedNotification : n)))

    try {
      const result = await settingsAPI.updateNotificationPreference(
        notificationType,
        updatedNotification.in_app_enabled === 1,
        updatedNotification.email_enabled === 1,
        updatedNotification.sms_enabled === 1,
      )

      if (!result.success) {
        // Revert on failure
        toast.error(result.message || "Failed to update notification preferences")
        fetchNotifications()
      }
    } catch {
      toast.error("Failed to update notification preferences")
      fetchNotifications()
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Note: Session deletion endpoint needs to be implemented on backend
      toast.success("Session terminated successfully")
      fetchSessions()
    } catch {
      toast.error("Failed to terminate session")
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setIsUpdatingPassword(true)
    try {
      const result = await settingsAPI.changePassword(currentPassword, newPassword, confirmPassword)

      if (result.success) {
        toast.success("Password updated successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(result.message || "Failed to update password")
      }
    } catch {
      toast.error("Failed to update password")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const getNotificationValue = (type: string, channel: string) => {
    const notification = notifications.find((n) => n.notification_type === type)
    if (!notification) return false

    const channelKey = `${channel}_enabled` as const
    return notification[channelKey] === 1
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "Unknown date"
    return new Date(dateString).toLocaleDateString()
  }

  const adminNotificationTypes = [
    { type: "PROJECT_CREATED", label: "New project published" },
    { type: "PROJECT_UPDATED", label: "Project updated or deleted" },
    { type: "PROJECT_DELETED", label: "Project deleted" },
    { type: "PROJECT_STATUS_CHANGED", label: "Project status changed" },
    { type: "EOI_SUBMITTED", label: "New Expression of Interest submission" },
    { type: "EOI_RESUBMITTED", label: "Expression of Interest payment updates" },
    { type: "PROPOSAL_SUBMITTED", label: "Proposal submission" },
    { type: "CONTRACT_GENERATED", label: "Contract sent" },
    { type: "CONTRACT_SIGNED", label: "Contract signed" },
  ]

  const partnerNotificationTypes = [
    { type: "PROJECT_CREATED", label: "New project published" },
    { type: "PROJECT_UPDATED", label: "Project updated or deleted" },
    { type: "PROJECT_DELETED", label: "Project deleted" },
    { type: "PROJECT_STATUS_CHANGED", label: "Project status changed" },
    { type: "EOI_SUBMITTED", label: "New Expression of Interest submission" },
    { type: "EOI_RESUBMITTED", label: "Expression of Interest payment updates" },
    { type: "PROPOSAL_SUBMITTED", label: "Proposal submission" },
    { type: "CONTRACT_GENERATED", label: "Contract sent" },
    { type: "CONTRACT_SIGNED", label: "Contract signed" },
  ]

  const systemNotificationTypes = [
    { type: "ADMIN_INVITED", label: "New user accepted invite" },
    { type: "PROJECT_ARCHIVED", label: "Project Archived" },
    { type: "PROPOSAL_APPROVED", label: "Proposal Approved" },
    { type: "PROPOSAL_REJECTED", label: "Proposal Rejected" },
  ]

  return (
    <div className="md:p-4">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full max-w-md overflow-x-auto flex">
          {user.role === "admin" && (<TabsTrigger value="users">Users</TabsTrigger>)}
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="border-t pt-8">
          {user.role === "admin" ? (
            <div className="space-y-12">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                  <h2 className="text-xl font-semibold mb-2">Add users</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Invite new admins to join the platform and track pending invitations until they&apos;re accepted
                  </p>
                  <Button onClick={() => setShowAddUserModal(true)} className="bg-[#C84545] hover:bg-[#B03939]">
                    + Invite User
                  </Button>
                </div>

                <div className="md:col-span-2">
                  {pendingInvites.length > 0 ? (
                    <div className="bg-muted/30 rounded-lg p-4 md:p-6 overflow-x-auto">
                      <div className="min-w-[600px]">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Full Name
                              </th>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Email Address
                              </th>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Designation
                              </th>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {pendingInvites.map((invite) => (
                              <tr key={invite.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap">
                                  {invite.full_name}
                                </td>
                                <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap">{invite.email}</td>
                                <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap text-muted-foreground">
                                  {(invite as unknown as { designation?: string }).designation || "—"}
                                </td>
                                <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap capitalize">
                                  {invite.role}
                                </td>
                                <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap text-right">
                                  <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                    <Button
                                      onClick={() => handleResendInvite(invite.id)}
                                      className="bg-[#C84545] hover:bg-[#B03939] text-xs sm:text-sm"
                                      size="sm"
                                    >
                                      Resend Link
                                    </Button>
                                    <Button
                                      onClick={() => handleRevokeInvite(invite.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs sm:text-sm"
                                    >
                                      Revoke Invite
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-12 text-center">
                      <div className="flex justify-center mb-4">
                        <svg
                          className="w-16 h-16 text-muted-foreground/30"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="font-semibold mb-2">No pending invitations</h3>
                      <p className="text-sm text-muted-foreground">
                        You currently have no pending invitations.
                        <br />
                        New invites will appear here once sent
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-3 pt-8 border-t">
                <div className="md:col-span-1">
                  <h2 className="text-xl font-semibold mb-2">Users</h2>
                  <p className="text-sm text-muted-foreground">
                    View and manage all active team members on the platform.
                  </p>
                </div>

                <div className="md:col-span-2 bg-muted/30 rounded-lg p-4 md:p-6 overflow-x-auto">
                  <div className="min-w-[700px]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Email Address
                          </th>
                          <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Designation
                          </th>
                          <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Date Added
                          </th>
                          <th className="px-3 py-2 md:px-4 md:py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {isLoadingUsers ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-12 text-center">
                              Loading users...
                            </td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-12 text-center">
                              <div className="flex flex-col items-center">
                                <svg
                                  className="w-16 h-16 text-muted-foreground/30 mb-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                                <p className="text-muted-foreground">No users found</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          users.map((admin) => (
                            <tr key={admin.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap">{admin.email}</td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap text-muted-foreground">
                                {admin.designation || "—"}
                              </td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap capitalize">
                                {admin.role}
                              </td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap">
                                {formatDate(admin.created_at)}
                              </td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(admin.id, "user")}
                                  className="h-8 w-8"
                                  disabled={admin.id === user.id}
                                >
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-[#C84545]" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              <div className="md:col-span-1">
                <h2 className="text-xl font-semibold mb-2">Team members</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Add the names and roles of your organisation&apos;s key personnel. You&apos;ll be able to quickly
                  select them when completing EOI forms.
                </p>
                <Button onClick={() => setShowAddUserModal(true)} className="bg-[#C84545] hover:bg-[#B03939]">
                  + Add Member
                </Button>
              </div>

              <div className="md:col-span-2">
                {teamMembers.length > 0 ? (
                  <div className="bg-muted/30 rounded-lg p-4 md:p-6 overflow-x-auto">
                    <div className="min-w-[500px]">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Full Name
                            </th>
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Date Added
                            </th>
                            <th className="px-3 py-2 md:px-4 md:py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {teamMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap">
                                {member.full_name}
                              </td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap">{member.role}</td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap">
                                {formatDate(member.created_at)}
                              </td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm whitespace-nowrap text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(member.id, "member")}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-[#C84545]" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-12 text-center">
                    <div className="flex justify-center mb-4">
                      <svg
                        className="w-16 h-16 text-muted-foreground/30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold mb-2">No team members added</h3>
                    <p className="text-sm text-muted-foreground">
                      Add your key personnel here so they can be referenced easily in future EOI submissions
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-12 pt-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <h2 className="text-xl font-semibold mb-2">Projects</h2>
              <p className="text-sm text-muted-foreground">
                Stay updated on key developments across EOIs, proposals, contracts, and milestones.
              </p>
            </div>

            <div className="md:col-span-2 space-y-0 overflow-x-auto bg-muted/30 rounded-lg">
              <div className="min-w-[500px]">
                {(user.role === "admin" ? adminNotificationTypes : partnerNotificationTypes).map((item, index) => (
                  <div
                    key={item.type}
                    className={`flex items-center justify-between py-4 px-6 ${index !== 0 ? "border-t" : ""}`}
                  >
                    <div className="flex-1 pr-4 text-sm">{item.label}</div>
                    <div className="flex gap-6 md:gap-12 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${item.type}-in-app`}
                          checked={getNotificationValue(item.type, "in_app")}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(item.type, "in_app", checked as boolean)
                          }
                          className="data-[state=checked]:bg-[#C84545] data-[state=checked]:border-[#C84545]"
                        />
                        <label htmlFor={`${item.type}-in-app`} className="text-sm cursor-pointer">
                          In-app
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${item.type}-email`}
                          checked={getNotificationValue(item.type, "email")}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(item.type, "email", checked as boolean)
                          }
                          className="data-[state=checked]:bg-[#C84545] data-[state=checked]:border-[#C84545]"
                        />
                        <label htmlFor={`${item.type}-email`} className="text-sm cursor-pointer">
                          Email
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${item.type}-sms`}
                          checked={getNotificationValue(item.type, "sms")}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(item.type, "sms", checked as boolean)
                          }
                          className="data-[state=checked]:bg-[#C84545] data-[state=checked]:border-[#C84545]"
                        />
                        <label htmlFor={`${item.type}-sms`} className="text-sm cursor-pointer">
                          SMS
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3 pt-8 border-t">
            <div className="md:col-span-1">
              <h2 className="text-xl font-semibold mb-2">System & User</h2>
              <p className="text-sm text-muted-foreground">Stay updated on platform and team management events.</p>
            </div>

            <div className="md:col-span-2 space-y-0 overflow-x-auto bg-muted/30 rounded-lg">
              <div className="min-w-[500px]">
                {systemNotificationTypes.map((item, index) => (
                  <div
                    key={item.type}
                    className={`flex items-center justify-between py-4 px-6 ${index !== 0 ? "border-t" : ""}`}
                  >
                    <div className="flex-1 pr-4 text-sm">{item.label}</div>
                    <div className="flex gap-6 md:gap-12 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${item.type}-in-app`}
                          checked={getNotificationValue(item.type, "in_app")}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(item.type, "in_app", checked as boolean)
                          }
                          className="data-[state=checked]:bg-[#C84545] data-[state=checked]:border-[#C84545]"
                        />
                        <label htmlFor={`${item.type}-in-app`} className="text-sm cursor-pointer">
                          In-app
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${item.type}-email`}
                          checked={getNotificationValue(item.type, "email")}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(item.type, "email", checked as boolean)
                          }
                          className="data-[state=checked]:bg-[#C84545] data-[state=checked]:border-[#C84545]"
                        />
                        <label htmlFor={`${item.type}-email`} className="text-sm cursor-pointer">
                          Email
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${item.type}-sms`}
                          checked={getNotificationValue(item.type, "sms")}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(item.type, "sms", checked as boolean)
                          }
                          className="data-[state=checked]:bg-[#C84545] data-[state=checked]:border-[#C84545]"
                        />
                        <label htmlFor={`${item.type}-sms`} className="text-sm cursor-pointer">
                          SMS
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-12 pt-8">
          {/* Update Password Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">Update password</h2>
              <p className="text-sm text-muted-foreground">
                Create a new password that&apos;s secure yet easy for you to remember. Avoid using common words or
                passwords you&apos;ve used elsewhere.
              </p>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="enter your current password"
                    required
                    disabled={isUpdatingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="enter your password"
                    required
                    disabled={isUpdatingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="enter your password"
                    required
                    disabled={isUpdatingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#C84545] hover:bg-[#B03939]" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>

          {/* Session Management Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
            <div>
              <h2 className="text-xl font-semibold mb-2">Session management</h2>
              <p className="text-sm text-muted-foreground">
                Review where your account is currently signed in and end any sessions you don&apos;t recognise to keep
                your account safe.
              </p>
            </div>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-start justify-between py-4 border-b">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{session.device_name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {session.location} •{" "}
                      {session.status === "active" ? "Ongoing session" : formatDate(session.last_active)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSession(session.id)}
                    className="flex-shrink-0 ml-2"
                  >
                    <Trash2 className="h-4 w-4 text-[#C84545]" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AddUserModal
        open={showAddUserModal}
        onOpenChange={setShowAddUserModal}
        userRole={user.role}
        userId={user.id}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
