'use client'
import { useState, useEffect } from 'react'
import styles from './AuthGate.module.css'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => setStatus(data.authenticated ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('unauthenticated'))
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setStatus('authenticated')
      } else {
        const data = await res.json()
        setError(data.error || 'Password salah')
      }
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className={styles.overlay}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (status === 'authenticated') {
    return <>{children}</>
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.icon}>🥗</div>
        <h1 className={styles.title}>Kalori<span>.AI</span></h1>
        <p className={styles.subtitle}>Masukkan password untuk melanjutkan</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="password"
            className={styles.input}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
