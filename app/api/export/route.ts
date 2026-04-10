import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',')
}

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const { searchParams } = new URL(req.url)

    const userId = parseInt(req.headers.get('x-user-id') || '0') || null
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const type = searchParams.get('type') || 'food'
    const rawDays = parseInt(searchParams.get('days') || '90')
    const days = Math.min(365, Math.max(1, isNaN(rawDays) ? 90 : rawDays))
    const tz = searchParams.get('tz') || 'Asia/Jakarta'

    const today = new Date().toISOString().slice(0, 10)

    if (type === 'weight') {
      const res = await pool.query(
        `SELECT created_at AT TIME ZONE $1 AS local_ts, berat, catatan, waist_cm
         FROM weight_logs
         WHERE user_id = $2
           AND created_at >= NOW() - ($3 || ' days')::interval
         ORDER BY created_at ASC`,
        [tz, userId, days]
      )

      const header = 'Tanggal,Waktu,Berat(kg),Lingkar Perut(cm),Catatan'
      const rows = res.rows.map(r => {
        const dt = new Date(r.local_ts)
        const tgl = dt.toLocaleDateString('sv')
        const jam = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        return toRow([tgl, jam, r.berat, r.waist_cm ?? '', r.catatan])
      })

      const csv = [header, ...rows].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="kalori-berat-${today}.csv"`,
        },
      })
    }

    // type === 'food' (default)
    const res = await pool.query(
      `SELECT created_at AT TIME ZONE $1 AS local_ts, nama, porsi, total_kalori,
              protein_g, karbo_g, lemak_g, keterangan, manual
       FROM food_logs
       WHERE user_id = $2
         AND created_at >= NOW() - ($3 || ' days')::interval
       ORDER BY created_at ASC`,
      [tz, userId, days]
    )

    const header = 'Tanggal,Waktu,Nama,Porsi,Kalori,Protein(g),Karbo(g),Lemak(g),Keterangan,Manual'
    const rows = res.rows.map(r => {
      const dt = new Date(r.local_ts)
      const tgl = dt.toLocaleDateString('sv')
      const jam = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      return toRow([tgl, jam, r.nama, r.porsi, r.total_kalori, r.protein_g, r.karbo_g, r.lemak_g, r.keterangan, r.manual ? '1' : '0'])
    })

    const csv = [header, ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kalori-export-${today}.csv"`,
      },
    })
  } catch (err) {
    console.error('[export]', err)
    return NextResponse.json({ success: false, error: 'Gagal export data' }, { status: 500 })
  }
}
