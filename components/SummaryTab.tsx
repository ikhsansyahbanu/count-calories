'use client'
import { useState, useEffect, useCallback } from 'react'
import { DaySummary, User } from '@/lib/types'
import styles from './SummaryTab.module.css'

type MacroTab = 'protein' | 'karbo' | 'lemak'

const MACRO_CONFIG = {
  protein: { label: 'Protein', color: 'var(--teal)', unit: 'g', pct: 0.25, kcalPerG: 4 },
  karbo:   { label: 'Karbo',   color: 'var(--amber)', unit: 'g', pct: 0.50, kcalPerG: 4 },
  lemak:   { label: 'Lemak',   color: 'var(--red)',   unit: 'g', pct: 0.25, kcalPerG: 9 },
}

export default function SummaryTab({ user }: { user: User | null }) {
  const [data, setData] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [macroTab, setMacroTab] = useState<MacroTab>('protein')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/summary?days=${days}`)
      const json = await res.json()
      if (json.success) setData(json.data.reverse())
    } finally {
      setLoading(false)
    }
  }, [days, user?.id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
    </div>
  )

  if (data.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📊</div>
      <p>Belum ada data</p>
      <span>Mulai analisis makanan untuk melihat ringkasan</span>
    </div>
  )

  const avgKal = Math.round(data.reduce((s, d) => s + d.total_kalori, 0) / data.length)
  const avgProtein = Math.round(data.reduce((s, d) => s + Number(d.total_protein), 0) / data.length)
  const avgKarbo = Math.round(data.reduce((s, d) => s + Number(d.total_karbo), 0) / data.length)
  const avgLemak = Math.round(data.reduce((s, d) => s + Number(d.total_lemak), 0) / data.length)
  const target = data[data.length - 1]?.target_kalori || 2000
  const maxKal = Math.max(...data.map(d => d.total_kalori), target)

  const saranList: { type: 'warning' | 'danger' | 'good'; text: string }[] = []
  const kalPct = Math.round((avgKal / target) * 100)

  if (kalPct > 120) saranList.push({ type: 'danger', text: `Rata-rata kalori kamu ${kalPct}% dari target — terlalu tinggi. Kurangi porsi nasi, gorengan, atau minuman manis.` })
  else if (kalPct > 100) saranList.push({ type: 'warning', text: `Rata-rata kalori sedikit melebihi target (${kalPct}%). Coba kurangi 1 porsi camilan per hari.` })
  else if (kalPct < 70) saranList.push({ type: 'warning', text: `Asupan kalori terlalu rendah (${kalPct}% dari target). Pastikan makan cukup agar energi tetap optimal.` })
  else saranList.push({ type: 'good', text: `Asupan kalori kamu terkontrol dengan baik (${kalPct}% dari target). Pertahankan!` })

  if (avgProtein > 175) saranList.push({ type: 'warning', text: `Protein rata-rata ${avgProtein}g/hari — di atas batas ideal 175g. Kurangi suplemen protein atau porsi daging.` })
  else if (avgProtein < 50) saranList.push({ type: 'danger', text: `Protein terlalu rendah (${avgProtein}g/hari). Tambahkan telur, tahu, tempe, atau daging tanpa lemak.` })

  if (avgKarbo > 300) saranList.push({ type: 'danger', text: `Karbohidrat rata-rata ${avgKarbo}g/hari — terlalu tinggi. Ganti nasi putih dengan nasi merah atau batasi roti & mi.` })
  else if (avgKarbo > 250) saranList.push({ type: 'warning', text: `Karbohidrat ${avgKarbo}g/hari sedikit berlebihan. Coba kurangi porsi nasi atau pilih karbohidrat kompleks.` })

  if (avgLemak > 80) saranList.push({ type: 'danger', text: `Lemak rata-rata ${avgLemak}g/hari — melebihi batas. Hindari gorengan dan pilih metode masak yang lebih sehat.` })
  else if (avgLemak > 70) saranList.push({ type: 'warning', text: `Lemak ${avgLemak}g/hari mendekati batas atas. Kurangi makanan berminyak atau santan berlebih.` })

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <h2 className={styles.title}>Ringkasan</h2>
        <div className={styles.daySwitch}>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              className={`${styles.dayBtn} ${days === d ? styles.dayBtnActive : ''}`}
              onClick={() => setDays(d)}
            >
              {d}h
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statVal} style={{ color: 'var(--accent)' }}>{avgKal}</div>
          <div className={styles.statLbl}>Rata-rata kkal/hari</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal} style={{ color: 'var(--teal)' }}>{avgProtein}g</div>
          <div className={styles.statLbl}>Rata-rata protein</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{data.length}</div>
          <div className={styles.statLbl}>Hari tercatat</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal} style={{ color: avgKal <= target ? 'var(--accent)' : 'var(--red)' }}>
            {Math.round((avgKal / target) * 100)}%
          </div>
          <div className={styles.statLbl}>Dari target</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Kalori Harian ({days} Hari Terakhir)</div>
        <div className={styles.chartWrap}>
          <div className={styles.chart}>
            <div
              className={styles.targetLine}
              style={{ bottom: `calc(${(target / maxKal) * 100}% - 1px)` }}
            >
              <span className={styles.targetLineLabel}>Target {target}</span>
            </div>
            {data.map((d, i) => {
              const height = (d.total_kalori / maxKal) * 100
              const over = d.total_kalori > target
              const date = new Date(d.tanggal)
              const dayLabel = date.toLocaleDateString('id-ID', { weekday: 'short' })
              const dateLabel = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              return (
                <div key={i} className={styles.barWrap}>
                  <div className={styles.barKal} style={{ color: over ? 'var(--red)' : 'var(--accent)' }}>
                    {days <= 14 && (d.total_kalori > 0 ? d.total_kalori : '–')}
                  </div>
                  <div className={styles.barOuter}>
                    <div
                      className={styles.barInner}
                      style={{
                        height: `${Math.max(height, d.total_kalori > 0 ? 3 : 0)}%`,
                        background: over ? 'var(--red)' : 'var(--accent)',
                      }}
                    />
                  </div>
                  <div className={styles.barLabel}>{days <= 7 ? dayLabel : dateLabel}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Macro trend chart */}
      <div className={styles.chartCard}>
        <div className={styles.macroChartHeader}>
          <div className={styles.chartTitle} style={{ marginBottom: 0 }}>Tren Makronutrien</div>
          <div className={styles.macroTabGroup}>
            {(Object.keys(MACRO_CONFIG) as MacroTab[]).map(tab => (
              <button
                key={tab}
                className={`${styles.macroTabBtn} ${macroTab === tab ? styles.macroTabBtnActive : ''}`}
                style={macroTab === tab ? { background: MACRO_CONFIG[tab].color, borderColor: MACRO_CONFIG[tab].color } : {}}
                onClick={() => setMacroTab(tab)}
              >
                {MACRO_CONFIG[tab].label}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const cfg = MACRO_CONFIG[macroTab]
          const key = macroTab === 'protein' ? 'total_protein' : macroTab === 'karbo' ? 'total_karbo' : 'total_lemak'
          const values = data.map(d => Number(d[key as keyof DaySummary]) || 0)
          const macroTarget = Math.round((target * cfg.pct) / cfg.kcalPerG)
          const maxVal = Math.max(...values, macroTarget)
          const avg = Math.round(values.reduce((s, v) => s + v, 0) / (values.length || 1))

          return (
            <>
              <div className={styles.macroChartMeta}>
                <span>Rata-rata: <strong style={{ color: cfg.color }}>{avg}g</strong></span>
                <span className={styles.macroChartTarget}>Target ~{macroTarget}g/hari</span>
              </div>
              <div className={styles.chartWrap}>
                <div className={styles.chart}>
                  <div
                    className={styles.targetLine}
                    style={{ bottom: `calc(${(macroTarget / maxVal) * 100}% - 1px)` }}
                  >
                    <span className={styles.targetLineLabel} style={{ color: cfg.color }}>
                      {macroTarget}g
                    </span>
                  </div>
                  {data.map((d, i) => {
                    const val = Number(d[key as keyof DaySummary]) || 0
                    const height = maxVal > 0 ? (val / maxVal) * 100 : 0
                    const over = val > macroTarget
                    const date = new Date(d.tanggal)
                    const dayLabel = date.toLocaleDateString('id-ID', { weekday: 'short' })
                    const dateLabel = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                    return (
                      <div key={i} className={styles.barWrap}>
                        <div className={styles.barKal} style={{ color: over ? 'var(--red)' : cfg.color }}>
                          {days <= 14 && (val > 0 ? `${val}g` : '–')}
                        </div>
                        <div className={styles.barOuter}>
                          <div
                            className={styles.barInner}
                            style={{
                              height: `${Math.max(height, val > 0 ? 3 : 0)}%`,
                              background: over ? 'var(--red)' : cfg.color,
                              opacity: over ? 1 : 0.85,
                            }}
                          />
                        </div>
                        <div className={styles.barLabel}>{days <= 7 ? dayLabel : dateLabel}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )
        })()}
      </div>

      {/* Saran */}
      <div className={styles.saranCard}>
        <div className={styles.chartTitle}>Saran & Evaluasi</div>
        {saranList.map((s, i) => (
          <div key={i} className={`${styles.saranItem} ${styles[s.type]}`}>
            <span className={styles.saranIcon}>
              {s.type === 'good' ? '✅' : s.type === 'warning' ? '⚠️' : '🚨'}
            </span>
            <span>{s.text}</span>
          </div>
        ))}
      </div>

      {/* Macro breakdown */}
      <div className={styles.macroCard}>
        <div className={styles.chartTitle}>Rata-rata Makronutrien / Hari</div>
        {[
          { label: 'Protein', val: avgProtein, max: 175, color: 'var(--teal)', unit: 'g', target: '150–175g' },
          {
            label: 'Karbo', unit: 'g', target: '150–200g', color: 'var(--amber)',
            val: Math.round(data.reduce((s, d) => s + Number(d.total_karbo), 0) / data.length),
            max: 250
          },
          {
            label: 'Lemak', unit: 'g', target: '50–70g', color: 'var(--red)',
            val: Math.round(data.reduce((s, d) => s + Number(d.total_lemak), 0) / data.length),
            max: 100
          },
        ].map(m => (
          <div key={m.label} className={styles.macroRow}>
            <div className={styles.macroMeta}>
              <span className={styles.macroName}>{m.label}</span>
              <span className={styles.macroVal} style={{ color: m.color }}>{m.val}{m.unit}</span>
            </div>
            <div className={styles.macroBarBg}>
              <div
                className={styles.macroBarFill}
                style={{ width: `${Math.min((m.val / m.max) * 100, 100)}%`, background: m.color }}
              />
            </div>
            <div className={styles.macroTarget}>Target: {m.target}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
