'use client'
import { useState, useEffect } from 'react'
import AnalyzeTab from '@/components/AnalyzeTab'
import HistoryTab from '@/components/HistoryTab'
import SummaryTab from '@/components/SummaryTab'
import WeightTab from '@/components/WeightTab'
import UserModal from '@/components/UserModal'
import DailyProgress from '@/components/DailyProgress'
import AuthGate from '@/components/AuthGate'
import { UserProvider, useUser } from '@/components/UserContext'
import { User } from '@/lib/types'
import styles from './page.module.css'

type Tab = 'analyze' | 'history' | 'weight' | 'summary'

function AppContent() {
  const { user, setUser } = useUser()
  const [tab, setTab] = useState<Tab>('analyze')
  const [showUserModal, setShowUserModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { setDarkMode(true); document.documentElement.setAttribute('data-theme', 'dark') }
  }, [])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  function handleSelectUser(u: User | null) {
    setUser(u)
    if (u) setShowUserModal(false)
  }

  function handleAnalyzed() {
    setRefreshKey(k => k + 1)
  }

  const bmi = user?.berat_badan && user?.tinggi_badan
    ? (user.berat_badan / Math.pow(user.tinggi_badan / 100, 2)).toFixed(1)
    : null

  return (
    <main className={styles.main}>
      {(!user || showUserModal) && (
        <UserModal
          onSelect={handleSelectUser}
          currentUser={user}
          onClose={user ? () => setShowUserModal(false) : undefined}
        />
      )}

      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>🥗</div>
          <div className={styles.logo}>Kalori<span>.AI</span></div>
        </div>
        <p className={styles.tagline}>foto makanan → kalori instan</p>
        <button className={styles.themeToggle} onClick={toggleDark} title="Toggle dark mode">
          {darkMode ? '☀️' : '🌙'}
        </button>

        {user && (
          <button className={styles.userPill} onClick={() => setShowUserModal(true)}>
            <div className={styles.userPillAvatar}>{user.nama[0].toUpperCase()}</div>
            <div className={styles.userPillInfo}>
              <span className={styles.userPillName}>{user.nama}</span>
              <span className={styles.userPillMeta}>
                {user.berat_badan > 0 && `${user.berat_badan}kg`}
                {bmi && ` · BMI ${bmi}`}
                {` · ${user.target_kalori} kkal`}
              </span>
            </div>
            <span className={styles.userPillEdit}>✏️</span>
          </button>
        )}
      </header>

      <DailyProgress user={user} refreshKey={refreshKey} />

      <div className={styles.tabs}>
        {(['analyze', 'history', 'weight', 'summary'] as Tab[]).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'analyze' ? 'Analisis' : t === 'history' ? 'Riwayat' : t === 'weight' ? 'Berat' : 'Ringkasan'}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'analyze' && <AnalyzeTab user={user} onAnalyzed={handleAnalyzed} />}
        {tab === 'history' && <HistoryTab user={user} refreshKey={refreshKey} />}
        {tab === 'weight' && <WeightTab user={user} />}
        {tab === 'summary' && <SummaryTab user={user} />}
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <AuthGate>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </AuthGate>
  )
}
