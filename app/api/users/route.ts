import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/users — return hanya profil user yang sedang login
export async function GET(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await pool.query(
      `SELECT id, nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, streak
       FROM users WHERE id = $1`,
      [userId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[/api/users GET]', err)
    return NextResponse.json({ error: 'Gagal mengambil data user' }, { status: 500 })
  }
}

function validateUserFields(body: Record<string, unknown>) {
  const nama = String(body.nama ?? '').trim().slice(0, 100)
  if (!nama) return { error: 'Nama wajib diisi' }

  const berat_badan = Math.max(0, Math.min(500, parseFloat(String(body.berat_badan)) || 0))
  const tinggi_badan = Math.max(0, Math.min(300, parseFloat(String(body.tinggi_badan)) || 0))
  const usia = Math.max(0, Math.min(150, parseInt(String(body.usia)) || 0))
  const target_kalori = Math.max(500, Math.min(10000, parseInt(String(body.target_kalori)) || 2000))

  const validGender = ['laki-laki', 'perempuan']
  const jenis_kelamin = validGender.includes(body.jenis_kelamin as string)
    ? (body.jenis_kelamin as string)
    : 'laki-laki'

  const validAktivitas = ['sedentary', 'light', 'moderate', 'active', 'very_active']
  const aktivitas = validAktivitas.includes(body.aktivitas as string)
    ? (body.aktivitas as string)
    : 'moderate'

  return { nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori }
}

// POST /api/users — registrasi user baru (bisa diakses tanpa login — butuh password)
// Route ini dikecualikan dari middleware auth karena dipanggil saat register
export async function POST(req: NextRequest) {
  try {
    await initDB()
    const body = await req.json()
    const validated = validateUserFields(body)
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 })

    const password = String(body.password ?? '')
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    // Cek apakah nama sudah dipakai
    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(nama) = LOWER($1)`,
      [validated.nama]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Nama sudah digunakan, pilih nama lain' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const { nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori } = validated
    const result = await pool.query(
      `INSERT INTO users (nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, streak`,
      [nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, password_hash]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[/api/users POST]', err)
    return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 })
  }
}

// PATCH /api/users — update profil sendiri (dan opsional ganti password)
export async function PATCH(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const validated = validateUserFields(body)
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 })

    const { nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori } = validated

    // Ganti password jika field password dikirim
    const newPassword = String(body.password ?? '').trim()
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 })
      }
      const password_hash = await bcrypt.hash(newPassword, 12)
      await pool.query(
        `UPDATE users SET nama=$1, berat_badan=$2, tinggi_badan=$3, usia=$4, jenis_kelamin=$5, aktivitas=$6, target_kalori=$7, password_hash=$8
         WHERE id=$9`,
        [nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, password_hash, userId]
      )
    } else {
      await pool.query(
        `UPDATE users SET nama=$1, berat_badan=$2, tinggi_badan=$3, usia=$4, jenis_kelamin=$5, aktivitas=$6, target_kalori=$7
         WHERE id=$8`,
        [nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, userId]
      )
    }

    const result = await pool.query(
      `SELECT id, nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, streak
       FROM users WHERE id = $1`,
      [userId]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[/api/users PATCH]', err)
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 })
  }
}

// DELETE /api/users — hapus akun sendiri
export async function DELETE(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await pool.query('DELETE FROM users WHERE id = $1', [userId])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/users DELETE]', err)
    return NextResponse.json({ error: 'Gagal menghapus user' }, { status: 500 })
  }
}
