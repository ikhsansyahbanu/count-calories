import { getMacroTargets } from './macros'
import { DaySummary } from './types'

export interface SaranItem {
  type: 'warning' | 'danger' | 'good'
  text: string
}

export interface DayOfWeekPattern {
  worstDay: string
  worstAvg: number
  bestDay: string
  bestAvg: number
}

export type TrendResult = 'improving' | 'worsening' | 'stable'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

// ─── Phase 3B ────────────────────────────────────────────────────────────────

export function getDayOfWeekPattern(data: DaySummary[]): DayOfWeekPattern | null {
  const daysWithData = data.filter(d => d.jumlah_makan > 0)
  if (daysWithData.length < 3) return null

  // Aggregate kalori per day-of-week
  const sums: Record<number, number> = {}
  const counts: Record<number, number> = {}
  for (const d of daysWithData) {
    const dow = new Date(d.tanggal + 'T00:00:00').getDay()
    sums[dow] = (sums[dow] ?? 0) + d.total_kalori
    counts[dow] = (counts[dow] ?? 0) + 1
  }

  const avgs = Object.entries(sums).map(([dow, sum]) => ({
    dow: parseInt(dow),
    avg: Math.round(sum / counts[parseInt(dow)]),
  }))

  if (avgs.length < 2) return null

  const sorted = [...avgs].sort((a, b) => b.avg - a.avg)
  return {
    worstDay: DAY_NAMES[sorted[0].dow],
    worstAvg: sorted[0].avg,
    bestDay: DAY_NAMES[sorted[sorted.length - 1].dow],
    bestAvg: sorted[sorted.length - 1].avg,
  }
}

export function getPatternSaran(pattern: DayOfWeekPattern | null, target: number): SaranItem | null {
  if (!pattern || pattern.worstAvg <= target * 1.15) return null
  return {
    type: 'warning',
    text: `📅 Kalorimu rata-rata paling tinggi di hari ${pattern.worstDay} (${pattern.worstAvg.toLocaleString('id-ID')} kkal) — siapkan pilihan makan lebih ringan untuk hari itu.`,
  }
}

// ─── Phase 3C ────────────────────────────────────────────────────────────────

export function getTrend(thisAvg: number, lastAvg: number, target: number): TrendResult {
  if (thisAvg < lastAvg - 50 && thisAvg <= target) return 'improving'
  if (thisAvg > lastAvg + 50) return 'worsening'
  return 'stable'
}

// ─── Phase 3D ────────────────────────────────────────────────────────────────

export function getConsistencyInsight(daysOnTarget: number, total: number): SaranItem {
  if (daysOnTarget === total && total > 0) {
    return { type: 'good', text: 'Sempurna! Semua hari tercatat dalam target — pertahankan!' }
  }
  if (daysOnTarget < total / 2) {
    return { type: 'danger', text: 'Lebih dari setengah hari melebihi target — coba mulai dengan 1 hari on-target besok.' }
  }
  return { type: 'good', text: `${daysOnTarget}/${total} hari dalam target — terus tingkatkan konsistensimu!` }
}

// ─── Phase 3E — Extended getSaranList ────────────────────────────────────────

export interface SaranOpts {
  daysOnTarget?: number
  totalDays?: number
  worstDay?: string
  worstAvg?: number
  target?: number
}

