import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'kalori_session'
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  // Aktifkan secure: true jika deploy dengan HTTPS
  // secure: true,
}

// GET /api/auth — cek status session
export async function GET(req: NextRequest) {
  const session = req.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.APP_SECRET
  const valid = !!secret && session === secret
  return NextResponse.json({ authenticated: valid })
}

// POST /api/auth — login
export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const secret = process.env.APP_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Server belum dikonfigurasi' }, { status: 500 })
  }

  if (!password || password !== secret) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, secret, COOKIE_OPTIONS)
  return res
}

// DELETE /api/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  return res
}
