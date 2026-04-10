import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()

    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [logsRes, userRes, slotsRes] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(total_kalori), 0)::int AS kalori_hari_ini,
           COALESCE(SUM(protein_g), 0)::numeric(6,1) AS protein,
           COALESCE(SUM(karbo_g), 0)::numeric(6,1) AS karbo,
           COALESCE(SUM(lemak_g), 0)::numeric(6,1) AS lemak,
           COUNT(*)::int AS jumlah_makan
         FROM food_logs
         WHERE DATE(created_at AT TIME ZONE 'Asia/Jakarta') = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
           AND user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT target_kalori, streak FROM users WHERE id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT keterangan, COUNT(*)::int AS count, COALESCE(SUM(total_kalori), 0)::int AS kalori
         FROM food_logs
         WHERE DATE(created_at AT TIME ZONE 'Asia/Jakarta') = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
           AND user_id = $1
         GROUP BY keterangan`,
        [userId]
      ),
    ])

    const data = logsRes.rows[0]
    const user = userRes.rows[0]
    const target_kalori = user?.target_kalori ?? 2000
    const streak = user?.streak ?? 0

    // Build meal_slots object from query results
    const meal_slots: Record<string, { count: number; kalori: number }> = {}
    for (const row of slotsRes.rows) {
      meal_slots[row.keterangan || ''] = { count: row.count, kalori: row.kalori }
    }

    return NextResponse.json({
      success: true,
      data: {
        kalori_hari_ini: data.kalori_hari_ini,
        protein: parseFloat(data.protein),
        karbo: parseFloat(data.karbo),
        lemak: parseFloat(data.lemak),
        jumlah_makan: data.jumlah_makan,
        target_kalori,
        streak,
        meal_slots,
      }
    })
  } catch (err) {
    console.error('[/api/today]', err)
    return NextResponse.json({ error: 'Gagal mengambil data hari ini' }, { status: 500 })
  }
}
