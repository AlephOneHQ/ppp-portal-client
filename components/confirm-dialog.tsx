"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export type ConfirmDialogVariant = "default" | "destructive" | "warning"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  showReasonField?: boolean
  reason?: string
  onReasonChange?: (reason: string) => void
  reasonLabel?: string
  reasonPlaceholder?: string
  disabled?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  isLoading = false,
  showReasonField = false,
  reason = "",
  onReasonChange,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter reason...",
  disabled = false,
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } finally {
      setIsProcessing(false)
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return "bg-destructive text-white hover:bg-destructive/90"
      case "warning":
        return "bg-[#C13C3D] text-white hover:bg-[#A02F30]"
      default:
        return "bg-primary text-white hover:bg-primary/90"
    }
  }

  const loading = isLoading || isProcessing

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {showReasonField && (
          <div className="py-4">
            <Label htmlFor="reason">{reasonLabel}</Label>
            <Textarea
              id="reason"
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => onReasonChange?.(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild disabled={loading}>
            <Button variant="outline">{cancelText}</Button>
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className={getVariantStyles()} disabled={loading || disabled}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for managing confirm dialog state
export function useConfirmDialog() {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const openDialog = () => setOpen(true)
  const closeDialog = () => setOpen(false)

  return {
    open,
    openDialog,
    closeDialog,
    isLoading,
    setIsLoading,
  }
}
