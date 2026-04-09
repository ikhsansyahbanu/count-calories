import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ success: true, data: [] })

    const limitParam = req.nextUrl.searchParams.get('limit')
    const limit = limitParam && /^\d+$/.test(limitParam) ? Math.min(parseInt(limitParam), 200) : 90
    const result = await pool.query(
      `SELECT id, user_id, berat, catatan, waist_cm, created_at FROM weight_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
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

    let waist_cm: number | null = null
    if (body.waist_cm !== undefined && body.waist_cm !== null && body.waist_cm !== '') {
      const w = parseFloat(body.waist_cm)
      if (isNaN(w) || w < 40 || w > 200) {
        return NextResponse.json({ error: 'Lingkar perut tidak valid (40–200 cm)' }, { status: 400 })
      }
      waist_cm = w
    }

    const result = await pool.query(
      `INSERT INTO weight_logs (user_id, berat, catatan, waist_cm) VALUES ($1,$2,$3,$4) RETURNING id, user_id, berat, catatan, waist_cm, created_at`,
      [userId, berat, catatan, waist_cm]
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
