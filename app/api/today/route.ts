import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    await initDB()

    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ error: 'user_id diperlukan' }, { status: 400 })
    }

    const logsRes = await pool.query(
      `SELECT
         COALESCE(SUM(total_kalori), 0)::int AS kalori_hari_ini,
         COALESCE(SUM(protein_g), 0)::numeric(6,1) AS protein,
         COALESCE(SUM(karbo_g), 0)::numeric(6,1) AS karbo,
         COALESCE(SUM(lemak_g), 0)::numeric(6,1) AS lemak,
         COUNT(*)::int AS jumlah_makan,
         MAX(target_kalori)::int AS target_kalori
       FROM food_logs
       WHERE DATE(created_at AT TIME ZONE 'Asia/Jakarta') = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
         AND user_id = $1`,
      [user_id]
    )

    const streakRes = await pool.query(
      `SELECT streak FROM users WHERE id = $1`,
      [user_id]
    )

    const data = logsRes.rows[0]
    const streak = streakRes.rows[0]?.streak ?? 0

    return NextResponse.json({
      success: true,
      data: {
        kalori_hari_ini: data.kalori_hari_ini,
        protein: parseFloat(data.protein),
        karbo: parseFloat(data.karbo),
        lemak: parseFloat(data.lemak),
        jumlah_makan: data.jumlah_makan,
        target_kalori: data.target_kalori,
        streak,
      }
    })
  } catch (err) {
    console.error('[/api/today]', err)
    return NextResponse.json({ error: 'Gagal mengambil data hari ini' }, { status: 500 })
  }
}
