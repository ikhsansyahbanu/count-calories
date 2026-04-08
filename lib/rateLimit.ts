interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Bersihkan entry lama tiap 5 menit agar memori tidak bocor
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key)
  })
}, 5 * 60 * 1000)

function rateLimitMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

async function rateLimitRedis(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return rateLimitMemory(key, limit, windowMs)

  const windowSeconds = Math.ceil(windowMs / 1000)

  try {
    // Pipeline: INCR + EXPIRE NX (set expiry only on first request in window)
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSeconds, 'NX'],
      ]),
      cache: 'no-store',
    })

    if (!res.ok) return rateLimitMemory(key, limit, windowMs)

    const results = await res.json()
    const count = results[0]?.result as number
    return typeof count === 'number' ? count <= limit : true
  } catch {
    // Fallback to in-memory on Redis error
    return rateLimitMemory(key, limit, windowMs)
  }
}

/**
 * Cek apakah request boleh dilanjutkan.
 * Gunakan Upstash Redis jika UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN tersedia,
 * fallback ke in-memory jika tidak.
 * @returns true jika masih dalam batas, false jika kena rate limit
 */
export function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  return rateLimitRedis(key, limit, windowMs)
}

/** Ambil IP dari request headers. */
export function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
