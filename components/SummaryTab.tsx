'use client'
import { useState, useEffect, useCallback } from 'react'
import { DaySummary, User, WeightLog } from '@/lib/types'
import { getBrowserTimezone } from '@/lib/tz'
import MacroChart, { MacroTab } from './MacroChart'
import { getSaranList, getWeightInsight, SaranItem } from '@/lib/insights'
import styles from './SummaryTab.module.css'

export default function SummaryTab({ user, refreshKey }: { user: User | null; refreshKey?: number }) {
  const [data, setData] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [macroTab, setMacroTab] = useState<MacroTab>('protein')
  const [showMacroChart, setShowMacroChart] = useState(false)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const tz = getBrowserTimezone()
      const res = await fetch(`/api/summary?days=${days}&tz=${encodeURIComponent(tz)}`)
      const json = await res.json()
      if (json.success) {
        const raw: DaySummary[] = json.data
        const dataMap = new Map<string, DaySummary>(raw.map(d => [d.tanggal, d]))
        const fallbackTarget = raw[0]?.target_kalori || user?.target_kalori || 2000
        // Fill all days in range; missing days get zero values so chart shows gaps
        const filled: DaySummary[] = []
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const tanggal = d.toLocaleDateString('sv') // YYYY-MM-DD in local timezone
          filled.push(dataMap.get(tanggal) ?? {
            tanggal,
            total_kalori: 0,
            total_protein: 0,
            total_karbo: 0,
            total_lemak: 0,
            jumlah_makan: 0,
            target_kalori: fallbackTarget,
          })
        }
        setData(filled)
      }
    } finally {
      setLoading(false)
    }
  }, [days, user?.id, user?.target_kalori])

  useEffect(() => { load() }, [load, refreshKey])

  // Fetch weight logs for trend analysis (Phase 4E)
  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/weight?limit=14`)
      .then(r => r.json())
      .then(json => { if (json.success) setWeightLogs(json.data) })
      .catch(() => {})
  }, [user?.id])

  if (loading) return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonDaySwitch}`} />
      </div>
      <div className={styles.statsGrid}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.statCard}>
            <div className={`${styles.skeleton} ${styles.skeletonStatVal}`} />
            <div className={`${styles.skeleton} ${styles.skeletonStatLbl}`} />
          </div>
        ))}
      </div>
      <div className={styles.chartCard}>
        <div className={`${styles.skeleton} ${styles.skeletonChartTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonChart}`} />
      </div>
      <div className={styles.chartCard}>
        <div className={`${styles.skeleton} ${styles.skeletonChartTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonChart}`} />
      </div>
    </div>
  )

  const daysWithData = data.filter(d => d.jumlah_makan > 0)

  if (daysWithData.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📊</div>
      <p>Belum ada data</p>
      <span>Mulai analisis makanan untuk melihat ringkasan</span>
    </div>
  )

  // Averages computed only from days that have logs
  const avgKal = Math.round(daysWithData.reduce((s, d) => s + d.total_kalori, 0) / daysWithData.length)
  const avgProtein = Math.round(daysWithData.reduce((s, d) => s + Number(d.total_protein), 0) / daysWithData.length)
  const avgKarbo = Math.round(daysWithData.reduce((s, d) => s + Number(d.total_karbo), 0) / daysWithData.length)
  const avgLemak = Math.round(daysWithData.reduce((s, d) => s + Number(d.total_lemak), 0) / daysWithData.length)

  const target = data[data.length - 1]?.target_kalori || user?.target_kalori || 2000
  const maxKal = Math.max(...data.map(d => d.total_kalori), target)

  // Weight trend for insight (Phase 4E)
  let weightInsight: SaranItem | null = null
  if (weightLogs.length >= 2 && user?.goal) {
    const latest = parseFloat(String(weightLogs[0].berat))
    const oldest = parseFloat(String(weightLogs[weightLogs.length - 1].berat))
    const weightDelta = latest - oldest
    weightInsight = getWeightInsight(weightDelta, user.goal)
  }

  const saranList = getSaranList(avgKal, avgProtein, avgKarbo, avgLemak, target, user?.goal)
  const fullSaranList: SaranItem[] = weightInsight ? [weightInsight, ...saranList] : saranList

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
          <div className={styles.statVal}>{daysWithData.length}</div>
          <div className={styles.statLbl}>Hari tercatat</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal} style={{ color: avgKal <= target ? 'var(--accent)' : 'var(--red)' }}>
            {Math.round((avgKal / target) * 100)}%
          </div>
          <div className={styles.statLbl}>Dari target</div>
        </div>
      </div>

      {/* Saran */}
      <div className={styles.saranCard}>
        <div className={styles.chartTitle}>Langkah Selanjutnya</div>
        {fullSaranList.map((s, i) => (
          <div key={i} className={`${styles.saranItem} ${styles[s.type]}`}>
            <span className={styles.saranIcon}>
              {s.type === 'good' ? '✅' : s.type === 'warning' ? '⚠️' : '🚨'}
            </span>
            <span>{s.text}</span>
          </div>
        ))}
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
              const date = new Date(d.tanggal + 'T00:00:00')
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

      {/* Macro trend chart — collapsible */}
      <div className={styles.chartCard}>
        <button className={styles.macroToggle} onClick={() => setShowMacroChart(s => !s)}>
          <span className={styles.chartTitle} style={{ margin: 0 }}>Tren Makronutrien</span>
          <span className={styles.macroToggleChevron}>{showMacroChart ? '▲' : '▼'}</span>
        </button>
        {showMacroChart && (
          <div className={styles.macroChartInner}>
            <MacroChart
              data={data}
              daysWithData={daysWithData}
              macroTab={macroTab}
              onMacroTabChange={setMacroTab}
              target={target}
              days={days}
              goal={user?.goal}
            />
          </div>
        )}
      </div>

    </div>
  )
}
