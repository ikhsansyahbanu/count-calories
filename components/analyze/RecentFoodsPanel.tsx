'use client'
import { useState, useEffect } from 'react'
import styles from '../AnalyzeTab.module.css'

interface RecentLog {
  id: number
  nama: string
  porsi: string
  total_kalori: number
  protein_g: number
  karbo_g: number
  lemak_g: number
  keterangan: string
  created_at: string
}

interface Props {
  userId?: number
  keterangan: string
  target: number
  onAnalyzed?: () => void
  refreshKey?: number
}

export default function RecentFoodsPanel({ userId, keterangan, target, onAnalyzed, refreshKey }: Props) {
  const [recents, setRecents] = useState<RecentLog[]>([])
  const [reloggingId, setReloggingId] = useState<number | null>(null)
  const [loggedIds, setLoggedIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    fetch('/api/recent')
      .then(r => r.json())
      .then(json => { if (json.success) setRecents(json.data) })
      .catch(() => {})
  }, [userId, refreshKey])

  if (recents.length === 0) return null

  async function relog(log: RecentLog) {
    if (reloggingId != null) return
    setReloggingId(log.id)
    // Optimistic: trigger refresh immediately
    onAnalyzed?.()
    try {
      const res = await fetch('/api/recent/relog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: log.id, keterangan, target_kalori: target }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Gagal log ulang.')
        // Rollback: trigger refresh lagi untuk sync data aktual
        onAnalyzed?.()
      } else {
        setLoggedIds(prev => new Set(prev).add(log.id))
        setTimeout(() => setLoggedIds(prev => { const s = new Set(prev); s.delete(log.id); return s }), 1500)
      }
    } catch {
      setError('Gagal log ulang.')
      onAnalyzed?.()
    } finally {
      setReloggingId(null)
    }
  }

  return (
    <div className={styles.recentSection}>
      <div className={styles.recentLabel}>⏱ Terakhir dicatat</div>
      <div className={styles.recentChips}>
        {recents.map(log => {
          const isLogging = reloggingId === log.id
          const isLogged = loggedIds.has(log.id)
          return (
            <button
              key={log.id}
              className={`${styles.recentChip} ${isLogged ? styles.recentChipLogged : ''}`}
              onClick={() => relog(log)}
              disabled={reloggingId != null}
              type="button"
            >
              <span className={styles.recentChipName}>{log.nama}</span>
              <span className={styles.recentChipKkal}>
                {isLogging ? '...' : isLogged ? '✓' : `${log.total_kalori} kkal`}
              </span>
            </button>
          )
        })}
      </div>
      {error && <div className={styles.recentError}>{error}</div>}
    </div>
  )
}
