"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, BellDot, FileText, Milestone, User, Trash2 } from "lucide-react"
import Link from "next/link"
import { notificationAPI, type NotificationData } from "@/lib/api/notifications"
import { settingsAPI, type NotificationPreference } from "@/lib/api/settings"
import { toast } from "sonner"

interface Notification extends NotificationData {
  link?: string
}

interface TabItem {
  title: "all" | "unread"
  count: number
}

interface NotificationPageProps {
  onUnreadCountChange?: (count: number) => void
}

const NotificationPage: React.FC<NotificationPageProps> = ({ onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [hasInitialFetch, setHasInitialFetch] = useState(false)

  const fetchPreferences = async () => {
    try {
      const result = await settingsAPI.getNotificationPreferences()
      if (result.success && result.data) {
        setPreferences(result.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching preferences:", error)
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const result = await notificationAPI.list({
        limit: 50,
        ordering: "-created_at",
      })

      if (result.success && result.data) {
        const notificationsData = result.data.results || result.data || []
        const mappedNotifications: Notification[] = notificationsData.map((notif) => ({
          ...notif,
          link: getNotificationLink(notif),
        }))
        setNotifications(mappedNotifications)
      } else {
        console.error("[v0] Failed to fetch notifications:", result.message)
        setNotifications([])
      }
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
      setNotifications([])
    } finally {
      setIsLoading(false)
      setHasInitialFetch(true)
    }
  }

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications()
  }, [])

  // Also fetch when sheet opens to get latest notifications
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  // Calculate unread count
  const isNotificationEnabled = (type: string) => {
    const pref = preferences.find((p) => p.notification_type === type)
    return pref ? pref.in_app_enabled : true
  }

  const visibleNotifications = notifications.filter((n) => isNotificationEnabled(n.notification_type))
  const unreadNotifications = visibleNotifications.filter((n) => !n.is_read)
  const unreadCount = unreadNotifications.length

  // Notify parent when unread count changes
  useEffect(() => {
    if (hasInitialFetch) {
      onUnreadCountChange?.(unreadCount)
    }
  }, [unreadCount, hasInitialFetch, onUnreadCountChange])

  const getNotificationLink = (notif: NotificationData): string => {
    if (notif.related_object_type && notif.related_object_id) {
      switch (notif.related_object_type.toLowerCase()) {
        case "project":
          return `/projects/${notif.related_object_id}`
        case "eoi":
          return `/eoi/${notif.related_object_id}`
        case "proposal":
          return `/proposals/${notif.related_object_id}`
        case "contract":
        case "contractmilestone":
          return `/contracts/${notif.related_object_id}`
        default:
          return "#"
      }
    }

    switch (notif.notification_type) {
      case "new_user_invite":
      case "admin_actions":
        return "/settings"
      default:
        return "#"
    }
  }

  const tabItems: TabItem[] = [
    { title: "all", count: visibleNotifications.length },
    { title: "unread", count: unreadNotifications.length },
  ]

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      try {
        const result = await notificationAPI.markAsRead(notificationId)
        if (result.success) {
          setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
        }
      } catch (error) {
        console.error("[v0] Error marking notification as read:", error)
      }
    }
    setOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    if (unreadNotifications.length === 0) return

    try {
      const result = await notificationAPI.markAllAsRead()
      if (result.success) {
        toast.success("All notifications marked as read")
        fetchNotifications()
      } else {
        toast.error(result.message || "Failed to mark all as read")
      }
    } catch (error) {
      console.error("[v0] Error marking all as read:", error)
      toast.error("Failed to mark all as read")
    }
  }

  const filterNotifications = (tab: "all" | "unread"): Notification[] =>
    tab === "unread" ? unreadNotifications : visibleNotifications

  const getNotificationIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes("milestone")) {
      return <Milestone className="h-5 w-5 text-muted-foreground" />
    } else if (t.includes("eoi")) {
      return <FileText className="h-5 w-5 text-muted-foreground" />
    } else if (t.includes("proposal")) {
      return <FileText className="h-5 w-5 text-muted-foreground" />
    } else if (t.includes("contract")) {
      return <FileText className="h-5 w-5 text-muted-foreground" />
    } else if (t.includes("user") || t.includes("admin")) {
      return <User className="h-5 w-5 text-muted-foreground" />
    } else if (t.includes("project")) {
      return <User className="h-5 w-5 text-muted-foreground" />
    } else {
      return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w`
    return `${Math.floor(diffInSeconds / 2592000)}mo`
  }

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const result = await notificationAPI.delete(notificationId)
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        toast.success("Notification deleted")
      } else {
        toast.error(result.message || "Failed to delete notification")
      }
    } catch (error) {
      console.error("[v0] Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-transparent text-[#F0E0E0] relative">
          <img src="/icons/notifications.svg" alt="notifications icon" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-0 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[8px] text-[#C13C3D]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-[540px] p-0 h-full flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-xl font-medium">Notifications</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="all" className="w-full h-4/5 flex flex-col">
          <div className="flex justify-between items-center px-6 pt-3 border-b shrink-0">
            <TabsList className="bg-transparent p-0 h-auto">
              {tabItems.map((item) => (
                <TabsTrigger
                  key={item.title}
                  value={item.title}
                  className="relative rounded-none border-b border-transparent px-4 pb-3 pt-2 font-normal capitalize data-[state=active]:border-b-[#C13C3D] data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                >
                  <span className="text-muted-foreground data-[state=active]:text-foreground capitalize">
                    {item.title}
                  </span>
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 min-w-5 rounded-sm bg-[#C13C3D] px-1.5 py-2 text-xs text-white hover:bg-[#C13C3D]"
                  >
                    {item.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadNotifications.length === 0}
              className="text-[#C13C3D] hover:text-[#C13C3D] hover:bg-transparent px-2"
            >
              <img src="/icons/double-tick.svg" alt="mark as done icon" />
              Mark all as read
            </Button>
          </div>

          {tabItems.map((tab) => (
            <TabsContent value={tab.title} key={tab.title} className="mt-0 flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 h-full">
                    <p className="text-sm text-muted-foreground">Loading notifications...</p>
                  </div>
                ) : filterNotifications(tab.title).length > 0 ? (
                  <div className="overflow-y-auto h-full">
                    {filterNotifications(tab.title).map((notif, index) => (
                      <Link
                        key={notif.id}
                        href={notif.link || "#"}
                        onClick={() => handleNotificationClick(notif.id, notif.is_read)}
                        className={`group flex items-start gap-3 px-6 py-4 hover:bg-muted/50 transition-colors relative ${
                          index !== filterNotifications(tab.title).length - 1 ? "border-b" : ""
                        }`}
                      >
                        <div className="mt-0.5">{getNotificationIcon(notif.notification_type)}</div>
                        <div className="flex-1 space-y-1 mr-6">
                          <p className="text-sm leading-relaxed font-medium truncate">{notif.title || notif.message}</p>
                          {notif.title && notif.message && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatTimestamp(notif.created_at)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 mt-0.5">
                          {!notif.is_read && <div className="h-2 w-2 rounded-full bg-[#C13C3D]" />}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground absolute top-12 right-4 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => handleDelete(e, notif.id)}
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center h-full">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Bell className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No {tab.title} notifications</p>
                    <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

export default NotificationPage