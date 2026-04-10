'use client'
import { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { getSaranList } from '@/lib/insights'
import { getBrowserTimezone } from '@/lib/tz'
import { getMacroTargets } from '@/lib/macros'
import { computeTDEE, estimateWeeklyWeightChange } from '@/lib/utils'
import styles from './DailyProgress.module.css'

interface TodayData {
  kalori_hari_ini: number
  protein: number
  karbo: number
  lemak: number
  jumlah_makan: number
  target_kalori: number
  streak: number
}

type Status = 'empty' | 'low' | 'normal' | 'warning' | 'over'

function getMealContext(): string {
  const h = new Date().getHours()
  if (h < 10) return 'sarapan'
  if (h < 14) return 'makan siang'
  if (h < 18) return 'camilan sore'
  return 'makan malam'
}

interface WeekInsight {
  type: 'warning' | 'danger' | 'good'
  text: string
}

const GOAL_BADGE: Record<string, string> = {
  cutting: '✂️ Cutting',
  bulking: '💪 Bulking',
}

export default function DailyProgress({ user, refreshKey, onStartLog, onGoToSummary }: { user: User | null; refreshKey?: number; onStartLog?: () => void; onGoToSummary?: () => void }) {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(false)
  const [weekInsight, setWeekInsight] = useState<WeekInsight | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setData(null)
      return
    }
    setLoading(true)
    fetch(`/api/today?_r=${refreshKey ?? 0}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id, refreshKey])

  useEffect(() => {
    if (!user?.id) return
    const tz = getBrowserTimezone()
    fetch(`/api/summary?days=7&tz=${encodeURIComponent(tz)}&_r=${refreshKey ?? 0}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) return
        const days = json.data.filter((d: { jumlah_makan: number }) => d.jumlah_makan > 0)
        if (days.length === 0) return
        const t = json.data[json.data.length - 1]?.target_kalori || user.target_kalori || 2000
        const avgKal     = Math.round(days.reduce((s: number, d: { total_kalori: number }) => s + d.total_kalori, 0) / days.length)
        const avgProtein = Math.round(days.reduce((s: number, d: { total_protein: number }) => s + Number(d.total_protein), 0) / days.length)
        const avgKarbo   = Math.round(days.reduce((s: number, d: { total_karbo: number }) => s + Number(d.total_karbo), 0) / days.length)
        const avgLemak   = Math.round(days.reduce((s: number, d: { total_lemak: number }) => s + Number(d.total_lemak), 0) / days.length)
        const top = getSaranList(avgKal, avgProtein, avgKarbo, avgLemak, t, user.goal)[0]
        if (top) setWeekInsight(top)
      })
      .catch(() => {})
  }, [user?.id, refreshKey])

  if (!user) return null

  const target = data?.target_kalori || user.target_kalori || 2000
  const kalori = data?.kalori_hari_ini ?? 0
  const pct = Math.round((kalori / target) * 100)

  let status: Status = 'empty'
  if (kalori > 0) {
    if (pct < 50) status = 'low'
    else if (pct < 80) status = 'normal'
    else if (pct <= 100) status = 'warning'
    else status = 'over'
  }

  const sisa = target - kalori
  const lebih = kalori - target
  const mealCtx = getMealContext()
  const isCutting = user.goal === 'cutting'

  const statusConfig: Record<Status, { msg: string; msgClass: string; fillClass: string }> = {
    empty: { msg: '', msgClass: '', fillClass: styles.progressFillBlue },
    low: {
      msg: `Masih ada ${sisa.toLocaleString('id-ID')} kkal — pas untuk ${mealCtx} sehat`,
      msgClass: styles.statusBlue,
      fillClass: styles.progressFillBlue,
    },
    normal: {
      msg: isCutting
        ? `On track cutting! Sisa ${sisa.toLocaleString('id-ID')} kkal`
        : `On track! Sisa ${sisa.toLocaleString('id-ID')} kkal untuk ${mealCtx}`,
      msgClass: styles.statusGreen,
      fillClass: styles.progressFillGreen,
    },
    warning: {
      msg: isCutting
        ? `Hampir limit cutting — pilih protein tanpa lemak`
        : `Hampir limit — pilih ${mealCtx} ringan (buah, sup, atau salad)`,
      msgClass: styles.statusAmber,
      fillClass: styles.progressFillAmber,
    },
    over: {
      msg: `Melebihi ${lebih.toLocaleString('id-ID')} kkal — cukup air putih & istirahat`,
      msgClass: styles.statusRed,
      fillClass: styles.progressFillRed,
    },
  }

  const { msg, msgClass, fillClass } = statusConfig[status]

  const streak = data?.streak ?? 0
  const showStreak = streak >= 1

  // Macro targets based on goal
  const { proteinG: proteinTarget, lemakG: lemakTarget } = getMacroTargets(target, user.goal)
  const protein = data?.protein ?? 0
  const lemak = data?.lemak ?? 0

  let macroHint: string | null = null
  if (data && data.jumlah_makan > 0) {
    if (protein < proteinTarget * 0.5) macroHint = `Protein baru ${protein}g — tambah telur, tahu, atau tempe`
    else if (lemak > lemakTarget * 1.3) macroHint = `Lemak ${lemak}g sudah tinggi — hindari gorengan berikutnya`
  }

  // TDEE / target section for Phase 4G
  const computedTDEE = computeTDEE(user)
  const showTargetSection = !!(user.goal && computedTDEE)
  const weeklyChange = showTargetSection && isCutting
    ? estimateWeeklyWeightChange(computedTDEE!, target)
    : null

  const goalLabel = user.goal === 'cutting' ? 'Cutting' : user.goal === 'bulking' ? 'Bulking' : 'Maintain'

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          Hari ini{data && data.jumlah_makan > 0 ? ` · ${data.jumlah_makan}x makan` : ''}
        </span>
        <div className={styles.cardHeaderRight}>
          {user.goal && user.goal !== 'maintain' && (
            <span className={styles.goalBadge}>
              {GOAL_BADGE[user.goal]}
            </span>
          )}
          {status !== 'empty' && (
            <span className={`${styles.statusBadge} ${styles[`badge_${status}`]}`}>
              {status === 'over' ? '✕ Over' : status === 'warning' ? '⚠ Hampir' : '✓ On Track'}
            </span>
          )}
          {showStreak && (
            <span className={`${styles.streak} ${streak === 1 ? styles.streakFirst : ''}`}>
              {streak === 1 ? '🌱 Hari pertama!' : `🔥 ${streak} hari`}
            </span>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className={styles.skeleton} style={{ height: 60, borderRadius: 10 }} />
      ) : status === 'empty' ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🍽️</span>
          <span>Belum ada catatan hari ini</span>
          {onStartLog ? (
            <button className={styles.emptyCtaBtn} onClick={onStartLog}>
              📷 Foto Makanan Sekarang
            </button>
          ) : (
            <span className={styles.emptyHint}>Foto makananmu untuk mulai</span>
          )}
        </div>
      ) : (
        <>
          <div className={styles.heroRow}>
            <div>
              <div className={styles.heroNumber} style={{
                color: status === 'over' ? 'var(--red)' : status === 'warning' ? 'var(--amber)' : 'var(--accent)'
              }}>
                {status === 'over'
                  ? `+${lebih.toLocaleString('id-ID')}`
                  : sisa.toLocaleString('id-ID')}
              </div>
              <div className={styles.heroLabel}>
                {status === 'over' ? 'kkal melebihi target' : 'kkal tersisa hari ini'}
              </div>
            </div>
            <div className={styles.heroSub}>
              <span className={styles.kalConsumed}>{kalori.toLocaleString('id-ID')}</span>
              <span className={styles.kalUnit}> / {target.toLocaleString('id-ID')} kkal</span>
            </div>
          </div>

          {showTargetSection && (
            <div className={styles.targetSection}>
              <div className={styles.targetMain}>🎯 Target: {target.toLocaleString('id-ID')} kkal ({goalLabel})</div>
              <div className={styles.targetSub}>
                Berdasarkan kebutuhan harianmu (TDEE {computedTDEE!.toLocaleString('id-ID')}
                {user.goal === 'cutting' ? ' − 500' : user.goal === 'bulking' ? ' + 300' : ''})
              </div>
              {weeklyChange !== null && weeklyChange > 0 && (
                <div className={styles.targetEst}>≈ Turun {weeklyChange} kg/minggu</div>
              )}
            </div>
          )}

          <div className={styles.progressWrap}>
            <span className={styles.progressPct}>{pct}%</span>
            <div className={styles.progressBg}>
              <div
                className={`${styles.progressFill} ${fillClass}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>

          {msg && <div className={`${styles.statusMsg} ${msgClass}`}>{msg}</div>}

          <div className={styles.macros}>
            <div className={styles.macroPill}>
              <div className={`${styles.macroVal} ${styles.protein}`}>{data?.protein ?? 0}g</div>
              <div className={styles.macroLbl}>Protein</div>
            </div>
            <div className={styles.macroPill}>
              <div className={`${styles.macroVal} ${styles.karbo}`}>{data?.karbo ?? 0}g</div>
              <div className={styles.macroLbl}>Karbo</div>
            </div>
            <div className={styles.macroPill}>
              <div className={`${styles.macroVal} ${styles.lemak}`}>{data?.lemak ?? 0}g</div>
              <div className={styles.macroLbl}>Lemak</div>
            </div>
          </div>

          {macroHint && (
            <div className={styles.macroHint}>💡 {macroHint}</div>
          )}

          {weekInsight && (
            onGoToSummary ? (
              <button
                className={`${styles.weekInsightChip} ${styles[`weekInsight_${weekInsight.type}`]}`}
                onClick={onGoToSummary}
              >
                <span>📊 {weekInsight.text}</span>
                <span className={styles.weekInsightArrow}>→</span>
              </button>
            ) : (
              <div className={`${styles.weekInsightChip} ${styles[`weekInsight_${weekInsight.type}`]}`}>
                📊 {weekInsight.text}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
