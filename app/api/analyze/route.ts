import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'
import { AnalyzeResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    await initDB()

    const body = await req.json()
    const { image_base64, media_type = 'image/jpeg', target_kalori = 2000 } = body

    if (!image_base64) {
      return NextResponse.json({ error: 'Tidak ada foto yang dikirim' }, { status: 400 })
    }

    const prompt = `Kamu adalah ahli gizi. Analisis foto makanan ini dan berikan estimasi kalori.

Balas HANYA dengan JSON valid tanpa teks lain, format:
{
  "nama": "nama hidangan utama",
  "porsi": "estimasi porsi (misal: 1 piring, 250g)",
  "total_kalori": angka,
  "protein_g": angka,
  "karbo_g": angka,
  "lemak_g": angka,
  "items": [
    {"nama": "item makanan", "kalori": angka}
  ],
  "saran": "saran singkat 1-2 kalimat untuk program turun berat badan dengan target ${target_kalori} kkal/hari"
}

Estimasi serealistis mungkin berdasarkan visual. Jika tidak ada makanan, isi total_kalori: 0.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${media_type};base64,${image_base64}` }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[OpenRouter error]', err)
      return NextResponse.json({ error: 'Gagal memanggil AI' }, { status: 500 })
    }

    const json = await response.json()
    const raw = json.choices?.[0]?.message?.content ?? ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed: AnalyzeResult = JSON.parse(clean)

    const result = await pool.query(
      `INSERT INTO food_logs (nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, items, saran, target_kalori)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        parsed.nama, parsed.porsi, parsed.total_kalori,
        parsed.protein_g, parsed.karbo_g, parsed.lemak_g,
        JSON.stringify(parsed.items), parsed.saran, target_kalori
      ]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })

  } catch (err) {
    console.error('[/api/analyze]', err)
    return NextResponse.json({ error: 'Gagal menganalisis foto' }, { status: 500 })
  }
}
