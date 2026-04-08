import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB, updateStreak, withTransaction } from '@/lib/db'
// pool dipakai untuk query SELECT sebelum transaksi

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0') || null
    const body = await req.json()
    const favorite_id = parseInt(body.favorite_id)
    const keterangan = String(body.keterangan ?? '').trim().slice(0, 100)
    const target_kalori = Math.max(500, Math.min(10000, parseInt(body.target_kalori) || 2000))

    if (!favorite_id || isNaN(favorite_id)) {
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
    const savedLog = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO food_logs (userId, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, items, saran, target_kalori, keterangan, confidence, manual)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          userId, f.nama, f.porsi, f.total_kalori,
          f.protein_g, f.karbo_g, f.lemak_g,
          JSON.stringify(f.items || []), '', target_kalori, keterangan,
          'high', false
        ]
      )
      if (userId) await updateStreak(userId, client)
      return r.rows[0]
    })

    return NextResponse.json({ success: true, data: savedLog })
  } catch (err) {
    console.error('[POST /api/favorites/relog]', err)
    return NextResponse.json({ error: 'Gagal log ulang favorit' }, { status: 500 })
  }
}
