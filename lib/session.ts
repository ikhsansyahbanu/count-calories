// Session token menggunakan HMAC-SHA256
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

// Generate token: "<uuid>.<hmac-signature>"
export async function generateSessionToken(secret: string): Promise<string> {
  const token = crypto.randomUUID()
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))
  return `${token}.${toHex(sig)}`
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

// Verifikasi token — menggunakan constant-time verify untuk mencegah timing attack
export async function verifySessionToken(sessionValue: string, secret: string): Promise<boolean> {
  const dotIndex = sessionValue.lastIndexOf('.')
  if (dotIndex === -1) return false

  const token = sessionValue.slice(0, dotIndex)
  const sigHex = sessionValue.slice(dotIndex + 1)

  if (!token || !sigHex) return false

  try {
    const key = await getKey(secret)
    const sigBuf = hexToBuffer(sigHex)
    if (sigBuf.byteLength === 0) return false
    return await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(token))
  } catch {
    return false
  }
}
