import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const date = searchParams.get('date')

    const user_id = searchParams.get('user_id')
    let query = 'SELECT * FROM food_logs WHERE 1=1'
    const params: (string | number)[] = []

    if (user_id) {
      params.push(user_id)
      query += ` AND user_id = $${params.length}`
    }
    if (date) {
      params.push(date)
      query += ` AND DATE(created_at) = $${params.length}`
    }

    params.push(limit)
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`

    const result = await pool.query(query, params)
    return NextResponse.json({ success: true, data: result.rows })

  } catch (err) {
    console.error('[/api/history GET]', err)
    return NextResponse.json({ error: 'Gagal mengambil history' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, nama } = await req.json()
    if (!id || !nama) return NextResponse.json({ error: 'ID dan nama wajib diisi' }, { status: 400 })

    await pool.query('UPDATE food_logs SET nama = $1 WHERE id = $2', [nama, id])
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[/api/history PATCH]', err)
    return NextResponse.json({ error: 'Gagal mengupdate nama' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })

    await pool.query('DELETE FROM food_logs WHERE id = $1', [id])
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[/api/history DELETE]', err)
    return NextResponse.json({ error: 'Gagal menghapus log' }, { status: 500 })
  }
}
