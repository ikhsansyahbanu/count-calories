'use client'
import { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { getBrowserTimezone } from '@/lib/tz'
import styles from './HeadlineInsight.module.css'

interface Headline {
  icon: string
  text: string
  type: 'good' | 'warn' | 'info'
}

export default function HeadlineInsight({ user, refreshKey, onStartLog }: { user: User | null; refreshKey?: number; onStartLog?: () => void }) {
  const [headline, setHeadline] = useState<Headline | null>(null)
  const [loading, setLoading] = useState(false)
  const [noData, setNoData] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setNoData(false)
    const tz = getBrowserTimezone()
    fetch(`/api/summary?days=7&tz=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) return
        const data: Array<{ jumlah_makan: number; total_kalori: number; total_protein: number; target_kalori: number }> = json.data
        const daysWithData = data.filter(d => d.jumlah_makan > 0)
        if (daysWithData.length === 0) { setNoData(true); return }

        const target = data[data.length - 1]?.target_kalori || user.target_kalori || 2000
        const avgKal = Math.round(daysWithData.reduce((s, d) => s + d.total_kalori, 0) / daysWithData.length)
        const avgProtein = Math.round(daysWithData.reduce((s, d) => s + Number(d.total_protein), 0) / daysWithData.length)
        const daysOnTarget = daysWithData.filter(d => d.total_kalori <= target * 1.05).length
        const kalPct = Math.round((avgKal / target) * 100)
        const proteinTarget = Math.round((target * 0.25) / 4)

        let h: Headline
        if (kalPct > 120) {
          h = { icon: '⚠️', text: `Rata-rata ${kalPct}% dari target minggu ini — kurangi 1 porsi nasi atau gorengan`, type: 'warn' }
        } else if (daysOnTarget >= 5) {
          h = { icon: '🎯', text: `${daysOnTarget}/7 hari dalam target minggu ini — luar biasa!`, type: 'good' }
        } else if (daysWithData.length >= 5 && kalPct <= 110) {
          h = { icon: '✅', text: `Konsisten mencatat ${daysWithData.length} hari minggu ini — pertahankan!`, type: 'good' }
        } else if (avgProtein < proteinTarget * 0.7) {
          h = { icon: '💡', text: `Protein rata-rata ${avgProtein}g/hari — coba tambah telur atau tahu setiap makan`, type: 'warn' }
        } else if (daysWithData.length < 3) {
          h = { icon: '📝', text: `Baru ${daysWithData.length} hari tercatat minggu ini — semakin rutin, semakin akurat`, type: 'info' }
        } else {
          h = { icon: '📊', text: `Rata-rata ${avgKal.toLocaleString('id-ID')} kkal/hari dari target ${target.toLocaleString('id-ID')} kkal`, type: 'info' }
        }
        setHeadline(h)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id, refreshKey])

  if (!user) return null

  if (loading) return <div className={styles.skeleton} />

  if (noData) {
    const content = (
      <>
        <span className={styles.icon}>📸</span>
        <span className={styles.text}>Belum ada data minggu ini — foto makanan pertamamu untuk mulai</span>
      </>
    )
    return onStartLog
      ? <button className={`${styles.wrap} ${styles.info} ${styles.clickable}`} onClick={onStartLog}>{content}</button>
      : <div className={`${styles.wrap} ${styles.info}`}>{content}</div>
  }

  if (!headline) return null

  return (
    <div className={`${styles.wrap} ${styles[headline.type]}`}>
      <span className={styles.icon}>{headline.icon}</span>
      <span className={styles.text}>{headline.text}</span>
    </div>
  )
}