export function getSaranList(
  avgKal: number,
  avgProtein: number,
  avgKarbo: number,
  avgLemak: number,
  target: number,
  goal?: string,
  opts?: SaranOpts,
): SaranItem[] {
  const { proteinG, karboG, lemakG } = getMacroTargets(target, goal)
  const kalPct = Math.round((avgKal / target) * 100)

  const list: SaranItem[] = []

  // Consistency insight first (Phase 3D/3E)
  if (opts?.daysOnTarget !== undefined && opts?.totalDays && opts.totalDays > 0) {
    list.push(getConsistencyInsight(opts.daysOnTarget, opts.totalDays))
  }

  // Goal-aware calorie advice
  if (goal === 'bulking' && kalPct < 95) {
    list.push({ type: 'warning', text: `Asupan terlalu rendah untuk bulking (${kalPct}%). → Tambah 1 porsi karbohidrat atau protein di setiap makan.` })
  } else if (goal === 'cutting' && kalPct > 105) {
    list.push({ type: 'warning', text: `Melebihi target cutting (${kalPct}%). → Kurangi 1 porsi nasi dan ganti dengan sayuran.` })
  } else if (goal === 'cutting' && kalPct < 75) {
    list.push({ type: 'danger', text: `Defisit terlalu besar (${kalPct}%). → Terlalu rendah bisa sebabkan muscle loss, tambah minimal 200 kkal.` })
  } else if (kalPct > 120) {
    list.push({ type: 'danger', text: `Kalori rata-rata ${kalPct}% dari target. → Besok, kurangi 1 porsi nasi atau skip 1 gorengan & minuman manis.` })
  } else if (kalPct > 100) {
    list.push({ type: 'warning', text: `Kalori sedikit melebihi target (${kalPct}%). → Ganti 1 camilan dengan buah atau yogurt rendah lemak.` })
  } else if (kalPct < 70) {
    list.push({ type: 'warning', text: `Asupan kalori terlalu rendah (${kalPct}%). → Tambah 1 porsi makan atau camilan padat nutrisi agar energi optimal.` })
  } else {
    list.push({ type: 'good', text: `Kalori terkontrol minggu ini (${kalPct}% dari target) — pertahankan ritme ini!` })
  }

  // Goal-aware protein advice
  if (goal === 'cutting' && avgProtein < proteinG * 0.8) {
    list.push({ type: 'danger', text: `Protein rendah saat cutting bisa sebabkan kehilangan otot. → Prioritaskan telur, ayam, atau tahu setiap makan.` })
  } else if (goal === 'bulking' && avgProtein > proteinG * 1.3) {
    list.push({ type: 'warning', text: `Protein sudah lebih dari cukup untuk bulking. → Fokus tambah karbohidrat kompleks untuk energi.` })
  } else if (avgProtein > proteinG * 1.25) {
    list.push({ type: 'warning', text: `Protein rata-rata ${avgProtein}g/hari — di atas batas ideal ${proteinG}g. → Kurangi porsi daging merah, ganti dengan tempe atau ikan.` })
  } else if (avgProtein < 50) {
    list.push({ type: 'danger', text: `Protein hanya ${avgProtein}g/hari. → Tambah 2 butir telur atau 1 porsi tahu/tempe di setiap makan utama.` })
  }

  if (avgKarbo > karboG * 1.25) {
    list.push({ type: 'danger', text: `Karbohidrat rata-rata ${avgKarbo}g/hari. → Ganti nasi putih dengan nasi merah atau kurangi setengah porsi nasi mulai besok.` })
  } else if (avgKarbo > karboG * 1.1) {
    list.push({ type: 'warning', text: `Karbohidrat ${avgKarbo}g/hari sedikit berlebihan. → Pilih karbohidrat kompleks (ubi, oat) dan hindari roti putih & mi instan.` })
  }

  if (avgLemak > lemakG * 1.25) {
    list.push({ type: 'danger', text: `Lemak rata-rata ${avgLemak}g/hari — melebihi batas. → Ganti gorengan dengan panggang/rebus, dan batasi santan.` })
  } else if (avgLemak > lemakG * 1.1) {
    list.push({ type: 'warning', text: `Lemak ${avgLemak}g/hari mendekati batas. → Kurangi 1 porsi makanan berminyak per hari, pilih metode masak lebih sehat.` })
  }

  // Pattern saran (Phase 3B/3E)
  if (opts?.worstDay && opts?.worstAvg && opts.worstAvg > target * 1.15) {
    const pattern: DayOfWeekPattern = { worstDay: opts.worstDay, worstAvg: opts.worstAvg, bestDay: '', bestAvg: 0 }
    const ps = getPatternSaran(pattern, target)
    if (ps) list.push(ps)
  }

  return list
}

export function getWeightInsight(weightDelta: number, goal?: string): SaranItem | null {
  const abs = Math.abs(weightDelta).toFixed(1)
  if (goal === 'cutting') {
    if (weightDelta < -0.3) return { type: 'good', text: `Berat turun ${abs}kg dalam 2 minggu — program cutting berjalan baik!` }
    if (weightDelta > 0.2) return { type: 'warning', text: `Berat naik ${weightDelta.toFixed(1)}kg saat cutting — periksa asupan kalori harian.` }
  } else if (goal === 'bulking') {
    if (weightDelta > 0.2) return { type: 'good', text: `Berat naik ${weightDelta.toFixed(1)}kg — progress bulking sesuai rencana.` }
    if (weightDelta < -0.1) return { type: 'danger', text: `Berat turun saat bulking — asupan kalori masih kurang dari kebutuhan.` }
  }
  return null
}
