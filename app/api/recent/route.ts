import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ success: true, data: [] })

    // Ambil 7 makanan unik terakhir berdasarkan nama
    const result = await pool.query(
      `SELECT DISTINCT ON (nama) id, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, keterangan, created_at
       FROM food_logs
       WHERE user_id = $1
       ORDER BY nama, created_at DESC`,
      [userId]
    )

    // Sort by created_at DESC, ambil 7 teratas
    const sorted = result.rows
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 7)

    return NextResponse.json({ success: true, data: sorted })
  } catch (err) {
    console.error('[GET /api/recent]', err)
    return NextResponse.json({ error: 'Gagal mengambil makanan terakhir' }, { status: 500 })
  }
}
