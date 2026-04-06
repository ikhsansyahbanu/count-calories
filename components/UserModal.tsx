'use client'
import { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import styles from './UserModal.module.css'

interface Props {
  onSelect: (user: User | null) => void
  currentUser: User | null
  onClose?: () => void
}

type Aktivitas = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

const AKTIVITAS_LABELS: Record<Aktivitas, string> = {
  sedentary: 'Tidak aktif',
  light: 'Ringan (1-3x/minggu)',
  moderate: 'Sedang (3-5x/minggu)',
  active: 'Aktif (6-7x/minggu)',
  very_active: 'Sangat aktif',
}

const AKTIVITAS_MULTIPLIER: Record<Aktivitas, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

function hitungTDEE(berat: number, tinggi: number, usia: number, gender: string, aktivitas: Aktivitas): number | null {
  if (!berat || !tinggi || !usia) return null
  const bmr = gender === 'perempuan'
    ? 447.593 + (9.247 * berat) + (3.098 * tinggi) - (4.330 * usia)
    : 88.362 + (13.397 * berat) + (4.799 * tinggi) - (5.677 * usia)
  return Math.round(bmr * AKTIVITAS_MULTIPLIER[aktivitas])
}

const emptyForm = { nama: '', berat_badan: '', tinggi_badan: '', usia: '', jenis_kelamin: 'laki-laki', aktivitas: 'moderate' as Aktivitas, target_kalori: '2000' }

export default function UserModal({ onSelect, currentUser, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editUser, setEditUser] = useState<User | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    const json = await res.json()
    if (json.success) setUsers(json.data)
    setLoading(false)
  }

  const tdee = hitungTDEE(
    parseFloat(form.berat_badan),
    parseFloat(form.tinggi_badan),
    parseInt(form.usia),
    form.jenis_kelamin,
    form.aktivitas
  )

  function applyTDEE() {
    if (tdee) setForm(f => ({ ...f, target_kalori: String(tdee) }))
  }

  async function createUser() {
    if (!form.nama.trim() || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: form.nama.trim(),
        berat_badan: parseFloat(form.berat_badan) || 0,
        tinggi_badan: parseFloat(form.tinggi_badan) || 0,
        usia: parseInt(form.usia) || 0,
        jenis_kelamin: form.jenis_kelamin,
        aktivitas: form.aktivitas,
        target_kalori: parseInt(form.target_kalori) || 2000
      })
    })
    const json = await res.json()
    if (json.success) { onSelect(json.data); onClose?.() }
    setSubmitting(false)
  }

  async function saveEdit() {
    if (!editUser || !form.nama.trim() || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editUser.id,
        nama: form.nama.trim(),
        berat_badan: parseFloat(form.berat_badan) || 0,
        tinggi_badan: parseFloat(form.tinggi_badan) || 0,
        usia: parseInt(form.usia) || 0,
        jenis_kelamin: form.jenis_kelamin,
        aktivitas: form.aktivitas,
        target_kalori: parseInt(form.target_kalori) || 2000
      })
    })
    const json = await res.json()
    if (json.success) {
      if (currentUser?.id === editUser.id) onSelect(json.data)
      setMode('list')
      loadUsers()
    }
    setSubmitting(false)
  }

  async function deleteUser(id: number) {
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    setMode('list')
    setEditUser(null)
    await loadUsers()
    if (currentUser?.id === id) onSelect(null as unknown as User)
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({
      nama: u.nama,
      berat_badan: String(u.berat_badan || ''),
      tinggi_badan: String(u.tinggi_badan || ''),
      usia: String(u.usia || ''),
      jenis_kelamin: u.jenis_kelamin || 'laki-laki',
      aktivitas: (u.aktivitas as Aktivitas) || 'moderate',
      target_kalori: String(u.target_kalori)
    })
    setMode('edit')
  }

  function openCreate() {
    setForm(emptyForm)
    setMode('create')
  }

  const bmi = form.berat_badan && form.tinggi_badan
    ? (parseFloat(form.berat_badan) / Math.pow(parseFloat(form.tinggi_badan) / 100, 2)).toFixed(1)
    : null

  const bmiCategory = bmi
    ? parseFloat(bmi) < 18.5 ? { label: 'Kurus', color: 'var(--blue)' }
      : parseFloat(bmi) < 25 ? { label: 'Normal', color: 'var(--accent)' }
      : parseFloat(bmi) < 30 ? { label: 'Gemuk', color: 'var(--amber)' }
      : { label: 'Obesitas', color: 'var(--red)' }
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
                    <div key={u.id}
                      className={`${styles.userCard} ${currentUser?.id === u.id ? styles.userCardActive : ''}`}
                      onClick={() => { onSelect(u); onClose?.() }}>
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
              {/* Nama */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Nama</label>
                <input className={styles.input} placeholder="Nama kamu" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
              </div>

              {/* Jenis Kelamin */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Jenis Kelamin</label>
                <div className={styles.genderRow}>
                  {['laki-laki', 'perempuan'].map(g => (
                    <button key={g} type="button"
                      className={`${styles.genderBtn} ${form.jenis_kelamin === g ? styles.genderBtnActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, jenis_kelamin: g }))}>
                      {g === 'laki-laki' ? '👨 Laki-laki' : '👩 Perempuan'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Berat, Tinggi, Usia */}
              <div className={styles.formRow3}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Berat (kg)</label>
                  <input className={styles.input} type="number" placeholder="0" value={form.berat_badan} onChange={e => setForm(f => ({ ...f, berat_badan: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tinggi (cm)</label>
                  <input className={styles.input} type="number" placeholder="0" value={form.tinggi_badan} onChange={e => setForm(f => ({ ...f, tinggi_badan: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Usia</label>
                  <input className={styles.input} type="number" placeholder="0" value={form.usia} onChange={e => setForm(f => ({ ...f, usia: e.target.value }))} />
                </div>
              </div>

              {/* BMI */}
              {bmi && bmiCategory && (
                <div className={styles.bmiBox}>
                  <div>
                    <div className={styles.bmiLabel}>BMI</div>
                    <div className={styles.bmiVal} style={{ color: bmiCategory.color }}>{bmi}</div>
                  </div>
                  <div className={styles.bmiDivider} />
                  <div className={styles.bmiCatBox}>
                    <div className={styles.bmiCatLabel}>Kategori</div>
                    <div className={styles.bmiCat} style={{ color: bmiCategory.color }}>{bmiCategory.label}</div>
                  </div>
                </div>
              )}

              {/* Aktivitas */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Tingkat Aktivitas</label>
                <div className={styles.aktivitasList}>
                  {(Object.keys(AKTIVITAS_LABELS) as Aktivitas[]).map(a => (
                    <button key={a} type="button"
                      className={`${styles.aktivitasBtn} ${form.aktivitas === a ? styles.aktivitasBtnActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, aktivitas: a }))}>
                      {AKTIVITAS_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>

              {/* TDEE recommendation */}
              {tdee && (
                <div className={styles.tdeeBox}>
                  <div className={styles.tdeeInfo}>
                    <div className={styles.tdeeLabel}>Saran kalori harian (Harris-Benedict)</div>
                    <div className={styles.tdeeVal}>{tdee} kkal/hari</div>
                    <div className={styles.tdeeSub}>Berdasarkan berat, tinggi, usia & aktivitasmu</div>
                  </div>
                  <button type="button" className={styles.tdeeApply} onClick={applyTDEE}>Pakai</button>
                </div>
              )}

              {/* Target kalori */}
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
                <input className={styles.input} type="number" value={form.target_kalori}
                  onChange={e => setForm(f => ({ ...f, target_kalori: e.target.value }))} />
              </div>

              <button className={styles.saveBtn} onClick={mode === 'create' ? createUser : saveEdit} disabled={!form.nama.trim() || submitting}>
                {submitting ? 'Menyimpan...' : mode === 'create' ? 'Buat & Mulai' : 'Simpan Perubahan'}
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
