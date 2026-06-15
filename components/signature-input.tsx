"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UploadIcon, X } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

interface SignatureInputProps {
    value?: string
    onChange?: (signature: string) => void
    label?: string
    required?: boolean
    disabled?: boolean
}

export function SignatureInput({
    value,
    onChange,
    label = "Signature",
    required = false,
    disabled = false
}: SignatureInputProps) {
    const [showQR, setShowQR] = useState(false)
    const [showDrawing, setShowDrawing] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)
    const [signatureId] = useState(() => `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    const [signatureUrl, setSignatureUrl] = useState("")
    const [isMobile, setIsMobile] = useState(false)
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

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
            setSignatureUrl(`${window.location.origin}/sign/${signatureId}`)
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
                    if (data && onChange) {
                        onChange(data)
                        setShowQR(false)
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current)
                        }
                    }
                }
            } catch (error) {
                console.error("[v0] Error checking for signature:", error)
            }
        }

        pollingIntervalRef.current = setInterval(checkForSignature, 2000)

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
            }
        }
    }, [showQR, signatureId, onChange])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !showDrawing) return

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect()
            const dpr = window.devicePixelRatio || 1
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            const ctx = canvas.getContext("2d")
            if (ctx) {
                ctx.scale(dpr, dpr)
                ctx.strokeStyle = "#000000"
                ctx.lineWidth = 2
                ctx.lineCap = "round"
                ctx.lineJoin = "round"
            }
        }

        resizeCanvas()
        window.addEventListener("resize", resizeCanvas)
        return () => window.removeEventListener("resize", resizeCanvas)
    }, [showDrawing])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const file = e.target.files?.[0]
        if (!file) return

        if (
            !file.type.match(
                /image\/(png|jpg|jpeg)|application\/(pdf|vnd.openxmlformats-officedocument.wordprocessingml.document)/,
            )
        ) {
            alert("Please upload a PDF, DOCX, JPG, or PNG file")
            return
        }

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert("File size must be less than 5MB")
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            if (onChange) {
                onChange(dataUrl)
            }
        }
        reader.readAsDataURL(file)
    }

    const clearSignature = async () => {
        if (disabled) return;
        if (onChange) {
            onChange("")
        }
        // Delete from database
        try {
            await fetch(`/api/signature/${signatureId}`, {
                method: "DELETE",
            })
        } catch (error) {
            console.error("[v0] Error deleting signature:", error)
        }
    }

    const handleDraw = () => {
        if (disabled) return;
        if (isMobile) {
            // On mobile, still redirect to full page for better experience
            window.location.href = `/sign/${signatureId}`
        } else {
            // On desktop, show inline drawing canvas
            setShowDrawing(true)
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (disabled) return;
        const canvas = canvasRef.current
        if (!canvas) return

        setIsDrawing(true)
        const rect = canvas.getBoundingClientRect()
        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.beginPath()
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
        }
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || disabled) return;

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
            ctx.stroke()
        }
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const saveDrawing = () => {
        if (disabled) return;
        const canvas = canvasRef.current
        if (!canvas) return

        const dataUrl = canvas.toDataURL("image/png")
        if (onChange) {
            onChange(dataUrl)
        }
        setShowDrawing(false)
    }

    const clearCanvas = () => {
        if (disabled) return;
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
    }

    return (
        <div className="space-y-2">
            {value && value !== "NIL" ? (
                <Card className="relative p-4">
                    {!disabled && (
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={clearSignature}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <img
                        src={value || "/placeholder.png"}
                        onError={(e) => {
                            e.currentTarget.src = "/placeholder.png";
                        }}
                        alt="signature"
                        style={{
                            height: "120px",
                            width: "auto",
                            objectFit: "contain",
                        }}
                    />

                </Card>
            ) : showDrawing ? (
                <Card className="p-4 space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Draw your signature below:</p>
                        <canvas
                            ref={canvasRef}
                            className="w-full h-48 border rounded-lg bg-white cursor-crosshair touch-none"
                            onMouseDown={disabled ? undefined : startDrawing}
                            onMouseMove={disabled ? undefined : draw}
                            onMouseUp={disabled ? undefined : stopDrawing}
                            onMouseLeave={disabled ? undefined : stopDrawing}
                        />
                    </div>
                    {!disabled && (
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={clearCanvas}>
                                Clear
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowDrawing(false)
                                    clearCanvas()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="button" onClick={saveDrawing}>
                                Save Signature
                            </Button>
                        </div>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Upload option */}
                    <div
                        className={`flex flex-col items-center justify-center p-6 border rounded-lg transition-colors min-h-[120px] ${disabled
                            ? "bg-muted/10 cursor-not-allowed opacity-50"
                            : "bg-muted/30 cursor-pointer hover:bg-muted/50"
                            }`}
                        onClick={disabled ? undefined : () => fileInputRef.current?.click()}
                    >
                        <div className={`flex items-center justify-center w-12 h-12 rounded-lg border mb-3 ${disabled ? "bg-muted/20" : "bg-background"
                            }`}>
                            <UploadIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-center text-muted-foreground leading-relaxed">
                            {disabled
                                ? "Signature input disabled"
                                : "Drag and drop document. Or browse to upload (.pdf, .docx, .jpg, and .png up to 5 MB max)"
                            }
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.jpg,.jpeg,.png,image/png,image/jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={disabled}
                        />
                    </div>

                    {/* Draw option */}
                    {isMobile && (
                        <div
                            className={`flex items-center justify-center p-6 border rounded-lg transition-colors min-h-[120px] ${disabled
                                ? "bg-muted/10 cursor-not-allowed opacity-50"
                                : "bg-background cursor-pointer hover:bg-muted/30"
                                }`}
                            onClick={disabled ? undefined : handleDraw}
                        >
                            <p className="text-sm text-center text-muted-foreground leading-relaxed">
                                {disabled
                                    ? "Signature input disabled"
                                    : "Use your mouse, trackpad, or touchscreen to draw your signature"
                                }
                            </p>
                        </div>
                    )}

                    {/* QR code option - only show on desktop */}
                    {!isMobile && (
                        <div
                            className={`flex items-center justify-center p-6 border-2 rounded-lg transition-colors min-h-[120px] ${disabled
                                ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-50"
                                : "border-red-500 bg-red-50 cursor-pointer hover:bg-red-100"
                                }`}
                            onClick={disabled ? undefined : () => setShowQR(true)}
                        >
                            <p className={`text-sm text-center font-medium leading-relaxed ${disabled ? "text-gray-600" : "text-red-600"
                                }`}>
                                {disabled
                                    ? "Signature input disabled"
                                    : "Scan QR code to draw on your device"
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={showQR} onOpenChange={setShowQR}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Scan QR Code to Sign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex justify-center p-6 bg-white rounded-lg">
                            {signatureUrl && <QRCodeSVG value={signatureUrl} size={256} level="H" />}
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                            Scan this QR code with your mobile device to sign. The signature will appear here automatically.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                            Waiting for signature...
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}