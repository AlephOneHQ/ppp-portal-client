"use client"

import * as React from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog"
import { X } from "lucide-react"

interface ImagePreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt?: string
}

export function ImagePreviewModal({
  open,
  onOpenChange,
  src,
  alt,
}: ImagePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-[95vw]
          max-h-[95vh]
          p-0
          bg-black/90
          border-none
        "
      >
        {/* Close Button */}
        <DialogClose className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
          <X className="h-6 w-6 text-white" />
        </DialogClose>

        {/* Image */}
        <div className="relative w-full h-[90vh] flex items-center justify-center">
          <Image
            src={src}
            alt={alt || "Preview image"}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
