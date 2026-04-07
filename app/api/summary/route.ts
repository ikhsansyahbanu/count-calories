import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    const user_id = searchParams.get('user_id')

    const params: (string | number)[] = [days]
    let userFilter = ''
    if (user_id) {
      params.push(user_id)
      userFilter = `AND user_id = $${params.length}`
    }

    const result = await pool.query(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Jakarta') as tanggal,
        SUM(total_kalori)::integer as total_kalori,
        ROUND(SUM(protein_g)::numeric, 1) as total_protein,
        ROUND(SUM(karbo_g)::numeric, 1) as total_karbo,
        ROUND(SUM(lemak_g)::numeric, 1) as total_lemak,
        COUNT(*)::integer as jumlah_makan,
        MAX(target_kalori)::integer as target_kalori
      FROM food_logs
      WHERE created_at >= NOW() - ($1 || ' days')::interval
      ${userFilter}
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jakarta')
      ORDER BY tanggal DESC
    `, params)

    return NextResponse.json({ success: true, data: result.rows })

  } catch (err) {
    console.error('[/api/summary]', err)
    return NextResponse.json({ error: 'Gagal mengambil summary' }, { status: 500 })
  }
}
