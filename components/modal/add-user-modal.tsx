"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { settingsAPI } from "@/lib/api/settings"
import { notificationAPI } from "@/lib/api/notifications"

interface AddUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole: "admin" | "partner"
  userId: string
  onSuccess: () => void
}

export function AddUserModal({ open, onOpenChange, userRole, userId, onSuccess }: AddUserModalProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [designation, setDesignation] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let response: Awaited<ReturnType<typeof settingsAPI.inviteAdmin>>

      if (userRole === "admin") {
        response = await settingsAPI.inviteAdmin(email, firstName, lastName, designation)
      } else {
        throw new Error("Partner team member addition not implemented yet")
      }

      if (!response.success) throw new Error(response.message || "Failed to add user")

      if (userRole === "admin") {
        try {
          await notificationAPI.create({
            title: "Admin Invited",
            message: `An invitation has been sent to ${firstName} ${lastName} (${email}).`,
            notification_type: "ADMIN_INVITED",
            related_object_type: "user_invitation",
            related_object_id: response.data?.id,
          })
        } catch (error) {
          console.error("Failed to create notification:", error)
        }
      }

      toast.success("Invitation sent successfully")
      setInviteSent(true)
      onSuccess()
      onOpenChange(false)
      // Reset form
      setFirstName("")
      setLastName("")
      setEmail("")
      setDesignation("")
      setRole("")
      setInviteSent(false)
    } catch (error) {
      console.error(error)
      toast.error("Failed to add user. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setFirstName("")
        setLastName("")
        setEmail("")
        setDesignation("")
        setRole("")
        setInviteSent(false)
      }
      onOpenChange(val)
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add user to portal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Quincy"
              required
              disabled={inviteSent}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Jones"
              required
              disabled={inviteSent}
            />
          </div>

          {userRole === "admin" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="placeholder@example.com"
                  required
                  disabled={inviteSent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">
                  Designation <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Director of Finance"
                  required
                  disabled={inviteSent}
                />
                {inviteSent && (
                  <p className="text-xs text-muted-foreground">
                    Designation cannot be edited after invite is sent. Revoke and re-send to change.
                  </p>
                )}
              </div>
            </>
          )}

          {userRole === "partner" && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Enter user role"
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || inviteSent} className="flex-1 bg-[#C84545] hover:bg-[#B03939]">
              {loading ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
