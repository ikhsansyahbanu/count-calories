'use client'
import { useState, useEffect, useCallback } from 'react'
import { DaySummary, User, WeightLog } from '@/lib/types'
import { getBrowserTimezone } from '@/lib/tz'
import MacroChart, { MacroTab } from './MacroChart'
import {
  getSaranList, getWeightInsight, getDayOfWeekPattern,
  getTrend, SaranItem,
} from '@/lib/insights'
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
      const res = await fetch(`/api/summary?days=${days}&tz=${encodeURIComponent(tz)}&_r=${refreshKey ?? 0}`)
      const json = await res.json()
      if (json.success) {
        const raw: DaySummary[] = json.data
        const dataMap = new Map<string, DaySummary>(raw.map(d => [d.tanggal, d]))
        const fallbackTarget = raw[0]?.target_kalori || user?.target_kalori || 2000
        const filled: DaySummary[] = []
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const tanggal = d.toLocaleDateString('sv')
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
  }, [days, user?.id, user?.target_kalori, refreshKey])

  useEffect(() => { load() }, [load])

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

  const avgKal     = Math.round(daysWithData.reduce((s, d) => s + d.total_kalori, 0) / daysWithData.length)
  const avgProtein = Math.round(daysWithData.reduce((s, d) => s + Number(d.total_protein), 0) / daysWithData.length)
  const avgKarbo   = Math.round(daysWithData.reduce((s, d) => s + Number(d.total_karbo), 0) / daysWithData.length)
  const avgLemak   = Math.round(daysWithData.reduce((s, d) => s + Number(d.total_lemak), 0) / daysWithData.length)

  const target = data[data.length - 1]?.target_kalori || user?.target_kalori || 2000
  const maxKal = Math.max(...data.map(d => d.total_kalori), target)

  // ─── Phase 3A: Weekly net ─────────────────────────────────────────────────
  const weeklyNet = daysWithData.reduce((s, d) => s + (d.total_kalori - d.target_kalori), 0)
  const netIsDefisit = weeklyNet < 0
  const netFormatted = `${netIsDefisit ? '−' : '+'}${Math.abs(Math.round(weeklyNet)).toLocaleString('id-ID')} kkal`

  // ─── Phase 3B: Day-of-week pattern (only when days===30) ─────────────────
  const pattern = days === 30 ? getDayOfWeekPattern(daysWithData) : null

  // ─── Phase 3C: Week-over-week trend (only when days===14) ────────────────
  let trendResult: ReturnType<typeof getTrend> | null = null
  let avgKalThis: number | null = null
  let avgKalLast: number | null = null

  if (days === 14) {
    const lastWeekData = data.slice(0, 7).filter(d => d.jumlah_makan > 0)
    const thisWeekData = data.slice(7, 14).filter(d => d.jumlah_makan > 0)
    if (lastWeekData.length > 0 && thisWeekData.length > 0) {
      avgKalThis = Math.round(thisWeekData.reduce((s, d) => s + d.total_kalori, 0) / thisWeekData.length)
      avgKalLast = Math.round(lastWeekData.reduce((s, d) => s + d.total_kalori, 0) / lastWeekData.length)
      trendResult = getTrend(avgKalThis, avgKalLast, target)
    }
  }

  const kalDeltaVsLastWeek = avgKalThis !== null && avgKalLast !== null ? avgKalThis - avgKalLast : null

  // ─── Phase 3D: Consistency score ─────────────────────────────────────────
  const daysOnTarget = daysWithData.filter(d => d.total_kalori <= d.target_kalori * 1.05).length
  const consistColor =
    daysOnTarget >= Math.ceil(daysWithData.length * 0.7) ? styles.consistGood
    : daysOnTarget >= Math.ceil(daysWithData.length * 0.4) ? styles.consistMid
    : styles.consistBad

  // Best day: closest to target without exceeding
  const bestDay = daysWithData
    .filter(d => d.total_kalori <= d.target_kalori)
    .sort((a, b) => b.total_kalori - a.total_kalori)[0] ?? null

  // ─── Phase 3E: Build saran list with opts ────────────────────────────────
  const weightInsight: SaranItem | null = (() => {
    if (weightLogs.length >= 2 && user?.goal) {
      const latest = parseFloat(String(weightLogs[0].berat))
      const oldest = parseFloat(String(weightLogs[weightLogs.length - 1].berat))
      return getWeightInsight(latest - oldest, user.goal)
    }
    return null
  })()

  const saranList = getSaranList(avgKal, avgProtein, avgKarbo, avgLemak, target, user?.goal, {
    daysOnTarget,
    totalDays: daysWithData.length,
    ...(pattern ? { worstDay: pattern.worstDay, worstAvg: pattern.worstAvg } : {}),
  })

  // Remove pattern saran from saranList if we already have it (getSaranList appends it at the end)
  const fullSaranList: SaranItem[] = weightInsight ? [weightInsight, ...saranList] : saranList

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <h2 className={styles.title}>Ringkasan</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Phase 3C: trend badge */}
          {trendResult && (
            <span className={`${styles.trendBadge} ${
              trendResult === 'improving' ? styles.trendImproving
              : trendResult === 'worsening' ? styles.trendWorsening
              : styles.trendStable
            }`}>
              {trendResult === 'improving' ? '📉 Membaik' : trendResult === 'worsening' ? '📈 Meningkat' : '➡ Stabil'}
            </span>
          )}
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
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {/* Stat 1: rata-rata kkal + vs minggu lalu (Phase 3C) */}
        <div className={styles.statCard}>
          <div className={styles.statVal} style={{ color: 'var(--accent)' }}>{avgKal.toLocaleString('id-ID')}</div>
          {kalDeltaVsLastWeek !== null && Math.abs(kalDeltaVsLastWeek) > 30 ? (
            <div className={`${styles.statSub} ${kalDeltaVsLastWeek < 0 ? styles.statSubDown : styles.statSubUp}`}>
              {kalDeltaVsLastWeek < 0 ? `↓ ${Math.abs(kalDeltaVsLastWeek)}` : `↑ ${kalDeltaVsLastWeek}`} vs minggu lalu
            </div>
          ) : null}
          <div className={styles.statLbl}>Rata-rata kkal/hari</div>
        </div>

        {/* Stat 2: rata-rata protein */}
        <div className={styles.statCard}>
          <div className={styles.statVal} style={{ color: 'var(--teal)' }}>{avgProtein}g</div>
          <div className={styles.statLbl}>Rata-rata protein</div>
        </div>

        {/* Stat 3: konsistensi (Phase 3D) */}
        <div className={styles.statCard}>
          <div className={`${styles.statVal} ${consistColor}`}>{daysOnTarget}/{daysWithData.length}</div>
          <div className={styles.statLbl}>Hari on-target</div>
        </div>

        {/* Stat 4: net minggu ini (Phase 3A) */}
        <div className={styles.statCard}>
          <div className={`${styles.statVal} ${netIsDefisit ? styles.netDefisit : styles.netSurplus}`}>
            {netFormatted}
          </div>
          <div className={styles.statLbl}>{netIsDefisit ? 'defisit' : 'surplus'} mingguan</div>
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

        {/* Phase 3D: Best day chip */}
        {bestDay && (() => {
          const date = new Date(bestDay.tanggal + 'T00:00:00')
          const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
          const pct = Math.round((bestDay.total_kalori / bestDay.target_kalori) * 100)
          return (
            <div className={styles.bestDayChip}>
              🏆 Terbaik: {dayName} ({bestDay.total_kalori.toLocaleString('id-ID')} kkal · {pct}% target)
            </div>
          )
        })()}
      </div>

      {/* Bar chart — with ±kkal labels (Phase 3A) */}
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
              const dayLabel  = date.toLocaleDateString('id-ID', { weekday: 'short' })
              const dateLabel = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              const delta = d.jumlah_makan > 0 ? d.total_kalori - d.target_kalori : null
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
                  {/* Phase 3A: ±kkal delta — only for days <= 7 */}
                  {days <= 7 && delta !== null && (
                    <div className={`${styles.barDelta} ${delta <= 0 ? styles.barDeltaDefisit : styles.barDeltaSurplus}`}>
                      {delta <= 0 ? `−${Math.abs(delta)}` : `+${delta}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Macro trend chart */}
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
