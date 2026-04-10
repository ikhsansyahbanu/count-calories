'use client'
import { useState, useRef } from 'react'
import { User } from '@/lib/types'
import { getCalorieTarget } from '@/lib/utils'
import styles from './UserModal.module.css'

interface Props {
  onUpdate: (user: User) => void
  currentUser: User
  onClose: () => void
}

type Aktivitas = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
type Goal = 'cutting' | 'maintain' | 'bulking'

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

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'cutting', label: '✂️ Turun BB' },
  { value: 'maintain', label: '⚖️ Jaga BB' },
  { value: 'bulking', label: '💪 Naik BB' },
]

function hitungTDEE(berat: number, tinggi: number, usia: number, gender: string, aktivitas: Aktivitas): number | null {
  if (!berat || !tinggi || !usia) return null
  const bmr = gender === 'perempuan'
    ? 447.593 + (9.247 * berat) + (3.098 * tinggi) - (4.330 * usia)
    : 88.362 + (13.397 * berat) + (4.799 * tinggi) - (5.677 * usia)
  return Math.round(bmr * AKTIVITAS_MULTIPLIER[aktivitas])
}

export default function UserModal({ onUpdate, currentUser, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [form, setForm] = useState({
    nama: currentUser.nama,
    berat_badan: String(currentUser.berat_badan || ''),
    tinggi_badan: String(currentUser.tinggi_badan || ''),
    usia: String(currentUser.usia || ''),
    jenis_kelamin: currentUser.jenis_kelamin || 'laki-laki',
    aktivitas: (currentUser.aktivitas as Aktivitas) || 'moderate',
    goal: (currentUser.goal as Goal) ?? 'maintain',
    target_kalori: String(currentUser.target_kalori),
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  const tdee = hitungTDEE(
    parseFloat(form.berat_badan),
    parseFloat(form.tinggi_badan),
    parseInt(form.usia),
    form.jenis_kelamin,
    form.aktivitas
  )

  const tdeeAdjusted = tdee ? getCalorieTarget(tdee, form.goal) : null

  function getTDEELabel(): string {
    if (!tdee || !tdeeAdjusted) return ''
    if (form.goal === 'cutting') return `Saran untuk Turun BB: ${tdeeAdjusted.toLocaleString('id-ID')} kkal (TDEE ${tdee.toLocaleString('id-ID')} − 500)`
    if (form.goal === 'bulking') return `Saran untuk Naik BB: ${tdeeAdjusted.toLocaleString('id-ID')} kkal (TDEE ${tdee.toLocaleString('id-ID')} + 300)`
    return `Saran untuk Jaga BB: ${tdeeAdjusted.toLocaleString('id-ID')} kkal (TDEE)`
  }

  function applyTDEE() {
    if (tdeeAdjusted) setForm(f => ({ ...f, target_kalori: String(tdeeAdjusted) }))
  }

  async function saveEdit() {
    if (!form.nama.trim() || submittingRef.current) return
    if (form.password && form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return
    }
    if (form.password && form.password.length < 6) {
      setError('Password baru minimal 6 karakter')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError('')

    // Optimistic update — update dashboard immediately before API responds
    const prevUser = { ...currentUser }
    const optimisticUser: User = {
      ...currentUser,
      nama: form.nama.trim(),
      berat_badan: parseFloat(form.berat_badan) || 0,
      tinggi_badan: parseFloat(form.tinggi_badan) || 0,
      usia: parseInt(form.usia) || 0,
      jenis_kelamin: form.jenis_kelamin,
      aktivitas: form.aktivitas,
      goal: form.goal as User['goal'],
      target_kalori: parseInt(form.target_kalori) || 2000,
    }
    onUpdate(optimisticUser)

    try {
      const body: Record<string, unknown> = {
        nama: form.nama.trim(),
        berat_badan: parseFloat(form.berat_badan) || 0,
        tinggi_badan: parseFloat(form.tinggi_badan) || 0,
        usia: parseInt(form.usia) || 0,
        jenis_kelamin: form.jenis_kelamin,
        aktivitas: form.aktivitas,
        goal: form.goal,
        target_kalori: parseInt(form.target_kalori) || 2000,
      }
      if (form.password) body.password = form.password

      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        onUpdate(json.data)
        onClose()
      } else {
        onUpdate(prevUser) // rollback
        setError(json.error || 'Gagal menyimpan')
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
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
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Profil</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
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
              {(['laki-laki', 'perempuan'] as const).map(g => (
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

          {/* Goal */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Tujuan</label>
            <div className={styles.genderRow}>
              {GOAL_OPTIONS.map(g => (
                <button key={g.value} type="button"
                  className={`${styles.genderBtn} ${form.goal === g.value ? styles.genderBtnActive : ''}`}
                  onClick={() => setForm(f => ({ ...f, goal: g.value }))}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* TDEE recommendation */}
          {tdee && tdeeAdjusted && (
            <div className={styles.tdeeBox}>
              <div className={styles.tdeeInfo}>
                <div className={styles.tdeeLabel}>Saran kalori harian (Harris-Benedict)</div>
                <div className={styles.tdeeVal}>{tdeeAdjusted.toLocaleString('id-ID')} kkal/hari</div>
                <div className={styles.tdeeSub}>{getTDEELabel()}</div>
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

          {/* Ganti Password (opsional) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Ganti Password <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opsional)</span></label>
            <input className={styles.input} type="password" placeholder="Password baru (min 6 karakter)"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {form.password && (
              <input className={styles.input} type="password" placeholder="Konfirmasi password baru"
                value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                style={{ marginTop: '0.5rem' }} />
            )}
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</p>}

          <button className={styles.saveBtn} onClick={saveEdit} disabled={!form.nama.trim() || submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}
