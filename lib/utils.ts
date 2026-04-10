import { FoodItem, User } from './types'

interface TodayShareData {
  kalori_hari_ini: number
  target_kalori: number
  protein: number
  karbo: number
  lemak: number
  streak?: number
}

export function buildShareText(data: TodayShareData, user: User): string {
  const pct = Math.round((data.kalori_hari_ini / data.target_kalori) * 100)
  const goalLabel = user.goal === 'cutting' ? 'Cutting' : user.goal === 'bulking' ? 'Bulking' : null
  const lines = [
    '📊 Kalori.AI Update',
    `✅ Hari ini: ${data.kalori_hari_ini.toLocaleString('id-ID')} / ${data.target_kalori.toLocaleString('id-ID')} kkal (${pct}%)`,
    `💪 Protein: ${data.protein}g · Karbo: ${data.karbo}g · Lemak: ${data.lemak}g`,
  ]
  if (data.streak && data.streak >= 2) lines.push(`🔥 Streak: ${data.streak} hari berturut-turut`)
  if (goalLabel) lines.push(`🎯 Goal: ${goalLabel}`)
  return lines.join('\n')
}

export function parseItems(items: FoodItem[] | string | undefined): FoodItem[] {
  if (!items) return []
  if (typeof items === 'string') {
    try { return JSON.parse(items) } catch { return [] }
  }
  return items
}

type Aktivitas = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

const AKTIVITAS_MULTIPLIER: Record<Aktivitas, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function computeTDEE(user: User): number | null {
  const { berat_badan, tinggi_badan, usia, jenis_kelamin, aktivitas } = user
  if (!berat_badan || !tinggi_badan || !usia) return null
  const bmr = jenis_kelamin === 'perempuan'
    ? 447.593 + (9.247 * berat_badan) + (3.098 * tinggi_badan) - (4.330 * usia)
    : 88.362 + (13.397 * berat_badan) + (4.799 * tinggi_badan) - (5.677 * usia)
  return Math.round(bmr * AKTIVITAS_MULTIPLIER[aktivitas as Aktivitas])
}

export function getCalorieTarget(tdee: number, goal?: string): number {
  let target = tdee
  if (goal === 'cutting') target = tdee - 500
  else if (goal === 'bulking') target = tdee + 300
  return Math.round(Math.max(1200, Math.min(5000, target)))
}

export function estimateWeeklyWeightChange(tdee: number, target: number): number {
  const deficit = tdee - target
  const weekly = (deficit * 7) / 7700
  return Number(weekly.toFixed(2))
}

export function getMealContext(): string {
  const h = new Date().getHours()
  if (h < 10) return 'Makan Pagi'
  if (h < 14) return 'Makan Siang'
  if (h < 18) return 'Snack'
  return 'Makan Malam'
}
