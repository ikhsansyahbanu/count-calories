// Session token menggunakan HMAC-SHA256
// Format: "<userId>:<uuid>.<hmac-signature>"
// Secret tidak pernah disimpan di cookie — hanya token acak yang sudah di-sign

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) return new ArrayBuffer(0)
  const buf = new ArrayBuffer(hex.length / 2)
  const view = new Uint8Array(buf)
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return buf
}

// Generate token: "<userId>:<uuid>.<hmac-signature>"
export async function generateSessionToken(secret: string, userId: number): Promise<string> {
  const uuid = crypto.randomUUID()
  const payload = `${userId}:${uuid}`
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${toHex(sig)}`
}

// Verifikasi token — return userId jika valid, null jika tidak
// Menggunakan constant-time verify untuk mencegah timing attack
export async function verifySessionToken(sessionValue: string, secret: string): Promise<number | null> {
  const dotIndex = sessionValue.lastIndexOf('.')
  if (dotIndex === -1) return null

  const payload = sessionValue.slice(0, dotIndex)
  const sigHex = sessionValue.slice(dotIndex + 1)

  if (!payload || !sigHex) return null

  const colonIndex = payload.indexOf(':')
  if (colonIndex === -1) return null

  const userId = parseInt(payload.slice(0, colonIndex))
  if (!userId || isNaN(userId) || userId <= 0) return null

  try {
    const key = await getKey(secret)
    const sigBuf = hexToBuffer(sigHex)
    if (sigBuf.byteLength === 0) return null
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(payload))
    return valid ? userId : null
  } catch {
    return null
  }
}
