"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Undo2 } from "lucide-react"
import { toast } from "sonner"

export default function SignaturePage() {
  const params = useParams<{ id: string }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      // Set display size
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      // Set actual size in memory
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      // Scale context
      ctx.scale(dpr, dpr)

      // Apply drawing styles
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }

    resizeCanvas()
    setContext(ctx)

    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context) return

    if ("touches" in e) {
      e.preventDefault()
    }

    setIsDrawing(true)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    context.beginPath()
    context.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return
    e.preventDefault()

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    context.lineTo(x, y)
    context.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      context.clearRect(0, 0, rect.width, rect.height)
    }
  }

  const saveSignature = async () => {
    if (!params?.id) {
      toast.error("Invalid signature ID")
      return
    }

    if (canvasRef.current) {
      const signatureData = canvasRef.current.toDataURL("image/png")
      
      // Basic check if canvas is empty
      if (signatureData.length < 1000) {
        toast.error("Please draw your signature first")
        return
      }

      try {
        const response = await fetch(`/api/signature/${params.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: signatureData }),
        })

        if (response.ok) {
          toast.success("Signature saved! You can close this window.")
          setTimeout(() => {
            // Try to close the window or redirect
            if (window.opener) {
              window.close()
            } else {
              window.location.href = "/"
            }
          }, 1500)
        } else {
          const error = await response.json()
          toast.error(error.error || "Failed to save signature. Please try again.")
        }
      } catch (error) {
        console.error("[v0] Error saving signature:", error)
        toast.error("Failed to save signature. Please try again.")
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="max-w-2xl mx-auto w-full grid">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Draw Your Signature</h1>
          <p className="text-sm text-muted-foreground">
            Use your finger or stylus to draw your signature in the box below
          </p>
        </div>

        <div className="flex-1 bg-white mb-4 border rounded-lg">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-64 md:h-96 rounded-lg touch-none cursor-crosshair"
            style={{ display: 'block' }}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={clearCanvas} className="flex-1 gap-2">
            <Undo2 className="h-4 w-4" />
            Clear
          </Button>
          <Button onClick={saveSignature} className="flex-1 bg-[#C13C3D] hover:bg-[#A13334]">
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  )
}