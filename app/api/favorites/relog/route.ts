import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB, updateStreak } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const body = await req.json()
    const { favorite_id, user_id, keterangan = '', target_kalori = 2000 } = body

    if (!favorite_id) {
      return NextResponse.json({ error: 'favorite_id diperlukan' }, { status: 400 })
    }

    const fav = await pool.query(
      `SELECT * FROM food_favorites WHERE id = $1`,
      [favorite_id]
    )
    if (fav.rows.length === 0) {
      return NextResponse.json({ error: 'Favorit tidak ditemukan' }, { status: 404 })
    }

    const f = fav.rows[0]
    const result = await pool.query(
      `INSERT INTO food_logs (user_id, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, items, saran, target_kalori, keterangan, confidence, manual)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        user_id || null, f.nama, f.porsi, f.total_kalori,
        f.protein_g, f.karbo_g, f.lemak_g,
        JSON.stringify(f.items || []), '', target_kalori, keterangan,
        'high', false
      ]
    )

    if (user_id) await updateStreak(user_id)

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/favorites/relog]', err)
    return NextResponse.json({ error: 'Gagal log ulang favorit' }, { status: 500 })
  }
}
