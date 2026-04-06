import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const user_id = req.nextUrl.searchParams.get('user_id')
    if (!user_id) return NextResponse.json({ success: true, data: [] })

    const result = await pool.query(
      `SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 90`,
      [user_id]
    )
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/weight]', err)
    return NextResponse.json({ error: 'Gagal mengambil data berat' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const { user_id, berat, catatan = '' } = await req.json()

    if (!user_id || !berat) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO weight_logs (user_id, berat, catatan) VALUES ($1,$2,$3) RETURNING *`,
      [user_id, berat, catatan]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/weight]', err)
    return NextResponse.json({ error: 'Gagal menyimpan berat' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDB()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })

    await pool.query(`DELETE FROM weight_logs WHERE id = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/weight]', err)
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 })
  }
}
