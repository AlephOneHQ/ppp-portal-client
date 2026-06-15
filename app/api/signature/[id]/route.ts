import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for signatures (in production, use Redis or database)
const signatures = new Map<string, string>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const signature = signatures.get(id)
  
  if (signature) {
    return NextResponse.json({ data: signature })
  }
  
  return NextResponse.json({ data: null }, { status: 404 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  
  if (body.signature) {
    signatures.set(id, body.signature)
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  signatures.delete(id)
  return NextResponse.json({ success: true })
}
