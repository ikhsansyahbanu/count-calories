import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool, { initDB } from '@/lib/db'
import { rateLimit, getIP } from '@/lib/rateLimit'
import { generateSessionToken, verifySessionToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'kalori_session'
// Session berlaku 30 hari
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === 'production',
}

// GET /api/auth — cek status session, return user jika valid
export async function GET(req: NextRequest) {
  const session = req.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.APP_SECRET
  if (!secret || !session) return NextResponse.json({ authenticated: false })

  const userId = await verifySessionToken(session, secret)
  if (!userId) return NextResponse.json({ authenticated: false })

  try {
    await initDB()
    const result = await pool.query(
      `SELECT id, nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, streak
       FROM users WHERE id = $1`,
      [userId]
    )
    if (result.rows.length === 0) return NextResponse.json({ authenticated: false })
    return NextResponse.json({ authenticated: true, user: result.rows[0] })
  } catch (err) {
    console.error('[GET /api/auth]', err)
    return NextResponse.json({ authenticated: false })
  }
}

// POST /api/auth — login dengan username + password
export async function POST(req: NextRequest) {
  // Rate limit: 5 percobaan per 15 menit per IP
  const ip = getIP(req)
  if (!rateLimit(`auth:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 }
    )
  }

  const secret = process.env.APP_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server belum dikonfigurasi' }, { status: 500 })
  }

  const body = await req.json()
  const username = String(body.username ?? '').trim().slice(0, 100)
  const password = String(body.password ?? '')

  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
  }

  try {
    await initDB()
    const result = await pool.query(
      `SELECT id, nama, password_hash FROM users WHERE LOWER(nama) = LOWER($1)`,
      [username]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const user = result.rows[0]

    if (!user.password_hash) {
      // User lama tanpa password — perlu setup password dulu
      return NextResponse.json(
        { error: 'Akun ini belum memiliki password. Hubungi admin untuk setup password.', needs_setup: true, user_id: user.id },
        { status: 403 }
      )
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const token = await generateSessionToken(secret, user.id)
    const res = NextResponse.json({ success: true })
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
    return res
  } catch (err) {
    console.error('[POST /api/auth]', err)
    return NextResponse.json({ error: 'Gagal login' }, { status: 500 })
  }
}

// DELETE /api/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  return res
}
