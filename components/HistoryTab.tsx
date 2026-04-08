'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FoodLog, User } from '@/lib/types'
import { parseItems } from '@/lib/utils'
import LogDetail from './LogDetail'
import styles from './HistoryTab.module.css'

interface DayGroup {
  label: string
  rows: FoodLog[]
  total: number
  target: number
}

type FilterOption = 'Semua' | 'Makan Pagi' | 'Makan Siang' | 'Makan Malam' | 'Snack' | 'Manual'

const PAGE_SIZE = 20
const filterOptions: FilterOption[] = ['Semua', 'Makan Pagi', 'Makan Siang', 'Makan Malam', 'Snack', 'Manual']

export default function HistoryTab({ user, refreshKey }: { user: User | null; refreshKey?: number }) {
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedLog, setSelectedLog] = useState<FoodLog | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleteNama, setConfirmDeleteNama] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Semua')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input → searchQuery
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
      setPage(1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  // Reset page when filter changes
  useEffect(() => { setPage(1) }, [activeFilter])

  // Reset semua state saat user berganti
  useEffect(() => {
    setSearchInput('')
    setSearchQuery('')
    setActiveFilter('Semua')
    setPage(1)
  }, [user?.id])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (searchQuery) params.set('search', searchQuery)
      if (activeFilter !== 'Semua') params.set('keterangan', activeFilter)

      const res = await fetch(`/api/history?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal memuat riwayat')
      setLogs(json.data)
      setTotal(json.pagination.total)
      setTotalPages(json.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat makan')
    } finally {
      setLoading(false)
    }
  }, [user?.id, page, searchQuery, activeFilter])

  useEffect(() => { load() }, [load, refreshKey])

  async function deleteLog(id: number) {
    const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    if (!res.ok) {
      setError('Gagal menghapus log. Coba lagi.')
      return
    }
    await load()
  }

  function startEdit(row: FoodLog) {
    setEditingId(row.id)
    setEditValue(row.nama)
  }

  async function saveEdit(id: number) {
    if (!editValue.trim()) return
    const res = await fetch('/api/history', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nama: editValue.trim() }),
    })
    setEditingId(null)
    if (!res.ok) {
      setError('Gagal menyimpan perubahan. Coba lagi.')
    }
    load()
  }

  // Group logs yang sudah di-fetch by day (pakai timezone Asia/Jakarta agar konsisten dengan server)
  const groups = useMemo<DayGroup[]>(() => {
    const map: Record<string, DayGroup> = {}
    logs.forEach(row => {
      const key = new Date(row.created_at).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
      if (!map[key]) map[key] = { label: key, rows: [], total: 0, target: row.target_kalori }
      map[key].rows.push(row)
      map[key].total += row.total_kalori
    })
    return Object.values(map)
  }, [logs])

  const isFiltering = searchQuery !== '' || activeFilter !== 'Semua'

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p>Memuat riwayat...</p>
    </div>
  )

  if (error) return <div className={styles.errorBox}>{error}</div>

  if (!loading && total === 0 && !isFiltering) return (
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
      )}

      <div className={styles.topBar}>
        <h2 className={styles.title}>Riwayat Makan</h2>
        <button className={styles.refreshBtn} onClick={load}>Refresh</button>
      </div>

      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Cari nama makanan..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button className={styles.searchClear} onClick={() => setSearchInput('')}>✕</button>
        )}
      </div>

      <div className={styles.filterRow}>
        {filterOptions.map(f => (
          <button
            key={f}
            type="button"
            className={`${styles.filterChip} ${activeFilter === f ? styles.filterChipActive : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {isFiltering && (
        <div className={styles.resultCount}>
          {total === 0 ? 'Tidak ada hasil' : `${total} hasil`}
        </div>
      )}

      {isFiltering && groups.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>Tidak ada hasil untuk pencarian ini</p>
          <span>Coba kata kunci lain atau ubah filter</span>
        </div>
      )}

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
              const items = parseItems(row.items)
              const time = new Date(row.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
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
                        {row.manual && <span className={styles.logManualBadge}>Manual</span>}
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
                    <button
                      className={styles.deleteBtn}
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(row.id); setConfirmDeleteNama(row.nama) }}
                    >✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >← Sebelumnya</button>
          <span className={styles.pageInfo}>{page} / {totalPages} ({total} data)</span>
          <button
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >Berikutnya →</button>
        </div>
      )}
    </div>
  )
}
