"use client"

import { use, useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, RotateCcw } from "lucide-react"

export default function MobileSignaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isDrawing, setIsDrawing] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

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
  }, [])

  const startDrawing = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (ctx) {
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
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

  const handleSubmit = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Check if canvas is empty
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const isEmpty = !imageData.data.some((channel) => channel !== 0)

    if (isEmpty) {
      alert("Please draw your signature")
      return
    }

    const dataUrl = canvas.toDataURL("image/png")

    try {
      const response = await fetch(`/api/signature/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signature: dataUrl }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        alert("Failed to submit signature")
      }
    } catch (error) {
      console.error("Error submitting signature:", error)
      alert("Failed to submit signature")
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Signature Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your signature has been successfully submitted. You can close this window now.
          </p>
          <Button onClick={() => router.push("/")} className="w-full">
            Done
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col p-4">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Draw Your Signature</h1>
          <p className="text-muted-foreground">
            Use your finger or stylus to draw your signature below
          </p>
        </div>

        <Card className="flex-1 flex flex-col p-4 mb-4">
          <canvas
            ref={canvasRef}
            className="flex-1 w-full border-2 border-dashed rounded-lg bg-white cursor-crosshair touch-none"
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={clearCanvas} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Submit Signature
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Your signature will be securely transmitted and added to the document
        </p>
      </div>
    </div>
  )
}
