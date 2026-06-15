"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { contractsAPI } from "@/lib/api/contracts";
import { AlertCircle, Mail, Clock, CheckCircle, Loader2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsAPI } from "@/lib/api/settings";

interface AdminUser {
  id: string;
  email: string;
  is_active: boolean;
  role: string;
  created_at: string;
}

interface AdminSignatory {
  id: string;
  admin: string;
  admin_email: string;
  status: string;
  token_expires_at: string;
  signed_at?: string;
  invited_at: string;
  created_at: string;
  updated_at: string;
  assigned_by: string;
  assigned_by_email: string;
}

interface AdminSignatoryFormProps {
  contractId: string;
  onSignatoryAssigned?: () => void;
  currentUserId: string;
  currentUserEmail: string;
  currentUserName: string;
  readOnly?: boolean;
  hasPartnerSigned?: boolean;
}

// Helper function to check if an object is empty
const isEmptyObject = (obj: unknown): boolean => {
  return !!obj && typeof obj === 'object' && Object.keys(obj as Record<string, unknown>).length === 0 && (obj as Record<string, unknown>).constructor === Object;
};

export function AdminSignatoryForm({
  contractId,
  onSignatoryAssigned,
  currentUserId,
  readOnly = false,
  hasPartnerSigned = false,
}: AdminSignatoryFormProps) {
  const [adminSignatory, setAdminSignatory] = useState<AdminSignatory | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");

  // Load admin signatory
  const loadAdminSignatory = async () => {
    try {
      setLoading(true);
      const response = await contractsAPI.getAdminSignatory(contractId);

      // Check if data is empty object
      if (response.data && !isEmptyObject(response.data) && response.data.id) {
        setAdminSignatory(response.data);
      } else {
        setAdminSignatory(null);
      }
    } catch (error) {
      console.error("Error loading admin signatory:", error);
      toast.error("Failed to load admin signatory details");
      setAdminSignatory(null);
    } finally {
      setLoading(false);
    }
  };

  // Load admins list
  const loadAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const response = await settingsAPI.listAdmins();
      setAdmins(response.data || []);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast.error("Failed to load admins list");
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (contractId) {
      loadAdminSignatory();
    }
  }, [contractId]);

  // Load admins when assign form is shown
  useEffect(() => {
    if (showAssignForm && admins.length === 0) {
      loadAdmins();
    }
  }, [showAssignForm]);

  const handleAssignAdmin = async () => {
    if (!selectedAdminId) {
      toast.error("Please select an admin to assign");
      return;
    }

    // Find the selected admin
    const selectedAdmin = admins.find(admin => admin.id === selectedAdminId);
    if (!selectedAdmin) {
      toast.error("Selected admin not found");
      return;
    }

    // Don't allow assigning yourself
    if (selectedAdmin.id === currentUserId) {
      toast.error("You cannot assign yourself as additional signatory");
      return;
    }

    setAssigning(true);
    try {
      await contractsAPI.assignAdminSignatory(contractId, selectedAdminId);

      toast.success("Admin signatory assigned successfully");
      setShowAssignForm(false);
      setSelectedAdminId("");

      // Reload the admin signatory
      await loadAdminSignatory();

      onSignatoryAssigned?.();
    } catch (error: unknown) {
      console.error("Error assigning admin signatory:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit admin signature"
      toast.error(errorMessage);
    } finally {
      setAssigning(false);
    }
  };

  const sendInvitation = async () => {
    if (!adminSignatory) {
      toast.error("No admin signatory assigned");
      return;
    }

    // Check if partner has signed
    if (!hasPartnerSigned) {
      toast.error("Partner must sign before sending admin invitation");
      return;
    }

    setInviting(true);
    try {
      await contractsAPI.sendAdminSignInvitation(contractId);
      toast.success("Admin invitation sent successfully");
      await loadAdminSignatory();
    } catch (error: unknown) {
      console.error("Error sending admin invitation:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send admin invitation"
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const copyAdminDetails = async () => {
    if (!adminSignatory) return;

    const details = [
      `Admin: ${adminSignatory.admin}`,
      `Email: ${adminSignatory.admin_email}`,
      `Status: ${adminSignatory.status || 'pending'}`,
      `Assigned by: ${adminSignatory.assigned_by} (${adminSignatory.assigned_by_email})`,
      adminSignatory.invited_at ? `Invited: ${format(new Date(adminSignatory.invited_at), 'PPP')}` : null,
      adminSignatory.signed_at ? `Signed: ${format(new Date(adminSignatory.signed_at), 'PPP')}` : null,
    ].filter(Boolean).join('\n');

    await navigator.clipboard.writeText(details);
    toast.success("Admin signatory details copied to clipboard");
  };

  // Filter out current user from the admins list
  const availableAdmins = admins.filter(admin => admin.id !== currentUserId);

  // Check if we have a valid admin signatory
  const hasAdminSignatory = adminSignatory && adminSignatory.id;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Admin Signatory</h3>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Read-only display
  if (readOnly) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Admin Signatory</h3>
          {hasAdminSignatory && adminSignatory.status === 'signed' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Signed
            </Badge>
          )}
        </div>

        {!hasAdminSignatory ? (
          <div className="text-center py-8 border rounded-lg bg-muted/30">
            <p className="text-muted-foreground">No admin signatory assigned</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-sm text-muted-foreground">Admin Id</Label>
                <p className="font-medium mt-1">{adminSignatory.admin}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="font-medium mt-1 truncate">{adminSignatory.admin_email}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Assigned By</Label>
                <p className="font-medium mt-1">{adminSignatory.assigned_by}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <p className="font-medium mt-1">
                  {adminSignatory.signed_at
                    ? 'Signed'
                    : adminSignatory.token_expires_at
                      ? 'Invitation Sent'
                      : 'Pending'
                  }
                </p>
              </div>
            </div>

            {adminSignatory.signed_at && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-green-600">
                  Signed on: {format(new Date(adminSignatory.signed_at), 'PPP')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Editable form for admin
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Additional Admin Signatory</h3>
          <p className="text-sm text-muted-foreground">
            Assign an additional admin to sign this contract
          </p>
        </div>
        {hasAdminSignatory && adminSignatory.status === 'signed' && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Signed
          </Badge>
        )}
      </div>

      {/* Admin Signatory Details */}
      {hasAdminSignatory ? (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold">Assigned By</p>
                <p className="font-medium">{adminSignatory.assigned_by_email}</p>
                <p className="text-sm text-muted-foreground">{adminSignatory.assigned_by}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Invitee Email</p>
                <p>{adminSignatory.admin_email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={`text-xs ${adminSignatory.signed_at
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : adminSignatory.token_expires_at && !adminSignatory.signed_at
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                >
                  {adminSignatory.signed_at
                    ? `Signed on ${format(new Date(adminSignatory.signed_at), 'MMM dd, yyyy')}`
                    : adminSignatory.token_expires_at
                      ? `Invitation expires ${format(new Date(adminSignatory.token_expires_at), 'MMM dd, yyyy')}`
                      : 'Assigned - Not invited yet'
                  }
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Invitee Id</p>
                <p>
                  {adminSignatory.admin}
                </p>
              </div>
            </div>
          </div>

          {adminSignatory.token_expires_at && !adminSignatory.signed_at && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-sm text-amber-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Invitation expires on {format(new Date(adminSignatory.token_expires_at), 'PPP')}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <div className="flex items-center gap-2">
              {!adminSignatory.signed_at && (
                <Button
                  type="button"
                  size="sm"
                  onClick={sendInvitation}
                  disabled={inviting || !hasPartnerSigned}
                  className="h-8"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      {adminSignatory.token_expires_at ? 'Resend Invitation' : 'Send Invitation'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid justify-center text-center py-8 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">No additional admin signatory assigned</p>
          <Button
            type="button"
            onClick={() => setShowAssignForm(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Assign Admin Signatory
          </Button>
        </div>
      )}

      {/* Assign Admin Form */}
      {showAssignForm && (
        <div className="border rounded-lg p-4 border-blue-200 bg-blue-50/30 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Select Admin to Assign</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAssignForm(false);
                setSelectedAdminId("");
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-select">
                Select Admin <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedAdminId}
                onValueChange={setSelectedAdminId}
                disabled={assigning || loadingAdmins}
              >
                <SelectTrigger id="admin-select" className="w-full">
                  <SelectValue placeholder={loadingAdmins ? "Loading admins..." : "Select an admin"} />
                </SelectTrigger>
                <SelectContent>
                  {availableAdmins.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {loadingAdmins ? "Loading..." : "No admins available"}
                    </SelectItem>
                  ) : (
                    availableAdmins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        <div className="flex flex-col">
                          <span>{admin.email}</span>
                          <span className="text-xs text-muted-foreground">
                            Active • {admin.role}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedAdminId && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> The selected admin will receive an invitation email to sign the contract.
                  You can send the invitation after assignment.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAssignAdmin}
              disabled={assigning || !selectedAdminId || loadingAdmins}
              className="h-8"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Assign Admin
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Instructions and Notes */}
      <div className="text-sm text-muted-foreground pt-2">
        <p className="font-medium mb-2">How it works:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Select an admin from the dropdown list to assign as additional signatory</li>
          <li>After assignment, you can send an invitation email to the admin</li>
          <li>The admin will have 3 hours to sign via the link in the email</li>
          <li>You can resend invitations if needed</li>
          <li>Once signed, the contract status will update automatically</li>
        </ul>
      </div>

      {/* Warning if partner hasn't signed */}
      {!hasPartnerSigned && hasAdminSignatory && !adminSignatory.signed_at && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Partner must sign before sending admin invitations.
            You have assigned an admin, but invitations can only be sent after partner signature.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}