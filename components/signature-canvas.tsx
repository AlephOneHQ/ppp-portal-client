"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Pen, Upload, Type, RotateCcw, QrCode } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

interface SignatureCanvasProps {
  open: boolean
  onClose: () => void
  onSubmit: (signatureDataUrl: string) => void
  signerName: string
}

export function SignatureCanvas({ open, onClose, onSubmit, signerName }: SignatureCanvasProps) {
  const [activeTab, setActiveTab] = useState("draw")
  const [isDrawing, setIsDrawing] = useState(false)
  const [typedSignature, setTypedSignature] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [signatureId] = useState(() => `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [signatureUrl, setSignatureUrl] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSignatureUrl(`${window.location.origin}/mobile-sign/${signatureId}`)
    }
  }, [signatureId])

  useEffect(() => {
    if (!showQR) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      return
    }

    const checkForSignature = async () => {
      try {
        const response = await fetch(`/api/signature/${signatureId}`)
        if (response.ok) {
          const { data } = await response.json()
          if (data) {
            onSubmit(data)
            setShowQR(false)
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
            }
          }
        }
      } catch (error) {
        console.error("Error checking for signature:", error)
      }
    }

    pollingIntervalRef.current = setInterval(checkForSignature, 2000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [showQR, signatureId, onSubmit])

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
      }
    }
  }, [open])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
    }
  }

  const startDrawingTouch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const drawTouch = (clientX: number, clientY: number) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const generateTypedSignature = () => {
    if (!typedSignature.trim()) {
      toast.error("Please enter your name")
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = 400
    canvas.height = 150
    const ctx = canvas.getContext("2d")

    if (ctx) {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = "48px 'Brush Script MT', cursive"
      ctx.fillStyle = "#000000"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2)

      return canvas.toDataURL("image/png")
    }
    return null
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    let signatureDataUrl: string | null | undefined = null

    if (activeTab === "draw") {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Check if canvas is empty
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const isEmpty = !imageData.data.some((channel) => channel !== 0)

      if (isEmpty) {
        toast.error("Please draw your signature")
        return
      }

      signatureDataUrl = canvas.toDataURL("image/png")
    } else if (activeTab === "type") {
      signatureDataUrl = generateTypedSignature()
      if (!signatureDataUrl) {
        toast.error("Please enter your name")
        return
      }
    } else if (activeTab === "upload") {
      if (!uploadedImage) {
        toast.error("Please upload a signature image")
        return
      }
      signatureDataUrl = uploadedImage
    }

    if (signatureDataUrl) {
      onSubmit(signatureDataUrl)
    }
  }

  if (showQR) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Scan QR Code to Sign</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Signing as: <span className="font-medium">{signerName}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center p-4 sm:p-6 bg-white rounded-lg border">
              {signatureUrl && <QRCodeSVG value={signatureUrl} size={isMobile ? 200 : 256} level="H" />}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with your mobile device to sign. The signature will appear automatically.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              Waiting for signature...
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQR(false)} className="w-full sm:w-auto text-sm">
              Back to Other Options
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Add Your Signature</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Signing as: <span className="font-medium">{signerName}</span>
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="draw" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
              <Pen className="h-4 w-4" />
              <span>Draw</span>
            </TabsTrigger>
            <TabsTrigger value="type" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
              <Type className="h-4 w-4" />
              <span>Type</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
              <Upload className="h-4 w-4" />
              <span>Upload Signature</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
              <QrCode className="h-4 w-4" />
              <span>QR Code</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div className="border rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                width={isMobile ? 350 : 600}
                height={isMobile ? 150 : 200}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => {
                  e.preventDefault()
                  const touch = e.touches[0]
                  if (touch) {
                    startDrawingTouch(touch.clientX, touch.clientY)
                  }
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  const touch = e.touches[0]
                  if (touch) {
                    drawTouch(touch.clientX, touch.clientY)
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  stopDrawing()
                }}
              />
            </div>
            <Button variant="outline" onClick={clearCanvas} className="w-full text-sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typed-signature" className="text-sm">Type your full name</Label>
              <Input
                id="typed-signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Enter your full name"
                className="text-base sm:text-lg"
              />
            </div>
            {typedSignature && (
              <div className="border rounded-lg bg-white p-4 sm:p-8 text-center overflow-hidden">
                <p
                  style={{
                    fontFamily: "'Brush Script MT', cursive",
                    fontSize: isMobile ? "32px" : "48px",
                    color: "#000000",
                    wordBreak: "break-word"
                  }}
                >
                  {typedSignature}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature-upload" className="text-sm">Upload signature image</Label>
              <Input
                id="signature-upload"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="text-sm"
              />
            </div>
            {uploadedImage && (
              <div className="border rounded-lg bg-white p-4">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-32 sm:max-h-48 mx-auto"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="p-4 sm:p-8 border-2 border-dashed rounded-lg bg-muted/30">
                <QrCode className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Use your mobile device for more precise signature drawing
                </p>
                <Button onClick={() => setShowQR(true)} className="w-full text-sm">
                  Generate QR Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A QR code will be generated that you can scan with your mobile device to draw your signature
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-sm">
          <p className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Digital Signature Features:</p>
          <ul className="text-blue-800 space-y-1 text-xs sm:text-sm">
            <li>✓ Certified with SHA-256 hash</li>
            <li>✓ Qualified timestamp (eIDAS compliant)</li>
            <li>✓ Unique Signer Identifier (UUID)</li>
            <li>✓ Complete audit trail</li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={activeTab === "qr"} className="w-full sm:w-auto text-sm">
            Add Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
