import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB, updateStreak } from '@/lib/db'
import { AnalyzeResult } from '@/lib/types'
import { rateLimit, getIP } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Rate limit: 30 estimasi per menit per IP
  const ip = getIP(req)
  if (!rateLimit(`manual:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Terlalu banyak request. Tunggu sebentar.' },
      { status: 429 }
    )
  }

  try {
    await initDB()

    const body = await req.json()
    const { nama, kategori = 'Makanan', porsi, metode_masak, santan, manis, suhu, target_kalori = 2000, keterangan = '', user_id } = body

    if (!nama) {
      return NextResponse.json({ error: 'Nama tidak boleh kosong' }, { status: 400 })
    }

    const isMinuman = kategori === 'Minuman'

    const promptMakanan = `Kamu adalah ahli gizi profesional yang sangat mengenal masakan Indonesia.

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
- Ukuran porsi: ${porsi} (Kecil=0.6x, Normal=1x, Besar=1.4x, Ekstra=1.8x porsi standar)
- Metode masak: ${metode_masak} (Goreng +40% kalori, Bakar -10%, Rebus/Kukus -15%, Mentah terendah)
- Pakai santan: ${santan ? 'Ya (+150 kkal)' : 'Tidak'}
- Target kalori harian: ${target_kalori} kkal

Instruksi:
- Jika input berisi beberapa makanan dipisah tanda + atau koma, analisis dan jumlahkan semuanya
- Terapkan faktor porsi dan metode masak per item jika disebutkan dalam nama, atau gunakan faktor global
- Estimasi makro secara proporsional
- confidence: "high" jika makanan umum Indonesia, "medium" jika kurang yakin, "low" jika tidak dikenal
- items: rincian setiap komponen makanan

Kembalikan HANYA JSON valid, tanpa teks lain, tanpa markdown:
{
  "nama": "nama hidangan dalam Bahasa Indonesia",
  "porsi": "estimasi total porsi",
  "total_kalori": angka,
  "protein_g": angka,
  "karbo_g": angka,
  "lemak_g": angka,
  "confidence": "low | medium | high",
  "items": [{"nama": "nama komponen", "kalori": angka, "gram": angka}],
  "saran": "saran personal 1-2 kalimat dalam Bahasa Indonesia berdasarkan target ${target_kalori} kkal/hari"
}`

    const promptMinuman = `Kamu adalah ahli gizi profesional yang sangat mengenal minuman Indonesia.

Referensi kalori minuman Indonesia umum (ukuran normal 250ml):
- Air putih: 0 kkal
- Teh tawar: 2 kkal
- Teh manis: 80 kkal
- Es teh manis: 80 kkal
- Kopi hitam tanpa gula: 5 kkal
- Kopi susu kekinian: 250 kkal
- Es kopi susu: 200 kkal
- Jus jeruk 1 gelas: 110 kkal
- Jus alpukat 1 gelas: 300 kkal
- Jus mangga 1 gelas: 130 kkal
- Es buah 1 mangkok: 180 kkal
- Susu putih 1 gelas: 150 kkal
- Susu coklat 1 gelas: 200 kkal
- Boba milk tea 1 cup: 350 kkal
- Es dawet 1 gelas: 200 kkal
- Wedang jahe: 50 kkal
- Soda kaleng 330ml: 140 kkal

Minuman yang akan diestimasi:
- Nama: ${nama}
- Ukuran: ${porsi} (Kecil=200ml, Normal=250ml, Besar=350ml, Ekstra=500ml)
- Tingkat kemanisan: ${manis} (Tidak Manis: gula 0%, Sedikit Manis: gula 50%, Manis: gula 100%, Sangat Manis: gula 150% dari standar)
- Suhu: ${suhu} (tidak mempengaruhi kalori signifikan, hanya konteks)
- Target kalori harian: ${target_kalori} kkal

Instruksi:
- Estimasi kalori berdasarkan nama dan faktor kemanisan
- Tidak Manis: kurangi 80% kalori dari gula, Sedikit Manis: kurangi 40%, Manis: standar, Sangat Manis: tambah 50% kalori gula
- Terapkan faktor ukuran porsi
- protein_g dan lemak_g biasanya rendah untuk minuman kecuali ada susu/santan
- confidence: "high" jika minuman umum Indonesia, "medium" jika kurang yakin, "low" jika tidak dikenal
- items: komponen minuman (gula, susu, boba, dll)

Kembalikan HANYA JSON valid, tanpa teks lain, tanpa markdown:
{
  "nama": "nama minuman dalam Bahasa Indonesia",
  "porsi": "estimasi volume (misal: 250ml, 1 gelas)",
  "total_kalori": angka,
  "protein_g": angka,
  "karbo_g": angka,
  "lemak_g": angka,
  "confidence": "low | medium | high",
  "items": [{"nama": "nama komponen", "kalori": angka, "gram": angka}],
  "saran": "saran personal 1-2 kalimat dalam Bahasa Indonesia berdasarkan target ${target_kalori} kkal/hari"
}`

    const prompt = isMinuman ? promptMinuman : promptMakanan

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

    const withoutThinking = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
    const clean = withoutThinking.replace(/```json\s*|\s*```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Parse error] No JSON found in response:', clean)
      return NextResponse.json({ error: 'AI tidak dapat mengestimasi makanan ini' }, { status: 500 })
    }
    const parsed: AnalyzeResult = JSON.parse(jsonMatch[0])

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

    if (user_id) await updateStreak(user_id)

    return NextResponse.json({ success: true, data: result.rows[0] })

  } catch (err) {
    console.error('[/api/manual]', err)
    return NextResponse.json({ error: 'Gagal mengestimasi kalori' }, { status: 500 })
  }
}
