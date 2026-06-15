"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authAPI } from "@/lib/api/auth"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import api from "@/lib/auth"

interface CreatePasswordFormProps extends React.ComponentProps<"div"> {
  isAdminInvite?: boolean
  firstname?: string
}

export function CreatePasswordForm({
  className,
  isAdminInvite = false,
  firstname = "Admin",
  ...props
}: CreatePasswordFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawToken = searchParams.get("token") || ""
  // Email clients apply quoted-printable encoding to URLs in the email body.
  // This causes two types of mangling:
  //   1. '?token=abc' → '?token=3Dabc'  (= encoded as =3D)
  //      Browser URL parser gives rawToken = '3Dabc'
  //   2. Soft line-wrap: '=' inserted mid-token every ~76 chars
  //      e.g. 'cca1686cf7=9e154fc1...' — the '=' is a line-break artifact
  const token = rawToken
    .replace(/^3D/i, "")   // strip leading '3D' from case 1
    .replace(/=/g, "")     // strip all bare '=' soft line-break artifacts from case 2

  const [email, setEmail] = useState("")
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [formData, setFormData] = useState({
    new_password: "",
    confirm_password: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // For admin invites: fetch the email from the server using the token.
  // This avoids relying on URL params which get mangled by email clients.
  useEffect(() => {
    if (!isAdminInvite || !token) return
    const lookup = async () => {
      try {
        const res = await api.get(`/auth/invitations/accept/?token=${encodeURIComponent(token)}`)
        setEmail(res.data.email)
        setTokenValid(true)
      } catch {
        setTokenValid(false)
        setMessage("This invitation link is invalid or has already been used.")
      }
    }
    lookup()
  }, [isAdminInvite, token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isAdminInvite && !token) {
      setMessage("Invalid invitation link — token is missing. Please use the link from your invitation email.")
      return
    }

    if (isAdminInvite && tokenValid === false) {
      setMessage("This invitation link is invalid or has already been used.")
      return
    }

    if (formData.new_password !== formData.confirm_password) {
      setMessage("Passwords do not match")
      return
    }

    if (formData.new_password.length < 8) {
      setMessage("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      let result
      if (isAdminInvite) {
        result = await authAPI.acceptInvitation(token, {
          password: formData.new_password,
          confirm_password: formData.confirm_password,
        })
      } else {
        result = await authAPI.completePasswordReset(
          email,
          resetToken,
          formData.new_password,
          formData.confirm_password,
        )
      }

      if (result.success) {
        setMessage(
          isAdminInvite ? "Account setup successful! Redirecting to login..." : "Success! Redirecting to login...",
        )
        setTimeout(() => {
          router.push(isAdminInvite ? "/admin/login" : "/projects")
        }, 2000)
      } else {
        setMessage(result.message || "Failed to reset password")
      }
    } catch (error) {
      setMessage("An error occurred while processing your request")
      console.error("Password setup error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = handleSetPassword // Consolidated handleSubmit into handleSetPassword usage in the form

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="leading-[1.2] text-3xl">
            {isAdminInvite ? `Welcome!` : "Create Password"}
          </CardTitle>
          <CardDescription className="mx-auto text-[#444444] leading-[1.4] w-full max-w-sm">
            {isAdminInvite
              ? "You've been invited as an admin. Create a password to get started."
              : "Set a secure password to complete your account setup."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdminInvite && tokenValid === null && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Validating invitation...</span>
            </div>
          )}
          {isAdminInvite && tokenValid === false && (
            <div className="text-sm p-3 rounded bg-red-100 text-red-800">{message}</div>
          )}
          {(!isAdminInvite || tokenValid === true) && (
            <form className="py-4 text-[#444444]" onSubmit={handleSetPassword}>
            <FieldGroup>
              <>
                <Field>
                  <FieldLabel htmlFor="new_password">Create Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="new_password"
                      name="new_password"
                      type={showNewPassword ? "text" : "password"} // Toggle password visibility
                      placeholder="Enter your new password (min 8 characters)"
                      required
                      minLength={8}
                      value={formData.new_password}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 transform -translate-y-1/2"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? <EyeOff /> : <Eye />} {/* Toggle eye icon */}
                    </button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm_password">Confirm Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? "text" : "password"} // Toggle password visibility
                      placeholder="Re-enter password"
                      required
                      minLength={8}
                      value={formData.confirm_password}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 transform -translate-y-1/2"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />} {/* Toggle eye icon */}
                    </button>
                  </div>
                </Field>
              </>

              {message && (
                <div
                  className={`text-sm p-3 rounded ${
                    message.includes("successful") || message.includes("verified")
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {message}
                </div>
              )}

              <Field className="flex flex-col gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Processing..." : !isAdminInvite ? "Complete Signup" : "Continue"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.back()} disabled={loading}>
                  Cancel
                </Button>
              </Field>
            </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
