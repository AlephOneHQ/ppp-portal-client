"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, CheckCircle, Mail, Eye, XCircle, Shield, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { digitalSignaturesAPI, type AuditTrailEntry } from "@/lib/api/digital-signatures"
import { toast } from "sonner"

interface AuditTrailViewerProps {
  contractId: string
}

const actionIcons: Record<string, React.ReactNode> = {
  document_created: <FileText className="h-4 w-4" />,
  document_sent: <Mail className="h-4 w-4" />,
  invitation_sent: <Mail className="h-4 w-4" />,
  document_viewed: <Eye className="h-4 w-4" />,
  signature_added: <CheckCircle className="h-4 w-4" />,
  signature_declined: <XCircle className="h-4 w-4" />,
  document_completed: <CheckCircle className="h-4 w-4" />,
  witness_invited: <Mail className="h-4 w-4" />,
  verification_performed: <Shield className="h-4 w-4" />,
}

const actionColors: Record<string, string> = {
  document_created: "bg-blue-100 text-blue-800",
  document_sent: "bg-purple-100 text-purple-800",
  invitation_sent: "bg-indigo-100 text-indigo-800",
  document_viewed: "bg-gray-100 text-gray-800",
  signature_added: "bg-green-100 text-green-800",
  signature_declined: "bg-red-100 text-red-800",
  document_completed: "bg-emerald-100 text-emerald-800",
  witness_invited: "bg-cyan-100 text-cyan-800",
  verification_performed: "bg-amber-100 text-amber-800",
}

export function AuditTrailViewer({ contractId }: AuditTrailViewerProps) {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuditTrail()
  }, [contractId])

  const loadAuditTrail = async () => {
    try {
      setLoading(true)
      const response = await digitalSignaturesAPI.getAuditTrail(contractId)
      setEntries(response.data || [])
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Error loading audit trail:", error)
      toast.error(err.message || "Failed to load audit trail")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Complete history of all document actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Shield className="h-5 w-5" />
          Audit Trail
        </CardTitle>
        <CardDescription className="text-sm">
          Complete history of all document actions with timestamps and verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] sm:h-[500px] pr-2 sm:pr-4">
          <div className="space-y-3 sm:space-y-4">
            {entries.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm sm:text-base">No audit trail entries yet</p>
              </div>
            ) : (
              entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="relative pl-6 sm:pl-8 pb-3 sm:pb-4 border-l-2 border-gray-200 last:border-l-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                    <div
                      className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                        actionColors[entry.action_type] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {actionIcons[entry.action_type] || <FileText className="h-3 w-3 sm:h-4 sm:w-4" />}
                    </div>
                  </div>

                  {/* Entry content */}
                  <div className="ml-2 sm:ml-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{entry.action_type_display}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{entry.action_description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs whitespace-nowrap w-fit">
                        {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Actor:</span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="break-all">
                            {entry.actor_name}
                            {entry.actor_email && ` (${entry.actor_email})`}
                          </span>
                          <Badge variant="secondary" className="text-xs w-fit">
                            {entry.actor_type}
                          </Badge>
                        </div>
                      </div>

                      {entry.signer_name && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium">Signer:</span>
                          <span className="break-all">{entry.signer_name}</span>
                        </div>
                      )}

                      {entry.ip_address && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium">IP Address:</span>
                          <span className="font-mono text-xs break-all">{entry.ip_address}</span>
                        </div>
                      )}

                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium hover:text-foreground text-xs sm:text-sm">
                            Additional Details
                          </summary>
                          <div className="mt-1 pl-2 sm:pl-4 space-y-1">
                            {Object.entries(entry.metadata).map(([key, value]) => (
                              <div key={key} className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                <span className="font-medium">{key}:</span>
                                <span className="break-all text-xs">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-900 mb-1 text-sm sm:text-base">Audit Trail Features:</p>
            <ul className="text-blue-800 space-y-1 text-xs sm:text-sm">
              <li>✓ Immutable record of all document actions</li>
              <li>✓ Timestamps for every event</li>
              <li>✓ IP address and user agent tracking</li>
              <li>✓ Signer UUID for verification</li>
              <li>✓ Legal compliance (eIDAS, ESIGN, UETA)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
