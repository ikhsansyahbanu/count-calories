import { getMacroTargets } from './macros'

export interface SaranItem {
  type: 'warning' | 'danger' | 'good'
  text: string
}

export function getSaranList(
  avgKal: number,
  avgProtein: number,
  avgKarbo: number,
  avgLemak: number,
  target: number,
  goal?: string,
): SaranItem[] {
  const { proteinG, karboG, lemakG } = getMacroTargets(target, goal)
  const kalPct = Math.round((avgKal / target) * 100)

  const list: SaranItem[] = []

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
