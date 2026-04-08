'use client'
import { useState, createContext, useContext } from 'react'
import { useUser } from '@/components/UserContext'
import styles from './AuthGate.module.css'

interface AuthContextType {
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ logout: async () => {} })

export function useAuth() {
  return useContext(AuthContext)
}

type Mode = 'login' | 'register'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { authenticated, authChecked, refreshAuth, setUser } = useUser()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        refreshAuth()
        setUsername('')
        setPassword('')
      } else {
        const data = await res.json()
        setError(data.error || 'Username atau password salah')
      }
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Buat user baru
      const regRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: username, password }),
      })
      const regData = await regRes.json()
      if (!regRes.ok) {
        setError(regData.error || 'Gagal membuat akun')
        return
      }
      // Auto-login setelah register
      const loginRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (loginRes.ok) {
        refreshAuth()
        setUsername('')
        setPassword('')
        setConfirmPassword('')
      } else {
        setError('Akun dibuat, tapi gagal login otomatis. Silakan login manual.')
        setMode('login')
      }
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    setUser(null)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  if (!authChecked) {
    return (
      <div className={styles.overlay}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (authenticated) {
    return (
      <AuthContext.Provider value={{ logout }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.icon}>🥗</div>
        <h1 className={styles.title}>Kalori<span>.AI</span></h1>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Masuk ke akunmu' : 'Buat akun baru'}
        </p>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className={styles.form}>
          <input
            type="text"
            className={styles.input}
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            required
          />
          <input
            type="password"
            className={styles.input}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {mode === 'register' && (
            <input
              type="password"
              className={styles.input}
              placeholder="Konfirmasi Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          )}
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading
              ? (mode === 'login' ? 'Memverifikasi...' : 'Membuat akun...')
              : (mode === 'login' ? 'Masuk' : 'Daftar')}
          </button>
        </form>

        <p className={styles.switchText}>
          {mode === 'login' ? (
            <>Belum punya akun?{' '}
              <button className={styles.switchBtn} onClick={() => switchMode('register')}>Daftar</button>
            </>
          ) : (
            <>Sudah punya akun?{' '}
              <button className={styles.switchBtn} onClick={() => switchMode('login')}>Masuk</button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
