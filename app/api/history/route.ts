import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)

    const rawUserId = searchParams.get('user_id')
    const user_id = rawUserId && /^\d+$/.test(rawUserId) ? rawUserId : null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit
    const search = (searchParams.get('search')?.trim() || '').slice(0, 100)
    const keterangan = searchParams.get('keterangan')?.trim() || ''
    const date = searchParams.get('date')

    const conditions: string[] = ['1=1']
    const params: (string | number)[] = []

    if (user_id) {
      params.push(user_id)
      conditions.push(`user_id = $${params.length}`)
    }
    if (date) {
      params.push(date)
      conditions.push(`DATE(created_at AT TIME ZONE 'Asia/Jakarta') = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`nama ILIKE $${params.length}`)
    }
    if (keterangan === 'Manual') {
      conditions.push(`manual = TRUE`)
    } else if (keterangan) {
      params.push(keterangan)
      conditions.push(`keterangan = $${params.length}`)
    }

    const where = conditions.join(' AND ')

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM food_logs WHERE ${where}`,
      params
    )
    const total: number = countRes.rows[0].total
    const totalPages = Math.ceil(total / limit)

    params.push(limit, offset)
    const dataRes = await pool.query(
      `SELECT * FROM food_logs WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      pagination: { total, page, totalPages, limit },
    })
  } catch (err) {
    console.error('[/api/history GET]', err)
    return NextResponse.json({ error: 'Gagal mengambil history' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDB()
    const body = await req.json()
    const id = parseInt(body.id)
    const nama = String(body.nama ?? '').trim().slice(0, 255)
    if (!id || isNaN(id) || !nama) return NextResponse.json({ error: 'ID dan nama wajib diisi' }, { status: 400 })

    await pool.query('UPDATE food_logs SET nama = $1 WHERE id = $2', [nama, id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/history PATCH]', err)
    return NextResponse.json({ error: 'Gagal mengupdate nama' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const rawId = searchParams.get('id')
    const id = rawId && /^\d+$/.test(rawId) ? parseInt(rawId) : null
    if (!id) return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })

    await pool.query('DELETE FROM food_logs WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/history DELETE]', err)
    return NextResponse.json({ error: 'Gagal menghapus log' }, { status: 500 })
  }
}
