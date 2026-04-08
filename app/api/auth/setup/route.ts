import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool, { initDB } from '@/lib/db'
import { generateSessionToken } from '@/lib/session'
import { rateLimit, getIP } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'kalori_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === 'production',
}

// POST /api/auth/setup — set password untuk user baru atau user lama tanpa password
// Akses: user_id + APP_SECRET sebagai konfirmasi admin
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  if (!rateLimit(`setup:${ip}`, 5, 15 * 60 * 1000)) {
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
  const userId = parseInt(body.user_id)
  const password = String(body.password ?? '')
  const admin_secret = String(body.admin_secret ?? '')

  if (!userId || isNaN(userId) || userId <= 0) {
    return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }
  if (admin_secret !== secret) {
    return NextResponse.json({ error: 'Admin secret tidak valid' }, { status: 403 })
  }

  try {
    await initDB()

    const userRes = await pool.query(
      `SELECT id, nama, password_hash FROM users WHERE id = $1`,
      [userId]
    )
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    const user = userRes.rows[0]
    // Setup hanya boleh jika password_hash masih NULL (user baru / user lama)
    if (user.password_hash) {
      return NextResponse.json(
        { error: 'User ini sudah memiliki password. Gunakan fitur ganti password.' },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(password, 12)
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId])

    // Auto-login setelah setup
    const token = await generateSessionToken(secret, userId)
    const res = NextResponse.json({ success: true })
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
    return res
  } catch (err) {
    console.error('[POST /api/auth/setup]', err)
    return NextResponse.json({ error: 'Gagal setup password' }, { status: 500 })
  }
}
