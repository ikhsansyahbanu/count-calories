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
): SaranItem[] {
  const proteinTarget = Math.round((target * 0.25) / 4)
  const karboTarget   = Math.round((target * 0.50) / 4)
  const lemakTarget   = Math.round((target * 0.25) / 9)
  const kalPct = Math.round((avgKal / target) * 100)

  const list: SaranItem[] = []

  if (kalPct > 120) list.push({ type: 'danger', text: `Kalori rata-rata ${kalPct}% dari target. → Besok, kurangi 1 porsi nasi atau skip 1 gorengan & minuman manis.` })
  else if (kalPct > 100) list.push({ type: 'warning', text: `Kalori sedikit melebihi target (${kalPct}%). → Ganti 1 camilan dengan buah atau yogurt rendah lemak.` })
  else if (kalPct < 70) list.push({ type: 'warning', text: `Asupan kalori terlalu rendah (${kalPct}%). → Tambah 1 porsi makan atau camilan padat nutrisi agar energi optimal.` })
  else list.push({ type: 'good', text: `Kalori terkontrol minggu ini (${kalPct}% dari target) — pertahankan ritme ini!` })

  if (avgProtein > proteinTarget * 1.25) list.push({ type: 'warning', text: `Protein rata-rata ${avgProtein}g/hari — di atas batas ideal ${proteinTarget}g. → Kurangi porsi daging merah, ganti dengan tempe atau ikan.` })
  else if (avgProtein < 50) list.push({ type: 'danger', text: `Protein hanya ${avgProtein}g/hari. → Tambah 2 butir telur atau 1 porsi tahu/tempe di setiap makan utama.` })

  if (avgKarbo > karboTarget * 1.25) list.push({ type: 'danger', text: `Karbohidrat rata-rata ${avgKarbo}g/hari. → Ganti nasi putih dengan nasi merah atau kurangi setengah porsi nasi mulai besok.` })
  else if (avgKarbo > karboTarget * 1.1) list.push({ type: 'warning', text: `Karbohidrat ${avgKarbo}g/hari sedikit berlebihan. → Pilih karbohidrat kompleks (ubi, oat) dan hindari roti putih & mi instan.` })

  if (avgLemak > lemakTarget * 1.25) list.push({ type: 'danger', text: `Lemak rata-rata ${avgLemak}g/hari — melebihi batas. → Ganti gorengan dengan panggang/rebus, dan batasi santan.` })
  else if (avgLemak > lemakTarget * 1.1) list.push({ type: 'warning', text: `Lemak ${avgLemak}g/hari mendekati batas. → Kurangi 1 porsi makanan berminyak per hari, pilih metode masak lebih sehat.` })

  return list
}
