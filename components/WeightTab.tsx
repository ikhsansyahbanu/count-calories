'use client'
import { useState, useEffect, useCallback } from 'react'
import { User } from '@/lib/types'
import { getBrowserTimezone } from '@/lib/tz'
import styles from './WeightTab.module.css'

const TZ = getBrowserTimezone()

interface WeightLog {
  id: number
  berat: number
  catatan: string
  created_at: string
}

export default function WeightTab({ user }: { user: User | null }) {
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [berat, setBerat] = useState('')
  const [catatan, setCatatan] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/weight`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.success) setLogs(json.data)
      else throw new Error(json.error || 'Gagal memuat data berat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data berat')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!berat || !user?.id) return
    const val = parseFloat(berat)
    if (isNaN(val) || val < 20 || val > 300) return
    setSaving(true)
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ berat: val, catatan })
      })
      const json = await res.json()
      if (json.success) {
        setLogs(prev => [json.data, ...prev])
        setBerat('')
        setCatatan('')
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteLog(id: number) {
    const prev = logs
    setLogs(l => l.filter(x => x.id !== id))
    setDeleteId(null)
    const res = await fetch(`/api/weight?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setLogs(prev)
      setError('Gagal menghapus data. Coba lagi.')
    }
  }

  if (!user) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>⚖️</div>
      <p>Pilih profil dulu</p>
    </div>
  )

  // Chart data — take the 30 most recent entries and reverse into chronological order
  const chartData = [...logs].slice(0, 30).reverse()
  const weights = chartData.map(l => parseFloat(String(l.berat)))
  const minW = weights.length > 0 ? Math.min(...weights) - 2 : 50
  const maxW = weights.length > 0 ? Math.max(...weights) + 2 : 80

  // Stats
  const latest = logs[0] ? parseFloat(String(logs[0].berat)) : null
  const prev = logs[1] ? parseFloat(String(logs[1].berat)) : null
  const diff = latest !== null && prev !== null ? (latest - prev).toFixed(1) : null
  const bmi = latest && user.tinggi_badan
    ? (latest / Math.pow(user.tinggi_badan / 100, 2)).toFixed(1)
    : null
  const first = logs.length > 1 ? parseFloat(String(logs[logs.length - 1].berat)) : null
  const totalChange = latest !== null && first !== null ? (latest - first).toFixed(1) : null

  return (
    <div className={styles.wrap}>
      {error && <div className={styles.errorBox} onClick={() => setError(null)}>{error}</div>}
      {/* Input form */}
      <div className={styles.inputCard}>
        <div className={styles.inputTitle}>Catat Berat Badan</div>
        <div className={styles.inputRow}>
          <div className={styles.beratWrap}>
            <input
              type="number"
              className={styles.beratInput}
              placeholder="0.0"
              value={berat}
              onChange={e => setBerat(e.target.value)}
              min={20} max={300} step={0.1}
              onKeyDown={e => e.key === 'Enter' && save()}
            />
            <span className={styles.beratUnit}>kg</span>
          </div>
          <button className={styles.saveBtn} onClick={save} disabled={!berat || saving}>
            {saving ? '...' : 'Simpan'}
          </button>
        </div>
        <input
          type="text"
          className={styles.catatanInput}
          placeholder="Catatan (opsional)"
          value={catatan}
          onChange={e => setCatatan(e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Stats row */}
      {latest !== null && (
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <div className={styles.statVal}>{latest} <span className={styles.statUnit}>kg</span></div>
            <div className={styles.statLbl}>Berat Sekarang</div>
          </div>
          {bmi && (
            <div className={styles.statBox}>
              <div className={styles.statVal}>{bmi}</div>
              <div className={styles.statLbl}>BMI</div>
            </div>
          )}
          {diff !== null && (
            <div className={styles.statBox}>
              <div className={styles.statVal} style={{ color: parseFloat(diff) < 0 ? 'var(--accent)' : parseFloat(diff) > 0 ? 'var(--red)' : 'var(--muted)' }}>
                {parseFloat(diff) > 0 ? '+' : ''}{diff} <span className={styles.statUnit}>kg</span>
              </div>
              <div className={styles.statLbl}>vs kemarin</div>
            </div>
          )}
          {totalChange !== null && logs.length > 1 && (
            <div className={styles.statBox}>
              <div className={styles.statVal} style={{ color: parseFloat(totalChange) < 0 ? 'var(--accent)' : parseFloat(totalChange) > 0 ? 'var(--red)' : 'var(--muted)' }}>
                {parseFloat(totalChange) > 0 ? '+' : ''}{totalChange} <span className={styles.statUnit}>kg</span>
              </div>
              <div className={styles.statLbl}>Total perubahan</div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Tren Berat Badan</div>
          <div className={styles.chart}>
            {chartData.map((log, i) => {
              const w = parseFloat(String(log.berat))
              const heightPct = ((w - minW) / (maxW - minW)) * 80 + 10
              const date = new Date(log.created_at)
              const label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              const isLatest = i === chartData.length - 1
              return (
                <div key={log.id} className={styles.barCol}>
                  <div className={styles.barValLabel}>{isLatest ? `${w}` : ''}</div>
                  <div className={styles.barArea}>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${heightPct}%`,
                        background: isLatest ? 'var(--accent)' : 'var(--accent-border)',
                      }}
                    />
                  </div>
                  {(i === 0 || i === Math.floor(chartData.length / 2) || isLatest) && (
                    <div className={styles.barLabel}>{label}</div>
                  )}
                  {!(i === 0 || i === Math.floor(chartData.length / 2) || isLatest) && (
                    <div className={styles.barLabel}></div>
                  )}
                </div>
              )
            })}
          </div>
          <div className={styles.chartHint}>
            Min {Math.min(...weights).toFixed(1)} kg · Max {Math.max(...weights).toFixed(1)} kg
          </div>
        </div>
      )}

      {/* Log list */}
      {loading ? (
        <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
      ) : logs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚖️</div>
          <p>Belum ada catatan berat badan</p>
          <span>Catat berat badanmu setiap hari untuk melihat tren</span>
        </div>
      ) : (
        <div className={styles.logList}>
          <div className={styles.logListTitle}>Riwayat ({logs.length} catatan)</div>
          {logs.map((log, i) => {
            const w = parseFloat(String(log.berat))
            const prevW = logs[i + 1] ? parseFloat(String(logs[i + 1].berat)) : null
            const d = prevW !== null ? w - prevW : null
            const date = new Date(log.created_at)
            return (
              <div key={log.id} className={styles.logItem}>
                <div className={styles.logLeft}>
                  <div className={styles.logDate}>
                    {date.toLocaleDateString('id-ID', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    &nbsp;·&nbsp;
                    {date.toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {log.catatan && <div className={styles.logCatatan}>{log.catatan}</div>}
                </div>
                <div className={styles.logRight}>
                  <div className={styles.logBerat}>{w} <span>kg</span></div>
                  {d !== null && (
                    <div className={styles.logDiff} style={{ color: d < 0 ? 'var(--accent)' : d > 0 ? 'var(--red)' : 'var(--muted)' }}>
                      {d > 0 ? '+' : ''}{d.toFixed(1)}
                    </div>
                  )}
                  <button className={styles.deleteBtn} onClick={() => setDeleteId(log.id)}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className={styles.overlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmIcon}>🗑️</div>
            <div className={styles.confirmTitle}>Hapus catatan ini?</div>
            <div className={styles.confirmBtns}>
              <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>Batal</button>
              <button className={styles.deleteConfirmBtn} onClick={() => deleteLog(deleteId)}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
