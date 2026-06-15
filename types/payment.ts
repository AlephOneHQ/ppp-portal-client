export interface PagaWidgetParams {
  public_key: string
  amount: string
  currency: string
  payment_reference: string
  email: string
  charge_url: string
  callback_url: string
  checkout_base_url: string
}

export interface PaymentInitiateResponse {
  payment_id: string
  payment_reference: string
  amount: string
  currency: string
  status: string
  paga_widget_params: PagaWidgetParams
  eoi: {
    id: string
    project_title: string
  }
}

export interface PaymentWebhookResponse {
  status_code: string
  status_message: string
  payment_reference: string
  amount: string
  currency: string
  timestamp: string
  description: string
  customer_email: string
  customer_phone_number: string
  hash: string
}

export interface PaymentVerifificationResponse {
  status_code: string
  status_message: string
  status: string
  payment_reference: string
  amount: string
  currency: string
  payment_method: string
  paid_at: string
  created_at: string
  eoi_id: string,
  project_title: string
}


export interface PaymentDetails {
  id: string
  payment_reference: string
  amount: string
  currency: string
  status: "success" | "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded"
  payment_method?: string
  paid_at?: string
  created_at: string
  eoi_id: string
  project_title: string
  eoi: {
    id: string
    project_title?: string
    payment_status?: string
  }
  updated_at?: string
}


export interface PaymentListFilters {
  status?: "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded"
  payment_reference?: string
  eoi_id?: string
  limit?: number
  offset?: number
}
