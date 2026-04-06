'use client'
import { useState, useEffect, useCallback } from 'react'
import { FoodLog, User } from '@/lib/types'
import LogDetail from './LogDetail'
import styles from './HistoryTab.module.css'

interface DayGroup {
  label: string
  rows: FoodLog[]
  total: number
  target: number
}

export default function HistoryTab({ user }: { user: User | null }) {
  const [groups, setGroups] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedLog, setSelectedLog] = useState<FoodLog | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleteNama, setConfirmDeleteNama] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userParam = user?.id ? `&user_id=${user.id}` : ''
      const res = await fetch(`/api/history?limit=200${userParam}`)
      const json = await res.json()
      if (!json.success) throw new Error()

      const map: Record<string, DayGroup> = {}
      json.data.forEach((row: FoodLog) => {
        const d = new Date(row.created_at)
        const key = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        if (!map[key]) map[key] = { label: key, rows: [], total: 0, target: row.target_kalori }
        map[key].rows.push(row)
        map[key].total += row.total_kalori
      })
      setGroups(Object.values(map))
    } catch {
      setError('Gagal memuat riwayat makan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteLog(id: number) {
    await fetch(`/api/history?id=${id}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    load()
  }

  function startEdit(row: FoodLog) {
    setEditingId(row.id)
    setEditValue(row.nama)
  }

  async function saveEdit(id: number) {
    if (!editValue.trim()) return
    await fetch('/api/history', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nama: editValue.trim() })
    })
    setEditingId(null)
    load()
  }

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p>Memuat riwayat...</p>
    </div>
  )

  if (error) return <div className={styles.errorBox}>{error}</div>

  if (groups.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>🍽️</div>
      <p>Belum ada riwayat makan</p>
      <span>Analisis foto makanan pertamamu!</span>
    </div>
  )

  return (
    <div className={styles.wrap}>
      {selectedLog && <LogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {confirmDeleteId && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmIcon}>🗑️</div>
            <div className={styles.confirmTitle}>Hapus item ini?</div>
            <div className={styles.confirmNama}>{confirmDeleteNama}</div>
            <div className={styles.confirmDesc}>Data yang dihapus tidak bisa dikembalikan.</div>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmCancel} onClick={() => setConfirmDeleteId(null)}>Batal</button>
              <button className={styles.confirmDelete} onClick={() => deleteLog(confirmDeleteId)}>Hapus</button>
            </div>
          </div>
        </div>
      }}

      <div className={styles.topBar}>
        <h2 className={styles.title}>Riwayat Makan</h2>
        <button className={styles.refreshBtn} onClick={load}>Refresh</button>
      </div>

      {groups.map(group => {
        const pct = Math.round((group.total / group.target) * 100)
        const over = pct > 100
        return (
          <div key={group.label} className={styles.dayGroup}>
            <div className={styles.dayHeader}>
              <div>
                <div className={styles.dayDate}>{group.label}</div>
                <div className={styles.dayMeta}>{group.rows.length} kali makan · target {group.target} kkal</div>
              </div>
              <div className={styles.dayTotal} style={{ color: over ? 'var(--red)' : 'var(--accent)' }}>
                {group.total} kkal
                <div className={styles.dayPct}>{pct}%</div>
              </div>
            </div>

            <div className={styles.dayBar}>
              <div
                className={styles.dayBarFill}
                style={{ width: `${Math.min(pct, 100)}%`, background: over ? 'var(--red)' : 'var(--accent)' }}
              />
            </div>

            {group.rows.map(row => {
              const items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
              const time = new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={row.id} className={styles.logItem} onClick={() => editingId !== row.id && setSelectedLog(row)}>
                  <div className={styles.logLeft}>
                    {editingId === row.id ? (
                      <div className={styles.editRow}>
                        <input
                          className={styles.editInput}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(row.id); if (e.key === 'Escape') setEditingId(null) }}
                          autoFocus
                        />
                        <button className={styles.editSaveBtn} onClick={() => saveEdit(row.id)}>Simpan</button>
                        <button className={styles.editCancelBtn} onClick={() => setEditingId(null)}>Batal</button>
                      </div>
                    ) : (
                      <div className={styles.logName}>
                        {row.keterangan && <span className={styles.logKet}>{row.keterangan}</span>}
                        {row.nama}
                        <button className={styles.editBtn} onClick={() => startEdit(row)} title="Edit nama">✏️</button>
                      </div>
                    )}
                    <div className={styles.logMeta}>
                      {row.porsi} · {time}
                      {items.length > 0 && ` · ${items.length} item`}
                    </div>
                    <div className={styles.logMacros}>
                      <span style={{ color: 'var(--teal)' }}>P {row.protein_g}g</span>
                      <span style={{ color: 'var(--amber)' }}>K {row.karbo_g}g</span>
                      <span style={{ color: 'var(--red)' }}>L {row.lemak_g}g</span>
                    </div>
                  </div>
                  <div className={styles.logRight}>
                    <div className={styles.logKal}>{row.total_kalori}</div>
                    <div className={styles.logKalUnit}>kkal</div>
                    <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); setConfirmDeleteId(row.id); setConfirmDeleteNama(row.nama) }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
