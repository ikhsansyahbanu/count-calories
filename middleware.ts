import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'

export async function middleware(req: NextRequest) {
  // Bypass: auth endpoints tidak perlu session (login, logout, register, setup)
  // Bypass juga POST /api/users untuk registrasi akun baru
  if (
    req.nextUrl.pathname.startsWith('/api/auth') ||
    (req.nextUrl.pathname === '/api/users' && req.method === 'POST')
  ) {
    return NextResponse.next()
  }

  const session = req.cookies.get('kalori_session')?.value
  const secret = process.env.APP_SECRET

  if (!secret) {
    console.error('[Auth] APP_SECRET belum diset di .env.local')
    return NextResponse.json({ error: 'Server belum dikonfigurasi' }, { status: 500 })
  }

  const userId = session ? await verifySessionToken(session, secret) : null
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Inject user_id ke semua API routes via header
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', String(userId))
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: '/api/:path*',
}
