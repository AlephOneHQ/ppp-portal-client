
interface SignatureData {
  data: string
  timestamp: number
}

// In-memory storage (replace with database in production)
const signatureStorage = new Map<string, SignatureData>()

// Clean up signatures older than 1 hour
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

export function saveSignature(id: string, data: string): void {
  signatureStorage.set(id, {
    data,
    timestamp: Date.now()
  })
}

export function getSignature(id: string): string | null {
  const signature = signatureStorage.get(id)
  return signature ? signature.data : null
}

export function deleteSignature(id: string): void {
  signatureStorage.delete(id)
}

export function cleanupOldSignatures(): void {
  const now = Date.now()
  for (const [id, signature] of signatureStorage.entries()) {
    if (now - signature.timestamp > CLEANUP_INTERVAL) {
      signatureStorage.delete(id)
    }
  }
}

// Regular cleanup
setInterval(cleanupOldSignatures, CLEANUP_INTERVAL)