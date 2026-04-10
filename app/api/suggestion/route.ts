import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// In-memory cache: key = hash of input values, value = suggestion string
const cache = new Map<string, string>()

function hashKey(kalori: number, target: number, protein: number, lemak: number, jumlah_makan: number, jam: number, goal: string): string {
  return `${kalori}|${target}|${protein}|${lemak}|${jumlah_makan}|${jam}|${goal}`
}

function buildPrompt(kalori: number, target: number, protein: number, karbo: number, lemak: number, goal: string, jumlah_makan: number, jam: number): string {
  const goalLabel = goal === 'cutting' ? 'turun berat badan' : goal === 'bulking' ? 'naik berat badan' : 'jaga berat badan'
  const sisa = target - kalori
  return `Kamu adalah asisten gizi. Jawab dalam 1 kalimat bahasa Indonesia kasual, maksimal 20 kata, TANPA emoji.

User sudah makan ${jumlah_makan}x hari ini (jam ${jam}:00).
Total kalori hari ini: ${kalori} dari ${target} kkal (sisa ${sisa} kkal).
Makronutrien: protein ${protein}g, karbo ${karbo}g, lemak ${lemak}g.
Goal: ${goalLabel}.

Berikan 1 saran spesifik dan singkat untuk sisa hari ini.`
}

export async function POST(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0') || null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 10 per menit per user
  if (!await rateLimit(`suggestion:${userId}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Terlalu banyak request. Tunggu sebentar.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const kalori      = Math.round(Number(body.kalori) || 0)
    const target      = Math.round(Number(body.target) || 2000)
    const protein     = Math.round(Number(body.protein) || 0)
    const karbo       = Math.round(Number(body.karbo) || 0)
    const lemak       = Math.round(Number(body.lemak) || 0)
    const goal        = String(body.goal || 'maintain')
    const jumlah_makan = Math.round(Number(body.jumlah_makan) || 0)
    const jam         = Math.round(Number(body.jam) || new Date().getHours())

    if (jumlah_makan === 0) {
      return NextResponse.json({ suggestion: null }, { status: 200 })
    }

    const key = hashKey(kalori, target, protein, lemak, jumlah_makan, jam, goal)
    const cached = cache.get(key)
    if (cached) return NextResponse.json({ suggestion: cached })

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ suggestion: null }, { status: 200 })
    }

    const prompt = buildPrompt(kalori, target, protein, karbo, lemak, goal, jumlah_makan, jam)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5-8b',
        max_tokens: 80,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.error('[suggestion] OpenRouter error', response.status)
      return NextResponse.json({ suggestion: null }, { status: 200 })
    }

    const json = await response.json()
    const suggestion = (json.choices?.[0]?.message?.content ?? '').trim()
    if (!suggestion) return NextResponse.json({ suggestion: null }, { status: 200 })

    // Cache result — evict if cache grows large
    if (cache.size > 500) cache.clear()
    cache.set(key, suggestion)

    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('[suggestion]', err)
    return NextResponse.json({ suggestion: null }, { status: 200 })
  }
}
