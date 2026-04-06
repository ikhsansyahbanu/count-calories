import { NextRequest, NextResponse } from 'next/server'
import pool, { initDB, updateStreak } from '@/lib/db'
import { AnalyzeResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    await initDB()

    const body = await req.json()
    const { image_base64, media_type = 'image/jpeg', target_kalori = 2000, keterangan = '', user_id } = body

    if (!image_base64) {
      return NextResponse.json({ error: 'Tidak ada foto yang dikirim' }, { status: 400 })
    }

    const prompt = `You are a professional nutritionist and food image analyst specialized in Indonesian cuisine.

Reference calories for common Indonesian food:
- Nasi putih 1 centong (100g): 175 kcal
- Nasi goreng 1 porsi: 550 kcal
- Nasi uduk 1 porsi: 400 kcal
- Ayam goreng 1 potong paha: 250 kcal
- Ayam bakar 1 potong: 180 kcal
- Tempe goreng 1 potong: 100 kcal
- Tahu goreng 1 potong: 80 kcal
- Mie goreng 1 porsi: 480 kcal
- Rendang 1 porsi (80g): 195 kcal
- Gado-gado 1 porsi: 300 kcal
- Soto ayam 1 mangkok: 250 kcal
- Bakso 1 mangkok: 300 kcal
- Ketoprak 1 porsi: 350 kcal
- Pecel lele 1 porsi: 450 kcal
- Nasi padang 1 porsi: 700 kcal

Instructions:
- Identify ALL visible food and drink items in the image
- Estimate portion size per item in grams realistically based on plate/bowl size
- Consider cooking methods: fried adds 30-50% more calories, coconut milk adds 100-200 kcal, grilled is closer to raw weight
- Include hidden calories: cooking oil, sugar, sauces, coconut milk, condiments
- If food is Indonesian, prioritize local knowledge and reference data above
- Sum of items calories must be close to total_kalori
- If no food is visible, set total_kalori to 0
- For saran: give specific personalized advice based on the actual food eaten and the user's daily target of ${target_kalori} kcal

Return ONLY valid JSON, no other text, no markdown:
{
  "nama": "nama hidangan utama dalam Bahasa Indonesia",
  "porsi": "estimasi total porsi (misal: 1 piring 350g)",
  "total_kalori": angka,
  "protein_g": angka,
  "karbo_g": angka,
  "lemak_g": angka,
  "confidence": "low | medium | high",
  "items": [
    {"nama": "nama item dalam Bahasa Indonesia", "kalori": angka, "gram": angka}
  ],
  "saran": "saran personal 1-2 kalimat dalam Bahasa Indonesia berdasarkan makanan yang dikonsumsi dan target ${target_kalori} kkal/hari"
}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 4000,
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

    // Strip thinking tags (Gemini 2.5 Flash kadang menambahkan <thinking>...</thinking>)
    const withoutThinking = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
    // Strip markdown code blocks
    const clean = withoutThinking.replace(/```json\s*|\s*```/g, '').trim()
    // Extract JSON object jika ada teks lain
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Parse error] No JSON found in response:', clean)
      return NextResponse.json({ error: 'AI tidak dapat menganalisis foto ini' }, { status: 500 })
    }
    const parsed: AnalyzeResult = JSON.parse(jsonMatch[0])

    const result = await pool.query(
      `INSERT INTO food_logs (user_id, nama, porsi, total_kalori, protein_g, karbo_g, lemak_g, items, saran, target_kalori, keterangan, confidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        user_id || null, parsed.nama, parsed.porsi, parsed.total_kalori,
        parsed.protein_g, parsed.karbo_g, parsed.lemak_g,
        JSON.stringify(parsed.items), parsed.saran, target_kalori, keterangan,
        parsed.confidence || 'medium'
      ]
    )

    if (user_id) await updateStreak(user_id)

    return NextResponse.json({ success: true, data: result.rows[0] })

  } catch (err) {
    console.error('[/api/analyze]', err)
    return NextResponse.json({ error: 'Gagal menganalisis foto' }, { status: 500 })
  }
}
