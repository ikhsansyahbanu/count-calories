import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB, updateStreak, withTransaction } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0') || null
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const log_id = parseInt(body.log_id)
    const keterangan = String(body.keterangan ?? '').trim().slice(0, 100)
    const target_kalori = Math.max(500, Math.min(10000, parseInt(body.target_kalori) || 2000))

    if (!log_id || isNaN(log_id)) {
      return NextResponse.json({ error: 'log_id diperlukan' }, { status: 400 })
    }

    const logRes = await pool.query(
      `SELECT * FROM food_logs WHERE id = $1 AND user_id = $2`,
      [log_id, userId]
    )
    if (logRes.rows.length === 0) {
      return NextResponse.json({ error: 'Log tidak ditemukan' }, { status: 404 })
    }

    const f = logRes.rows[0]
    const savedLog = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO food_logs (user_id, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, items, saran, target_kalori, keterangan, confidence, manual)
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
    console.error('[POST /api/recent/relog]', err)
    return NextResponse.json({ error: 'Gagal log ulang makanan terakhir' }, { status: 500 })
  }
}
