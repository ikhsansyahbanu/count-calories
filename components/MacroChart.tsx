'use client'
import { DaySummary } from '@/lib/types'
import styles from './SummaryTab.module.css'

export type MacroTab = 'protein' | 'karbo' | 'lemak'

export const MACRO_CONFIG: Record<MacroTab, { label: string; color: string; unit: string; pct: number; kcalPerG: number }> = {
  protein: { label: 'Protein', color: 'var(--teal)',  unit: 'g', pct: 0.25, kcalPerG: 4 },
  karbo:   { label: 'Karbo',   color: 'var(--amber)', unit: 'g', pct: 0.50, kcalPerG: 4 },
  lemak:   { label: 'Lemak',   color: 'var(--red)',   unit: 'g', pct: 0.25, kcalPerG: 9 },
}

const MACRO_KEY: Record<MacroTab, keyof DaySummary> = {
  protein: 'total_protein',
  karbo:   'total_karbo',
  lemak:   'total_lemak',
}

interface Props {
  data: DaySummary[]
  daysWithData: DaySummary[]
  macroTab: MacroTab
  onMacroTabChange: (tab: MacroTab) => void
  target: number
  days: number
}

export default function MacroChart({ data, daysWithData, macroTab, onMacroTabChange, target, days }: Props) {
  const cfg = MACRO_CONFIG[macroTab]
  const key = MACRO_KEY[macroTab]
  const values = data.map(d => Number(d[key]) || 0)
  const macroTarget = Math.round((target * cfg.pct) / cfg.kcalPerG)
  const maxVal = Math.max(...values, macroTarget)
  const avg = daysWithData.length > 0
    ? Math.round(daysWithData.map(d => Number(d[key]) || 0).reduce((s, v) => s + v, 0) / daysWithData.length)
    : 0

  return (
    <div className={styles.chartCard}>
      <div className={styles.macroChartHeader}>
        <div className={styles.chartTitle} style={{ marginBottom: 0 }}>Tren Makronutrien</div>
        <div className={styles.macroTabGroup}>
          {(Object.keys(MACRO_CONFIG) as MacroTab[]).map(tab => (
            <button
              key={tab}
              className={`${styles.macroTabBtn} ${macroTab === tab ? styles.macroTabBtnActive : ''}`}
              style={macroTab === tab ? { background: MACRO_CONFIG[tab].color, borderColor: MACRO_CONFIG[tab].color } : {}}
              onClick={() => onMacroTabChange(tab)}
            >
              {MACRO_CONFIG[tab].label}
            </button>
          ))}
        </div>
      </div>

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
            const val = Number(d[key]) || 0
            const height = maxVal > 0 ? (val / maxVal) * 100 : 0
            const over = val > macroTarget
            const date = new Date(d.tanggal + 'T00:00:00')
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
    </div>
  )
}
