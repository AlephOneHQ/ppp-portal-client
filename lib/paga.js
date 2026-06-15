// lib/paga.js
export const PagaConfig = {
  baseUrl: process.env.NEXT_PUBLIC_PAGA_BASE_URL,
  publicKey: process.env.NEXT_PUBLIC_PAGA_PUBLIC_KEY,
  merchantId: process.env.NEXT_PUBLIC_PAGA_MERCHANT_ID
}