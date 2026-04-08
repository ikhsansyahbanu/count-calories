'use client'
import { useState, useEffect } from 'react'
import { User } from '@/lib/types'
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

export default function DailyProgress({ user, refreshKey }: { user: User | null; refreshKey?: number }) {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setData(null)
      return
    }
    setLoading(true)
    fetch(`/api/today`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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

  const statusConfig: Record<Status, { msg: string; msgClass: string; fillClass: string }> = {
    empty: { msg: '', msgClass: '', fillClass: styles.progressFillBlue },
    low: {
      msg: `Masih ada ${sisa.toLocaleString('id-ID')} kkal — pas untuk ${mealCtx} sehat`,
      msgClass: styles.statusBlue,
      fillClass: styles.progressFillBlue,
    },
    normal: {
      msg: `On track! Sisa ${sisa.toLocaleString('id-ID')} kkal untuk ${mealCtx}`,
      msgClass: styles.statusGreen,
      fillClass: styles.progressFillGreen,
    },
    warning: {
      msg: `Hampir limit — pilih ${mealCtx} ringan (buah, sup, atau salad)`,
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

  // Macro insight: which macro needs attention?
  const proteinTarget = Math.round((target * 0.25) / 4)
  const lemakTarget = Math.round((target * 0.25) / 9)
  const protein = data?.protein ?? 0
  const lemak = data?.lemak ?? 0

  let macroHint: string | null = null
  if (data && data.jumlah_makan > 0) {
    if (protein < proteinTarget * 0.5) macroHint = `Protein baru ${protein}g — tambah telur, tahu, atau tempe`
    else if (lemak > lemakTarget * 1.3) macroHint = `Lemak ${lemak}g sudah tinggi — hindari gorengan berikutnya`
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          Hari ini{data && data.jumlah_makan > 0 ? ` · ${data.jumlah_makan}x makan` : ''}
        </span>
        {showStreak && (
          <span className={`${styles.streak} ${streak === 1 ? styles.streakFirst : ''}`}>
            {streak === 1 ? '🌱 Hari pertama!' : `🔥 ${streak} hari`}
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className={styles.skeleton} style={{ height: 60, borderRadius: 10 }} />
      ) : status === 'empty' ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🍽️</span>
          <span>Belum ada catatan hari ini</span>
          <span className={styles.emptyHint}>Foto makananmu untuk mulai</span>
        </div>
      ) : (
        <>
          <div className={styles.kalRow}>
            <span className={styles.kalBig}>{kalori.toLocaleString('id-ID')}</span>
            <span className={styles.kalUnit}>kkal</span>
            <span className={styles.kalSep}>dari</span>
            <span className={styles.kalTarget}>{target.toLocaleString('id-ID')}</span>
            <span className={styles.kalUnit}>target</span>
          </div>

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
        </>
      )}
    </div>
  )
}
