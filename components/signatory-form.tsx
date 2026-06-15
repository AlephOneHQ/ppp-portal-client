"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Check, Mail, Copy, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { contractsAPI } from "@/lib/api/contracts";
import { Alert, AlertDescription } from "./ui/alert";
import { format } from "date-fns";

interface Signatory {
  id: string;
  full_name: string;
  designation: string;
  email: string;
  status: string;
  token_expires_at: string;
  signed_at?: string;
  created_at: string;
  updated_at: string;
}

interface ContractSignatoriesResponse {
  has_pending_signatories: boolean;
  current_signatories: Signatory[];
  completed_signatories: Signatory[];
  all_signatories_completed: boolean;
}

interface SignatoryFormProps {
  contractId: string;
  onHasUnsavedChanges?: (hasChanges: boolean) => void;
  onSignatorySaved?: () => void;
  readOnly?: boolean;
  hasPrimarySignature?: boolean;
}

export function SignatoryForm({
  contractId,
  onHasUnsavedChanges,
  onSignatorySaved,
  readOnly = false,
  hasPrimarySignature = false,
}: SignatoryFormProps) {
  const [signatory, setSignatory] = useState<Signatory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Signatory>>({
    full_name: "",
    designation: "",
    email: "",
  });
  const [signatoriesData, setSignatoriesData] = useState<ContractSignatoriesResponse | null>(null);

  // Load signatory from contract
  const loadSignatory = async () => {
    try {
      setLoading(true);
      
      // Load signatories from the getContractSignatories API
      const signatoriesResponse = await contractsAPI.getContractSignatories(contractId);
      
      if (signatoriesResponse.data) {
        const data = signatoriesResponse.data as unknown as ContractSignatoriesResponse;
        setSignatoriesData(data);
        
        // Check if we have current signatories (pending/invited)
        if (data.current_signatories && data.current_signatories.length > 0) {
          // Get the first current signatory (should be the additional signatory)
          const currentSignatory = data.current_signatories[0];
          setSignatory(currentSignatory);
          setFormData({
            full_name: currentSignatory.full_name || "",
            designation: currentSignatory.designation || "",
            email: currentSignatory.email || "",
          });
        } 
        // If no current signatories, check completed signatories
        else if (data.completed_signatories && data.completed_signatories.length > 0) {
          // Get the most recently completed signatory
          const completedSignatory = data.completed_signatories[0];
          setSignatory(completedSignatory);
          setFormData({
            full_name: completedSignatory.full_name || "",
            designation: completedSignatory.designation || "",
            email: completedSignatory.email || "",
          });
        } 
        // No signatories at all
        else {
          setSignatory(null);
          setFormData({
            full_name: "",
            designation: "",
            email: "",
          });
        }
      } else {
        // No data from API
        setSignatory(null);
        setFormData({
          full_name: "",
          designation: "",
          email: "",
        });
      }
    } catch (error) {
      console.error("Error loading signatory:", error);
      toast.error("Failed to load signatory details");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (contractId) {
      loadSignatory();
    }
  }, [contractId]);

  const startEdit = () => {
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    // Reset form data to current signatory data
    if (signatory) {
      setFormData({
        full_name: signatory.full_name || "",
        designation: signatory.designation || "",
        email: signatory.email || "",
      });
    }
  };

  const handleFormChange = (field: keyof Signatory, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveSignatory = async () => {
    // Validate
    if (!formData.full_name?.trim() || !formData.designation?.trim() || !formData.email?.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email || "")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);

    try {
      // Use inviteAdditionalSignatory API to create/update signatory
      const response = await contractsAPI.inviteAdditionalSignatory(contractId, {
        full_name: formData.full_name.trim(),
        designation: formData.designation.trim(),
        email: formData.email.trim(),
      });

      toast.success("Signatory saved and invitation sent successfully");
      setEditing(false);
      await loadSignatory();
      onSignatorySaved?.();
    } catch (error: unknown) {
      console.error("Error saving signatory:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save signatory"
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const sendInvitation = async () => {
    if (!signatory) {
      toast.error("No signatory to invite");
      return;
    }

    if (!signatory.email) {
      toast.error("No email address for signatory");
      return;
    }

    setInviting(true);
    try {
      // Resend invitation using the same API
      await contractsAPI.inviteAdditionalSignatory(contractId, {
        full_name: signatory.full_name || "",
        designation: signatory.designation || "",
        email: signatory.email,
      });

      toast.success("Invitation sent successfully");
      await loadSignatory();
    } catch (error: unknown) {
      console.error("Error sending invitation:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send invitation"
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const copySignatoryDetails = async () => {
    if (!signatory) return;

    const details = [
      `Name: ${signatory.full_name || 'Not set'}`,
      `Designation: ${signatory.designation || 'Not set'}`,
      `Email: ${signatory.email || 'Not provided'}`,
      `Status: ${signatory.status || 'pending'}`,
      signatory.signed_at ? `Signed: ${format(new Date(signatory.signed_at), 'PPP')}` : null,
    ].filter(Boolean).join('\n');

    await navigator.clipboard.writeText(details);
    toast.success("Signatory details copied to clipboard");
  };

  // Check if form data is valid
  const isFormValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return formData.full_name?.trim() &&
      formData.designation?.trim() &&
      formData.email?.trim() &&
      emailRegex.test(formData.email);
  };

  // Get signatory status text
  const getStatusText = () => {
    if (!signatory) return "";
    
    if (signatory.signed_at) {
      return `Signed on ${format(new Date(signatory.signed_at), 'MMM dd, yyyy')}`;
    } else if (signatory.status === 'invited' && signatory.token_expires_at) {
      return `Invitation sent - expires ${format(new Date(signatory.token_expires_at), 'MMM dd, yyyy')}`;
    } else if (signatory.status === 'invited') {
      return 'Invitation sent - awaiting response';
    } else {
      return 'Not invited yet';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Additional Signatory</h3>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Read-only display when contract not submitted
if (readOnly || !hasPrimarySignature) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Additional Signatory</h3>
          <p className="text-sm text-muted-foreground">
            Required: Add another signatory from your organization
          </p>
        </div>
      </div>
      
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          <div className="space-y-2">
            <p className="font-medium">Submit Contract First</p>
            <p>
              You must submit the contract to OYNTCDA first before adding the required additional signatory.
              This is a mandatory requirement for the contract.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-2">Contract not yet submitted to OYNTCDA</p>
          <p className="text-sm text-amber-600">
            Submit the contract above first, then you can add the required additional signatory here.
          </p>
        </div>
      </div>
    </div>
  );
}

  // Editable form after submission
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Additional Signatory</h3>
          <p className="text-sm text-muted-foreground">
            {signatory ? "Update required additional signatory details" : "Add required additional signatory to the contract"}
          </p>
        </div>
        {signatory?.signed_at && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Signed
          </Badge>
        )}
        {signatory?.status === 'invited' && !signatory.signed_at && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Mail className="h-3 w-3 mr-1" />
            Invitation Sent
          </Badge>
        )}
      </div>
      
      {/* Success message when ready to add signatory */}
      {readOnly && hasPrimarySignature && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <div className="space-y-2">
              <p className="font-medium">Ready to Add Required Signatory</p>
              <p className="font-medium">
                The contract has been submitted to OYNTCDA. You must now add an additional signatory.
              </p>
              <p>
                This is a mandatory requirement. Enter the signatory&apos;s details below and send the invitation.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Signatory Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            {editing ? (
              <Input
                id="full-name"
                value={formData.full_name || ''}
                onChange={(e) => handleFormChange('full_name', e.target.value)}
                placeholder="John Doe"
                required
                disabled={saving}
              />
            ) : (
              <p className="font-medium">{signatory?.full_name || "Not set"}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="designation">
              Designation <span className="text-destructive">*</span>
            </Label>
            {editing ? (
              <Input
                id="designation"
                value={formData.designation || ''}
                onChange={(e) => handleFormChange('designation', e.target.value)}
                placeholder="Chief Financial Officer"
                required
                disabled={saving}
              />
            ) : (
              <p className="font-medium">{signatory?.designation || "Not set"}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            {editing ? (
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="john.doe@company.com"
                required
                disabled={saving}
              />
            ) : (
              <p className="font-medium truncate">{signatory?.email || "Not set"}</p>
            )}
          </div>
        </div>
        
        {/* Status Information */}
        {signatory && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <p className="font-medium mt-1">
                  {getStatusText()}
                </p>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Created</Label>
                <p className="font-medium mt-1">
                  {signatory.created_at ? format(new Date(signatory.created_at), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
            
            {signatory.token_expires_at && !signatory.signed_at && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Invitation expires on {format(new Date(signatory.token_expires_at), 'PPP')}
                </p>
              </div>
            )}
            
            {/* Show all signatories status if we have the data */}
            {signatoriesData && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm text-muted-foreground mb-2">All Signatories Status</Label>
                <div className="space-y-2">
                  {signatoriesData.current_signatories.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Pending: </span>
                      {signatoriesData.current_signatories.map(s => s.full_name).join(', ')}
                    </div>
                  )}
                  {signatoriesData.completed_signatories.length > 0 && (
                    <div className="text-sm text-green-600">
                      <span className="font-medium">Completed: </span>
                      {signatoriesData.completed_signatories.map(s => s.full_name).join(', ')}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {signatoriesData.all_signatories_completed 
                      ? "✓ All signatories have signed" 
                      : "Waiting for all signatories to sign"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveSignatory}
                  disabled={saving || !isFormValid()}
                  className="h-8 bg-green-600 hover:bg-green-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      Save & Send Invitation
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="h-8"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startEdit}
                  className="h-8"
                  disabled={!!signatory?.signed_at} // Disable editing if already signed
                >
                  {signatory ? (signatory.signed_at ? "View Details" : "Edit Details") : "Add Required Signatory"}
                </Button>
                
                {signatory && !signatory.signed_at && signatory.email && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={sendInvitation}
                    disabled={inviting}
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
                        Resend Invitation
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Instructions and Notes */}
      <div className="text-sm text-muted-foreground pt-2">
        <p className="font-medium mb-2">How it works:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Enter the additional signatory&apos;s full name, designation, and email</li>
          <li>Click &quot;Save & Send Invitation&quot; to send an invitation email</li>
          <li>The signatory will receive an email with a link to sign the contract</li>
          <li>They will have 3 hours to sign via the link in the email</li>
          <li>Once signed, the contract will be updated with their signature</li>
          <li>You can download the updated contract PDF after they sign</li>
        </ul>
      </div>
    </div>
  );
}