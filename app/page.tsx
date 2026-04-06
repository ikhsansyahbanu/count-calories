'use client'
import { useState } from 'react'
import AnalyzeTab from '@/components/AnalyzeTab'
import HistoryTab from '@/components/HistoryTab'
import SummaryTab from '@/components/SummaryTab'
import styles from './page.module.css'

type Tab = 'analyze' | 'history' | 'summary'

export default function Home() {
  const [tab, setTab] = useState<Tab>('analyze')

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>🥗</div>
          <div className={styles.logo}>Kalori<span>.AI</span></div>
        </div>
        <p className={styles.tagline}>foto makanan → kalori instan</p>
      </header>

      <div className={styles.tabs}>
        {(['analyze', 'history', 'summary'] as Tab[]).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'analyze' ? 'Analisis' : t === 'history' ? 'Riwayat' : 'Ringkasan'}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'analyze' && <AnalyzeTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'summary' && <SummaryTab />}
      </div>
    </main>
  )
}
