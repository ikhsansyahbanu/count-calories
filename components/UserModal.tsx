'use client'
import { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import styles from './UserModal.module.css'

interface Props {
  onSelect: (user: User) => void
  currentUser: User | null
  onClose?: () => void
}

export default function UserModal({ onSelect, currentUser, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nama: '', berat_badan: '', tinggi_badan: '', target_kalori: '2000' })
  const [editUser, setEditUser] = useState<User | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    const json = await res.json()
    if (json.success) setUsers(json.data)
    setLoading(false)
  }

  async function createUser() {
    if (!form.nama.trim()) return
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: form.nama.trim(),
        berat_badan: parseFloat(form.berat_badan) || 0,
        tinggi_badan: parseFloat(form.tinggi_badan) || 0,
        target_kalori: parseInt(form.target_kalori) || 2000
      })
    })
    const json = await res.json()
    if (json.success) {
      onSelect(json.data)
      onClose?.()
    }
  }

  async function saveEdit() {
    if (!editUser || !form.nama.trim()) return
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editUser.id,
        nama: form.nama.trim(),
        berat_badan: parseFloat(form.berat_badan) || 0,
        tinggi_badan: parseFloat(form.tinggi_badan) || 0,
        target_kalori: parseInt(form.target_kalori) || 2000
      })
    })
    const json = await res.json()
    if (json.success) {
      if (currentUser?.id === editUser.id) onSelect(json.data)
      setMode('list')
      loadUsers()
    }
  }

  async function deleteUser(id: number) {
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    if (currentUser?.id === id) onSelect(users.find(u => u.id !== id) || users[0])
    loadUsers()
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({ nama: u.nama, berat_badan: String(u.berat_badan), tinggi_badan: String(u.tinggi_badan), target_kalori: String(u.target_kalori) })
    setMode('edit')
  }

  function openCreate() {
    setForm({ nama: '', berat_badan: '', tinggi_badan: '', target_kalori: '2000' })
    setMode('create')
  }

  const bmi = form.berat_badan && form.tinggi_badan
    ? (parseFloat(form.berat_badan) / Math.pow(parseFloat(form.tinggi_badan) / 100, 2)).toFixed(1)
    : null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {mode === 'list' && (
          <>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Pilih Profil</h2>
              {currentUser && onClose && (
                <button className={styles.closeBtn} onClick={onClose}>✕</button>
              )}
            </div>

            {loading ? (
              <div className={styles.loading}><div className={styles.spinner} /></div>
            ) : users.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>👤</div>
                <p>Belum ada profil</p>
                <span>Buat profil untuk mulai tracking</span>
              </div>
            ) : (
              <div className={styles.userList}>
                {users.map(u => {
                  const bmiVal = u.berat_badan && u.tinggi_badan
                    ? (u.berat_badan / Math.pow(u.tinggi_badan / 100, 2)).toFixed(1)
                    : null
                  return (
                    <div
                      key={u.id}
                      className={`${styles.userCard} ${currentUser?.id === u.id ? styles.userCardActive : ''}`}
                      onClick={() => { onSelect(u); onClose?.() }}
                    >
                      <div className={styles.userAvatar}>{u.nama[0].toUpperCase()}</div>
                      <div className={styles.userInfo}>
                        <div className={styles.userName}>{u.nama}</div>
                        <div className={styles.userMeta}>
                          {u.berat_badan > 0 && <span>{u.berat_badan} kg</span>}
                          {bmiVal && <span>BMI {bmiVal}</span>}
                          <span>Target {u.target_kalori} kkal</span>
                        </div>
                      </div>
                      <button className={styles.editUserBtn} onClick={e => { e.stopPropagation(); openEdit(u) }}>✏️</button>
                    </div>
                  )
                })}
              </div>
            )}

            <button className={styles.createBtn} onClick={openCreate}>+ Buat Profil Baru</button>
          </>
        )}

        {(mode === 'create' || mode === 'edit') && (
          <>
            <div className={styles.modalHeader}>
              <button className={styles.backBtn} onClick={() => setMode('list')}>← Kembali</button>
              <h2 className={styles.modalTitle}>{mode === 'create' ? 'Profil Baru' : 'Edit Profil'}</h2>
            </div>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nama</label>
                <input className={styles.input} placeholder="Nama kamu" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Berat Badan (kg)</label>
                  <input className={styles.input} type="number" placeholder="0" value={form.berat_badan} onChange={e => setForm(f => ({ ...f, berat_badan: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tinggi Badan (cm)</label>
                  <input className={styles.input} type="number" placeholder="0" value={form.tinggi_badan} onChange={e => setForm(f => ({ ...f, tinggi_badan: e.target.value }))} />
                </div>
              </div>

              {bmi && (
                <div className={styles.bmiBox}>
                  <span className={styles.bmiLabel}>BMI</span>
                  <span className={styles.bmiVal}>{bmi}</span>
                  <span className={styles.bmiCat}>
                    {parseFloat(bmi) < 18.5 ? '— Kurus' : parseFloat(bmi) < 25 ? '— Normal ✅' : parseFloat(bmi) < 30 ? '— Gemuk' : '— Obesitas'}
                  </span>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Kalori per Hari</label>
                <div className={styles.targetQuick}>
                  {[1500, 1800, 2000, 2200, 2500].map(k => (
                    <button key={k} type="button"
                      className={`${styles.targetChip} ${form.target_kalori === String(k) ? styles.targetChipActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, target_kalori: String(k) }))}>
                      {k}
                    </button>
                  ))}
                </div>
                <input className={styles.input} type="number" value={form.target_kalori} onChange={e => setForm(f => ({ ...f, target_kalori: e.target.value }))} />
              </div>

              <button className={styles.saveBtn} onClick={mode === 'create' ? createUser : saveEdit} disabled={!form.nama.trim()}>
                {mode === 'create' ? 'Buat & Mulai' : 'Simpan Perubahan'}
              </button>

              {mode === 'edit' && editUser && (
                <button className={styles.deleteUserBtn} onClick={() => deleteUser(editUser.id)}>Hapus Profil Ini</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
