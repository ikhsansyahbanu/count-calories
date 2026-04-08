import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ success: true, data: [] })

    const result = await pool.query(
      `SELECT * FROM food_favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/favorites]', err)
    return NextResponse.json({ error: 'Gagal mengambil favorit' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const nama = String(body.nama ?? '').trim().slice(0, 255)
    const { porsi, total_kalori, protein_g, karbo_g, lemak_g, items } = body

    if (!nama) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Cek duplikat
    const existing = await pool.query(
      `SELECT id FROM food_favorites WHERE user_id = $1 AND nama = $2`,
      [userId, nama]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: true, data: existing.rows[0], duplicate: true })
    }

    const result = await pool.query(
      `INSERT INTO food_favorites (user_id, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, items)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, JSON.stringify(items || [])]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/favorites]', err)
    return NextResponse.json({ error: 'Gagal menyimpan favorit' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDB()
    const rawId = req.nextUrl.searchParams.get('id')
    const id = rawId && /^\d+$/.test(rawId) ? parseInt(rawId) : null
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })

    await pool.query(`DELETE FROM food_favorites WHERE id = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/favorites]', err)
    return NextResponse.json({ error: 'Gagal menghapus favorit' }, { status: 500 })
  }
}
