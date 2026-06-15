import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL

// Simple Redis client creation
const redis = redisUrl ? new Redis(redisUrl) : null

if (redis) {
  redis.on('error', (err) => {
    console.error('Redis error:', err)
  })

  redis.on('connect', () => {
    console.log('✅ Redis connected')
  })
}

// Memory store fallback
const memoryStore = new Map()

interface SessionData {
  public_key: string;
  email: string;
  amount: string;
  currency: string;
  payment_reference: string;
  charge_url: string;
  callback_url: string;
  checkout_base_url: string;
  createdAt: number;
}

export async function storeSession(sessionId: string, data: SessionData, ttl: number = 1800): Promise<void> {
  if (redis) {
    await redis.setex(`paga_session:${sessionId}`, ttl, JSON.stringify(data))
  } else {
    // Memory store with basic TTL
    memoryStore.set(`paga_session:${sessionId}`, JSON.stringify(data))
    setTimeout(() => {
      memoryStore.delete(`paga_session:${sessionId}`)
    }, ttl * 1000)
  }
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  let data: string | null = null

  if (redis) {
    data = await redis.get(`paga_session:${sessionId}`)
  } else {
    data = memoryStore.get(`paga_session:${sessionId}`) || null
  }

  return data ? JSON.parse(data) : null
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (redis) {
    await redis.del(`paga_session:${sessionId}`)
  } else {
    memoryStore.delete(`paga_session:${sessionId}`)
  }
}

export { redis }