import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ success: true, data: [] })

    const result = await pool.query(
      `SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 90`,
      [userId]
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
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const berat = parseFloat(body.berat)
    const catatan = String(body.catatan ?? '').trim().slice(0, 200)

    if (!berat || isNaN(berat) || berat < 10 || berat > 500) {
      return NextResponse.json({ error: 'Berat badan tidak valid (10–500 kg)' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO weight_logs (user_id, berat, catatan) VALUES ($1,$2,$3) RETURNING *`,
      [userId, berat, catatan]
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
    const rawId = req.nextUrl.searchParams.get('id')
    const id = rawId && /^\d+$/.test(rawId) ? parseInt(rawId) : null
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })

    const userId = parseInt(req.headers.get('x-user-id') || '0')
    await pool.query(`DELETE FROM weight_logs WHERE id = $1 AND user_id = $2`, [id, userId])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/weight]', err)
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 })
  }
}
