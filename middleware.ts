import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // Bypass: login/logout endpoint tidak perlu auth
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const session = req.cookies.get('kalori_session')?.value
  const secret = process.env.APP_SECRET

  if (!secret) {
    console.error('[Auth] APP_SECRET belum diset di .env.local')
    return NextResponse.json({ error: 'Server belum dikonfigurasi' }, { status: 500 })
  }

  if (!session || session !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
