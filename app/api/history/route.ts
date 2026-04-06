import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const date = searchParams.get('date')

    let query = 'SELECT * FROM food_logs'
    const params: (string | number)[] = []

    if (date) {
      query += ' WHERE DATE(created_at) = $1'
      params.push(date)
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

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
