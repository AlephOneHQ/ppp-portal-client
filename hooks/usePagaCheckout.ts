"use client";

import { useCallback } from "react";
import { toast } from "sonner";

export function usePagaCheckout() {

  const open = useCallback((params: any) => {
    if (!params) return;

    // Load paga script dynamically
    const script = document.createElement("script");
    script.src = `${params.checkout_base_url}/checkout.min.js`;
    script.async = true;

    script.onload = () => {
        // @ts-ignore
  if (!window.PagaCheckout) {
    console.error("PagaCheckout not found — script failed to load");
    toast.error("Unable to load payment widget");
    return;
  }

      // @ts-ignore
      if (window.PagaCheckout) {
        // @ts-ignore
        window.PagaCheckout.openPaymentModal({
          publicKey: params.public_key,
          amount: params.amount,
          currency: params.currency,
          paymentReference: params.payment_reference,
          email: params.email,
          chargeUrl: params.charge_url,
          callbackUrl: params.callback_url,

          onSuccess: params.onSuccess,
          onFailure: params.onFailure,
        });
      } else {
        console.error("PagaCheckout not found on window");
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return { open };
}
