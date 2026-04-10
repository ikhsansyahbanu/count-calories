import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'
import { sanitizeTz } from '@/lib/tz'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const daysRaw = parseInt(searchParams.get('days') || '7')
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 365) : 7
    const tz = sanitizeTz(searchParams.get('tz'))
    const rawUserId = req.headers.get('x-user-id')
    const userId = rawUserId && /^\d+$/.test(rawUserId) ? parseInt(rawUserId, 10) : null

    const params: (string | number)[] = [days, tz]
    let userFilter = ''
    if (userId) {
      params.push(userId)
      userFilter = `AND user_id = $${params.length}`
    }

    const [result, userRes] = await Promise.all([
      pool.query(`
        SELECT
          TO_CHAR(DATE(created_at AT TIME ZONE $2), 'YYYY-MM-DD') as tanggal,
          SUM(total_kalori)::integer as total_kalori,
          ROUND(SUM(protein_g)::numeric, 1) as total_protein,
          ROUND(SUM(karbo_g)::numeric, 1) as total_karbo,
          ROUND(SUM(lemak_g)::numeric, 1) as total_lemak,
          COUNT(*)::integer as jumlah_makan
        FROM food_logs
        WHERE created_at >= NOW() - ($1 || ' days')::interval
        ${userFilter}
        GROUP BY DATE(created_at AT TIME ZONE $2)
        ORDER BY tanggal DESC
      `, params),
      userId
        ? pool.query(`SELECT target_kalori FROM users WHERE id = $1`, [userId])
        : Promise.resolve({ rows: [] }),
    ])

    const currentTarget: number = userRes.rows[0]?.target_kalori ?? 2000
    const rows = result.rows.map((row: Record<string, unknown>) => ({ ...row, target_kalori: currentTarget }))

    const response = NextResponse.json({ success: true, data: rows })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=3600')
    return response

  } catch (err) {
    console.error('[/api/summary]', err)
    return NextResponse.json({ error: 'Gagal mengambil summary' }, { status: 500 })
  }
}
