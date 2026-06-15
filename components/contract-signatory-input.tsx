"use client"

import type React from "react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadIcon, X } from "lucide-react"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0]
    if (!file) return

    // Accept only image files for signatures
    if (!file.type.match(/image\/(png|jpg|jpeg|gif|webp|svg\+xml)/)) {
      alert("Please upload an image file (PNG, JPG, JPEG, GIF, WEBP, SVG)")
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

  const clearSignature = () => {
    if (disabled) return;
    if (onChange) {
      onChange("")
    }
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      {value && value !== "NIL" ? (
        <Card className="relative p-4">
          {!disabled && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2" 
              onClick={clearSignature}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="flex flex-col items-center justify-center">
            <img
              src={value || "/placeholder.png"}
              onError={(e) => {
                e.currentTarget.src = "/placeholder.png";
              }}
              alt="signature"
              className="max-h-48 max-w-full object-contain"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Click the X button to remove this signature
            </p>
          </div>
        </Card>
      ) : (
        <div
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors min-h-[200px] ${disabled
            ? "bg-muted/10 cursor-not-allowed opacity-50 border-gray-300"
            : "bg-muted/5 cursor-pointer hover:bg-muted/10 border-gray-400 hover:border-primary"
            }`}
          onClick={disabled ? undefined : () => fileInputRef.current?.click()}
        >
          <div className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${disabled ? "bg-muted/20" : "bg-primary/10 text-primary"
            }`}>
            <UploadIcon className="h-8 w-8" />
          </div>
          <p className="text-lg font-medium mb-2 text-center">
            Upload Signature
          </p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-md">
            {disabled
              ? "Signature input is disabled"
              : "Click to upload your signature image file"
            }
          </p>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Accepted formats: PNG, JPG, JPEG, GIF, WEBP, SVG • Max size: 5MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileUpload}
            disabled={disabled}
          />
        </div>
      )}

      {/* Required indicator */}
      {required && !value && (
        <p className="text-xs text-red-500">
          Signature is required
        </p>
      )}
    </div>
  )
}