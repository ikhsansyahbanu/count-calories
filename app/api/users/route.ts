import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await initDB()
    const result = await pool.query('SELECT * FROM users ORDER BY created_at ASC')
    return NextResponse.json({ success: true, data: result.rows })
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

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const body = await req.json()
    const validated = validateUserFields(body)
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 })

    const { nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori } = validated
    const result = await pool.query(
      `INSERT INTO users (nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[/api/users POST]', err)
    return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDB()
    const body = await req.json()
    const id = parseInt(body.id)
    if (!id || isNaN(id)) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

    const validated = validateUserFields(body)
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 })

    const { nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori } = validated
    const result = await pool.query(
      `UPDATE users SET nama=$1, berat_badan=$2, tinggi_badan=$3, usia=$4, jenis_kelamin=$5, aktivitas=$6, target_kalori=$7
       WHERE id=$8 RETURNING *`,
      [nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori, id]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[/api/users PATCH]', err)
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })

    await pool.query('DELETE FROM users WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/users DELETE]', err)
    return NextResponse.json({ error: 'Gagal menghapus user' }, { status: 500 })
  }
}
