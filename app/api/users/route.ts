import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

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

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const { nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori } = await req.json()
    if (!nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

    const result = await pool.query(
      `INSERT INTO users (nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nama, berat_badan || 0, tinggi_badan || 0, usia || 0, jenis_kelamin || 'laki-laki', aktivitas || 'moderate', target_kalori || 2000]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[/api/users POST]', err)
    return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, nama, berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas, target_kalori } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

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
