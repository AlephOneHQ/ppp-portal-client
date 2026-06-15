import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { AxiosError } from "axios"
import type { PaymentInitiateResponse, PaymentVerifificationResponse, PaymentDetails, PaymentListFilters } from "@/types/payment"
import { extractErrorMessage } from "./errorUtils"

const handlePaymentError = (error: unknown): { message: string; errors?: Record<string, string> } => {
  if (error instanceof AxiosError) {
    return {
      message: extractErrorMessage(error, "Payment operation failed"),
      errors: error.response?.data?.extra?.fields,
    }
  }
  if (error instanceof Error) return { message: error.message }
  return { message: "An unexpected error occurred" }
}

export const paymentAPI = {
  initiate: async (eoiId: string): Promise<ApiResponse<PaymentInitiateResponse>> => {
    try {
      const response = await api.post("/payments/initiate/", { eoi_id: eoiId })
      return { success: true, data: response.data, message: "Payment initiated successfully" }
    } catch (error) {
      const { message, errors } = handlePaymentError(error)
      return { success: false, message, errors }
    }
  },

  verify: async (paymentId: string): Promise<ApiResponse<PaymentVerifificationResponse>> => {
    try {
      const response = await api.post(`/payments/${paymentId}/verify/`)
      return { success: true, data: response.data }
    } catch (error) {
      const { message, errors } = handlePaymentError(error)
      return { success: false, message, errors }
    }
  },

  list: async (filters?: PaymentListFilters): Promise<ApiResponse<{ results: PaymentDetails[]; count: number }>> => {
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append("status", filters.status)
      if (filters?.eoi_id) params.append("eoi_id", filters.eoi_id)
      if (filters?.payment_reference) params.append("payment_reference", filters.payment_reference)

      const response = await api.get(`/payments/?${params.toString()}`)
      return { success: true, data: response.data }
    } catch (error) {
      const { message, errors } = handlePaymentError(error)
      return { success: false, message, errors }
    }
  },

  getDetails: async (id: string): Promise<ApiResponse<PaymentDetails>> => {
    try {
      const response = await api.get(`/payments/${id}/`)
      return { success: true, data: response.data }
    } catch (error) {
      const { message, errors } = handlePaymentError(error)
      return { success: false, message, errors }
    }
  },

  getByEoiId: async (eoiId: string): Promise<ApiResponse<{ results: PaymentDetails[]; count: number }>> => {
    return paymentAPI.list({ eoi_id: eoiId })
  },
}

export default paymentAPI
