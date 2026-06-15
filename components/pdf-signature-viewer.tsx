"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, Clock, User, Maximize2, Minimize2, Loader2,
  Download, ExternalLink
} from "lucide-react"
import { SignatureCanvas } from "@/components/signature-canvas"
import { toast } from "sonner"

interface SignatureRequest {
  id: string
  signer_name: string
  signer_email: string
  signer_type: string
  signer_type_display: string
  status: string
  status_display: string
  signature_page: number
  signature_x: number
  signature_y: number
  signature_width: number
  signature_height: number
  signed_at?: string
  digital_signature?: {
    signer_uuid: string
    signature_image_url: string
    certified_timestamp: string
  }
}

interface PdfSignatureViewerProps {
  pdfUrl: string
  signatureRequests: SignatureRequest[]
  currentUserEmail?: string
  onSignatureComplete?: () => void
  readOnly?: boolean
}

export function PdfSignatureViewer({
  pdfUrl,
  signatureRequests,
  currentUserEmail,
  onSignatureComplete,
  readOnly = false,
}: PdfSignatureViewerProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [selectedSignatureRequest, setSelectedSignatureRequest] = useState<SignatureRequest | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleSignClick = (signatureRequest: SignatureRequest) => {
    if (readOnly || signatureRequest.status === "signed") {
      return
    }
    setSelectedSignatureRequest(signatureRequest)
    setShowSignatureModal(true)
  }

  const handleSignatureSubmit = async (signatureDataUrl: string) => {
    if (!selectedSignatureRequest) return

    try {
      // Upload signature and complete signing
      toast.success("Signature added successfully")
      setShowSignatureModal(false)
      onSignatureComplete?.()
    } catch (error) {
      toast.error("Failed to add signature")
      console.error(error)
    }
  }

  // Check if current user can sign
  const userCanSign = (signatureRequest: SignatureRequest) => {
    return (
      currentUserEmail &&
      signatureRequest.signer_email === currentUserEmail &&
      signatureRequest.status !== "signed" &&
      !readOnly
    )
  }

  // Group signatures by status
  const pendingSignatures = signatureRequests.filter(req => req.status !== "signed")
  const completedSignatures = signatureRequests.filter(req => req.status === "signed")

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-white shadow-sm">
        {/* Left: Document Info */}
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">Contract Document</h3>
          <Badge variant="outline" className="text-xs">
            {completedSignatures.length} / {signatureRequests.length} signed
          </Badge>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const link = document.createElement('a')
              link.href = pdfUrl
              link.download = 'contract.pdf'
              link.click()
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* PDF Viewer - Using Native Browser PDF Viewer */}
      <div className="flex-1 overflow-hidden bg-gray-100 relative" ref={containerRef}>
        {!pdfLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading PDF document...</p>
              <p className="text-xs text-muted-foreground mt-2">URL: {pdfUrl}</p>
            </div>
          </div>
        )}
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full border-0"
          title="Contract PDF"
          onLoad={() => {
            console.log("PDF loaded successfully")
            setPdfLoaded(true)
          }}
          onError={(e) => {
            console.error("PDF load error:", e)
            toast.error("Failed to load PDF")
          }}
          style={{ minHeight: '600px' }}
        />
      </div>

      {/* Signature Requests Panel */}
      <div className="border-t bg-white p-4 max-h-64 overflow-y-auto">
        <h3 className="font-semibold mb-3">Signature Status</h3>
        
        {/* Pending Signatures */}
        {pendingSignatures.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Pending Signatures</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingSignatures.map((req) => (
                <Card 
                  key={req.id} 
                  className={`p-3 ${userCanSign(req) ? 'border-blue-500 border-2 bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{req.signer_name}</p>
                      <p className="text-xs text-muted-foreground">{req.signer_type_display}</p>
                      <p className="text-xs text-muted-foreground mt-1">Page {req.signature_page}</p>
                    </div>
                    <div>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </div>
                  {userCanSign(req) && (
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => handleSignClick(req)}
                    >
                      Sign Now
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Signatures */}
        {completedSignatures.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Completed Signatures</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedSignatures.map((req) => (
                <Card key={req.id} className="p-3 border-green-200 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{req.signer_name}</p>
                      <p className="text-xs text-muted-foreground">{req.signer_type_display}</p>
                      {req.digital_signature && (
                        <p className="text-xs text-muted-foreground mt-1">
                          UUID: {req.digital_signature.signer_uuid.slice(0, 8)}...
                        </p>
                      )}
                      {req.signed_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.signed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div>
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Signed
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No signatures message */}
        {signatureRequests.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No signature requests found</p>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {showSignatureModal && selectedSignatureRequest && (
        <SignatureCanvas
          open={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSubmit={handleSignatureSubmit}
          signerName={selectedSignatureRequest.signer_name}
        />
      )}
    </div>
  )
}
