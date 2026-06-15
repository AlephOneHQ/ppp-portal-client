"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2, Mail, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { digitalSignaturesAPI } from "@/lib/api/digital-signatures"

interface WitnessInvitationFormProps {
  contractId: string
  witnessType: "admin_witness" | "partner_witness"
  onWitnessInvited?: () => void
  existingWitness?: {
    id: string
    signer_name: string
    signer_email: string
    status: string
    signed_at?: string
  } | null
}

interface AdminUser {
  id: string
  email: string
  full_name: string
  designation: string
}

export function WitnessInvitationForm({
  contractId,
  witnessType,
  onWitnessInvited,
  existingWitness,
}: WitnessInvitationFormProps) {
  const [loading, setLoading] = useState(false)
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [selectedAdminId, setSelectedAdminId] = useState<string>("")
  const [formData, setFormData] = useState({
    witness_name: "",
    witness_email: "",
    witness_designation: "",
  })
  const [invitedWitness, setInvitedWitness] = useState<string | null>(null)

  // Load admin users if this is for admin witness
  useEffect(() => {
    if (witnessType === "admin_witness") {
      loadAdminUsers()
    }
  }, [witnessType])

  const loadAdminUsers = async () => {
    try {
      setLoadingAdmins(true)
      const response = await digitalSignaturesAPI.getAdminUsers()
      if (response.success && response.data) {
        setAdminUsers(response.data)
      }
    } catch (error) {
      console.error("Failed to load admin users:", error)
    } finally {
      setLoadingAdmins(false)
    }
  }

  const handleAdminSelect = (adminId: string) => {
    setSelectedAdminId(adminId)
    const selectedAdmin = adminUsers.find(admin => admin.id === adminId)
    if (selectedAdmin) {
      setFormData({
        witness_name: selectedAdmin.full_name,
        witness_email: selectedAdmin.email,
        witness_designation: selectedAdmin.designation || "Admin Witness",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.witness_name.trim() || !formData.witness_email.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)

      const response = await digitalSignaturesAPI.inviteWitness(contractId, {
        witness_name: formData.witness_name,
        witness_email: formData.witness_email,
        witness_designation: formData.witness_designation,
        witness_type: witnessType,
      })

      if (response.data) {
        toast.success("Witness invitation sent successfully")
        setInvitedWitness(formData.witness_name)
        setFormData({
          witness_name: "",
          witness_email: "",
          witness_designation: "",
        })
        setSelectedAdminId("")
        onWitnessInvited?.()
      } else {
        throw new Error("Failed to send invitation")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send witness invitation"
      toast.error(errorMessage)
      console.error("Witness invitation error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <UserPlus className="h-5 w-5" />
          Invite Witness
        </CardTitle>
        <CardDescription className="text-sm">
          {witnessType === "admin_witness"
            ? "Invite another admin to witness and sign this contract"
            : "Invite a witness to sign this contract on behalf of your organization"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show existing witness if present */}
        {existingWitness && !invitedWitness && (
          <div className={`p-3 sm:p-4 rounded-lg border-2 ${
            existingWitness.status === 'signed' 
              ? 'bg-green-50 border-green-500' 
              : 'bg-blue-50 border-blue-500'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{existingWitness.signer_name}</p>
                <p className="text-sm text-gray-600 truncate">{existingWitness.signer_email}</p>
                {existingWitness.signed_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Signed on {new Date(existingWitness.signed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge 
                variant={existingWitness.status === 'signed' ? 'default' : 'secondary'}
                className="w-fit shrink-0"
              >
                {existingWitness.status === 'signed' ? 'Signed' : 'Pending'}
              </Badge>
            </div>
            
            {existingWitness.status !== 'signed' && (
              <p className="text-xs text-muted-foreground mt-3">
                You can invite a different witness below. The current invitation will be replaced.
              </p>
            )}
          </div>
        )}

        {existingWitness?.status === 'signed' ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-sm sm:text-base">Witness has already signed</p>
            <p className="text-xs sm:text-sm">Cannot change witness after signing</p>
          </div>
        ) : invitedWitness ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-green-900 text-sm sm:text-base">Invitation Sent</p>
              <p className="text-sm text-green-700">
                An email invitation has been sent to {invitedWitness}. They will receive a secure
                link to sign the document.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs sm:text-sm"
                onClick={() => setInvitedWitness(null)}
              >
                Invite Another Witness
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {witnessType === "admin_witness" ? (
              // Admin witness: Show dropdown
              <>
                <div className="space-y-2">
                  <Label htmlFor="admin_select">
                    Select Admin <span className="text-red-500">*</span>
                  </Label>
                  {loadingAdmins ? (
                    <div className="flex items-center justify-center p-4 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading admins...</span>
                    </div>
                  ) : (
                    <Select value={selectedAdminId} onValueChange={handleAdminSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an admin to invite" />
                      </SelectTrigger>
                      <SelectContent>
                        {adminUsers.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{admin.full_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {admin.designation ? `${admin.designation} · ` : ""}{admin.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedAdminId && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-0.5">
                    <p className="text-sm font-medium text-blue-900">Selected Admin:</p>
                    <p className="text-sm text-blue-800 font-semibold">{formData.witness_name}</p>
                    {formData.witness_designation && (
                      <p className="text-xs text-blue-700">{formData.witness_designation}</p>
                    )}
                    <p className="text-xs text-blue-600">{formData.witness_email}</p>
                  </div>
                )}
              </>
            ) : (
              // Partner witness: Show manual input
              <>
                <div className="space-y-2">
                  <Label htmlFor="witness_name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="witness_name"
                    name="witness_name"
                    value={formData.witness_name}
                    onChange={handleChange}
                    placeholder="Enter witness full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="witness_email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="witness_email"
                    name="witness_email"
                    type="email"
                    value={formData.witness_email}
                    onChange={handleChange}
                    placeholder="witness@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="witness_designation">Designation (Optional)</Label>
                  <Input
                    id="witness_designation"
                    name="witness_designation"
                    value={formData.witness_designation}
                    onChange={handleChange}
                    placeholder="e.g., Legal Counsel, Director"
                  />
                </div>
              </>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-900 mb-1 text-sm sm:text-base">What happens next?</p>
              <ul className="text-blue-800 space-y-1 text-xs sm:text-sm">
                <li>• Witness receives an email with a secure signing link</li>
                <li>• Link is valid for 72 hours</li>
                <li>• Witness can sign without needing portal access</li>
                <li>• Digital signature with certified timestamp is created</li>
                <li>• All actions are recorded in the audit trail</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full text-sm" 
              disabled={loading || (witnessType === "admin_witness" && !selectedAdminId)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
