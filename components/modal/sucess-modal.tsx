"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  referenceId: string;
}

export function SuccessModal({ open, onOpenChange, referenceId }: SuccessModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(false);
    }
  }, [open]);

  const proceedToEOI = () => {
    onOpenChange(false);
    router.push("/eoi");
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center space-y-4 mt-6">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-2xl">EOI Submitted Successfully!</DialogTitle>
          <DialogDescription className="text-base">
            {referenceId ? (
              <>
                Your EOI has been submitted with reference ID{" "}
                <strong>#{referenceId}</strong>. 
              </>
            ) : (
              <>
                Your EOI has been submitted successfully.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-4 mb-6">
          <Button
            onClick={proceedToEOI}
            variant="outline"
            className="bg-transparent rounded-xl flex-1"
            size="lg"
            disabled={loading}
          >
            Proceed to EOI Page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
