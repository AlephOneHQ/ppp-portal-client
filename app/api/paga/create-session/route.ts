// app/api/paga/create-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { storeSession } from '@/lib/redis'

interface WidgetParams {
  public_key: string;
  email: string;
  amount: string;
  currency: string;
  payment_reference: string;
  charge_url: string;
  callback_url: string;
  checkout_base_url: string;
}

function validateWidgetParams(params: unknown): string | null {
  // Type guard to check if params is an object
  if (typeof params !== 'object' || params === null) {
    return 'Invalid parameters: expected an object';
  }

  const widgetParams = params as Record<string, unknown>;
  
  const required = {
    'public_key': widgetParams.public_key,
    'email': widgetParams.email,
    'amount': widgetParams.amount,
    'currency': widgetParams.currency,
    'payment_reference': widgetParams.payment_reference,
    'charge_url': widgetParams.charge_url,
    'callback_url': widgetParams.callback_url,
    'checkout_base_url': widgetParams.checkout_base_url
  }

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    return `Missing required parameters: ${missing.join(', ')}`
  }

  // Type checks for each parameter
  if (typeof widgetParams.amount !== 'string') {
    return 'Invalid payment amount: expected string';
  }
  
  const amount = parseFloat(widgetParams.amount);
  if (isNaN(amount) || amount <= 0) {
    return 'Invalid payment amount';
  }

  if (typeof widgetParams.email !== 'string') {
    return 'Invalid email format: expected string';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(widgetParams.email)) {
    return 'Invalid email format';
  }

  // URL validation
  const urlFields = ['charge_url', 'callback_url', 'checkout_base_url'] as const;
  for (const field of urlFields) {
    if (typeof widgetParams[field] !== 'string') {
      return `Invalid ${field}: expected string`;
    }
    try {
      new URL(widgetParams[field] as string);
    } catch {
      return `Invalid URL format in ${field}`;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const widgetParams = await request.json()

    // Validate parameters
    const validationError = validateWidgetParams(widgetParams)
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      )
    }

    // Create a secure session ID
    const sessionId = `paga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store parameters server-side
    await storeSession(sessionId, {
      ...widgetParams,
      createdAt: Date.now(),
    })

    // Return only the session ID to client
    return NextResponse.json({ 
      success: true, 
      sessionId 
    })

  } catch (error) {
    console.error('Error creating payment session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}