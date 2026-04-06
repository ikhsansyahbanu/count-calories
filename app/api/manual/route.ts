import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB } from '@/lib/db'
import { AnalyzeResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    await initDB()

    const body = await req.json()
    const { nama, porsi, metode_masak, santan, target_kalori = 2000, keterangan = '', user_id } = body

    if (!nama) {
      return NextResponse.json({ error: 'Nama makanan tidak boleh kosong' }, { status: 400 })
    }

    const prompt = `Kamu adalah ahli gizi profesional yang sangat mengenal masakan Indonesia.

Referensi kalori makanan Indonesia umum:
- Nasi putih 1 centong (100g): 175 kkal
- Nasi goreng 1 porsi: 550 kkal
- Nasi uduk 1 porsi: 400 kkal
- Ayam goreng 1 potong paha: 250 kkal
- Ayam bakar 1 potong: 180 kkal
- Tempe goreng 1 potong: 100 kkal
- Tahu goreng 1 potong: 80 kkal
- Mie goreng 1 porsi: 480 kkal
- Rendang 1 porsi (80g): 195 kkal
- Gado-gado 1 porsi: 300 kkal
- Soto ayam 1 mangkok: 250 kkal
- Bakso 1 mangkok: 300 kkal
- Ketoprak 1 porsi: 350 kkal
- Pecel lele 1 porsi: 450 kkal
- Nasi padang 1 porsi: 700 kkal

Makanan yang akan diestimasi:
- Nama: ${nama}
- Ukuran porsi: ${porsi} (Kecil=0.6x porsi standar, Normal=1x porsi standar, Besar=1.4x porsi standar, Ekstra=1.8x porsi standar)
- Metode masak: ${metode_masak} (Goreng menambah +40% kalori dari base, Bakar lebih rendah kalori, Rebus/Kukus paling rendah kalori, Mentah paling rendah)
- Pakai santan: ${santan ? 'Ya (tambahkan +150 kkal untuk santan)' : 'Tidak'}
- Target kalori harian pengguna: ${target_kalori} kkal

Instruksi:
- Estimasi kalori makanan ${nama} berdasarkan informasi di atas
- Terapkan faktor porsi: Kecil=0.6x, Normal=1x, Besar=1.4x, Ekstra=1.8x dari kalori standar
- Terapkan faktor metode masak: Goreng +40% kalori, Bakar kalori standar dikurangi 10%, Rebus/Kukus kalori standar dikurangi 15%, Mentah kalori terendah
- Jika bersantan, tambahkan +150 kkal
- Estimasi makro (protein, karbo, lemak) secara proporsional
- Berikan saran personal 1-2 kalimat dalam Bahasa Indonesia berdasarkan makanan dan target ${target_kalori} kkal/hari
- confidence: "high" jika makanan umum Indonesia, "medium" jika kurang yakin, "low" jika tidak dikenal
- items: rincian komponen makanan jika ada (misal nasi + lauk + sayur)

Kembalikan HANYA JSON valid, tanpa teks lain, tanpa markdown:
{
  "nama": "nama hidangan dalam Bahasa Indonesia",
  "porsi": "estimasi total porsi (misal: 1 piring 350g, porsi ${porsi})",
  "total_kalori": angka,
  "protein_g": angka,
  "karbo_g": angka,
  "lemak_g": angka,
  "confidence": "low | medium | high",
  "items": [
    {"nama": "nama komponen dalam Bahasa Indonesia", "kalori": angka, "gram": angka}
  ],
  "saran": "saran personal 1-2 kalimat dalam Bahasa Indonesia"
}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
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
      `INSERT INTO food_logs (user_id, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, items, saran, target_kalori, keterangan, confidence, manual)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        user_id || null, parsed.nama, parsed.porsi, parsed.total_kalori,
        parsed.protein_g, parsed.karbo_g, parsed.lemak_g,
        JSON.stringify(parsed.items), parsed.saran, target_kalori, keterangan,
        parsed.confidence || 'medium', true
      ]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })

  } catch (err) {
    console.error('[/api/manual]', err)
    return NextResponse.json({ error: 'Gagal mengestimasi kalori' }, { status: 500 })
  }
}
