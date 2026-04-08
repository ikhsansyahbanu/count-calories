'use client'
import { useState, useEffect, Component, ReactNode, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AnalyzeTab from '@/components/AnalyzeTab'
import HistoryTab from '@/components/HistoryTab'
import SummaryTab from '@/components/SummaryTab'
import WeightTab from '@/components/WeightTab'
import UserModal from '@/components/UserModal'
import DailyProgress from '@/components/DailyProgress'
import AuthGate, { useAuth } from '@/components/AuthGate'
import { UserProvider, useUser } from '@/components/UserContext'
import { User } from '@/lib/types'
import styles from './page.module.css'

const TABS = ['analyze', 'history', 'weight', 'summary'] as const
type Tab = typeof TABS[number]

function isTab(t: string | null): t is Tab {
  return TABS.includes(t as Tab)
}

function AppContent() {
  const { user, setUser, profileLoading } = useUser()
  const { logout } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tab, setTabState] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return isTab(t) ? t : 'analyze'
  })

  function setTab(t: Tab) {
    setTabState(t)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', t)
    router.replace(`?${params.toString()}`, { scroll: false })
  }
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

  function handleUpdateUser(u: User) {
    setUser(u)
    setShowUserModal(false)
  }

  function handleAnalyzed() {
    setRefreshKey(k => k + 1)
  }

  const bmi = user?.berat_badan && user?.tinggi_badan
    ? (user.berat_badan / Math.pow(user.tinggi_badan / 100, 2)).toFixed(1)
    : null

  return (
    <main className={styles.main}>
      {showUserModal && user && (
        <UserModal
          onUpdate={handleUpdateUser}
          currentUser={user}
          onClose={() => setShowUserModal(false)}
        />
      )}

      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>🥗</div>
          <div className={styles.logo}>Kalori<span>.AI</span></div>
        </div>
        <p className={styles.tagline}>foto makanan → kalori instan</p>
        <div className={styles.headerActions}>
          <button className={styles.themeToggle} onClick={toggleDark} title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className={styles.logoutBtn} onClick={logout} title="Keluar">
            ⏏
          </button>
        </div>

        {user ? (
          <button className={styles.userPill} onClick={() => setShowUserModal(true)}>
            <div className={styles.userPillAvatar}>{user.nama[0]?.toUpperCase() ?? '?'}</div>
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
        ) : profileLoading ? (
          <div className={styles.userPillSkeleton} />
        ) : null}
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

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Terjadi kesalahan</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}>Coba lagi</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Home() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <AuthGate>
          <Suspense fallback={null}>
            <AppContent />
          </Suspense>
        </AuthGate>
      </UserProvider>
    </ErrorBoundary>
  )
}
