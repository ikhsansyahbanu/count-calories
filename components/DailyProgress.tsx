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

export default function DailyProgress({ user, refreshKey }: { user: User | null; refreshKey?: number }) {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setData(null)
      return
    }
    setLoading(true)
    fetch(`/api/today?user_id=${user.id}`)
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

  const statusConfig: Record<Status, { msg: string; msgClass: string; fillClass: string }> = {
    empty: { msg: '', msgClass: '', fillClass: styles.progressFillBlue },
    low: {
      msg: `Kamu masih punya ruang ${sisa.toLocaleString('id-ID')} kkal lagi`,
      msgClass: styles.statusBlue,
      fillClass: styles.progressFillBlue,
    },
    normal: {
      msg: `Kamu sudah makan ${kalori.toLocaleString('id-ID')} kkal, sisa ${sisa.toLocaleString('id-ID')} kkal`,
      msgClass: styles.statusGreen,
      fillClass: styles.progressFillGreen,
    },
    warning: {
      msg: `Hampir mencapai target, sisa ${sisa.toLocaleString('id-ID')} kkal`,
      msgClass: styles.statusAmber,
      fillClass: styles.progressFillAmber,
    },
    over: {
      msg: `Melebihi target sebesar ${lebih.toLocaleString('id-ID')} kkal`,
      msgClass: styles.statusRed,
      fillClass: styles.progressFillRed,
    },
  }

  const { msg, msgClass, fillClass } = statusConfig[status]

  const streak = data?.streak ?? 0
  const showStreak = streak >= 1

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          Hari ini{data && data.jumlah_makan > 0 ? ` · ${data.jumlah_makan} kali makan` : ''}
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
        <div className={styles.empty}>Belum ada catatan hari ini</div>
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
        </>
      )}
    </div>
  )
}
