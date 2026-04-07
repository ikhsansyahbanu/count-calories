'use client'
import { FoodLog } from '@/lib/types'
import styles from './LogDetail.module.css'

interface Props {
  log: FoodLog
  onClose: () => void
}

export default function LogDetail({ log, onClose }: Props) {
  const items = typeof log.items === 'string'
    ? (() => { try { return JSON.parse(log.items as string) } catch { return [] } })()
    : (log.items || [])
  const time = new Date(log.created_at).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  const pct = Math.round((log.total_kalori / log.target_kalori) * 100)
  const over = pct > 100

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <div>
            {log.keterangan && <span className={styles.ketBadge}>{log.keterangan}</span>}
            <h2 className={styles.nama}>{log.nama}</h2>
            <div className={styles.waktu}>{time}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Kalori besar */}
        <div className={styles.kalBox}>
          <div className={styles.kalNum}>{log.total_kalori}</div>
          <div className={styles.kalLbl}>kkal</div>
          <div className={styles.porsi}>{log.porsi}</div>
        </div>

        {/* Progress target */}
        <div className={styles.section}>
          <div className={styles.progressLabel}>
            <span>Dari target harian ({log.target_kalori} kkal)</span>
            <span style={{ color: over ? 'var(--red)' : 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div className={styles.progressBg}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(pct, 100)}%`, background: over ? 'var(--red)' : 'var(--accent)' }}
            />
          </div>
          {over && <div className={styles.overWarning}>⚠️ Melebihi target {pct - 100}%</div>}
        </div>

        {/* Makronutrien */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Makronutrien</div>
          <div className={styles.macroGrid}>
            <div className={styles.macroCard}>
              <div className={styles.macroVal} style={{ color: 'var(--teal)' }}>{log.protein_g}g</div>
              <div className={styles.macroLbl}>Protein</div>
              <div className={styles.macroBar}><div style={{ width: `${Math.min((log.protein_g / 175) * 100, 100)}%`, background: 'var(--teal)' }} /></div>
            </div>
            <div className={styles.macroCard}>
              <div className={styles.macroVal} style={{ color: 'var(--amber)' }}>{log.karbo_g}g</div>
              <div className={styles.macroLbl}>Karbohidrat</div>
              <div className={styles.macroBar}><div style={{ width: `${Math.min((log.karbo_g / 300) * 100, 100)}%`, background: 'var(--amber)' }} /></div>
            </div>
            <div className={styles.macroCard}>
              <div className={styles.macroVal} style={{ color: 'var(--red)' }}>{log.lemak_g}g</div>
              <div className={styles.macroLbl}>Lemak</div>
              <div className={styles.macroBar}><div style={{ width: `${Math.min((log.lemak_g / 80) * 100, 100)}%`, background: 'var(--red)' }} /></div>
            </div>
          </div>
        </div>

        {/* Rincian item */}
        {items.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Rincian Makanan ({items.length} item)</div>
            <div className={styles.itemList}>
              {items.map((item: { nama: string; kalori: number }, i: number) => {
                const pctItem = Math.round((item.kalori / log.total_kalori) * 100)
                return (
                  <div key={i} className={styles.itemRow}>
                    <div className={styles.itemDot} />
                    <div className={styles.itemInfo}>
                      <div className={styles.itemNama}>{item.nama}</div>
                      <div className={styles.itemBar}>
                        <div style={{ width: `${pctItem}%`, background: 'var(--accent)', height: '100%', borderRadius: '99px' }} />
                      </div>
                    </div>
                    <div className={styles.itemKal}>
                      <span>{item.kalori}</span>
                      <span className={styles.itemKalLbl}>kkal</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Saran AI */}
        {log.saran && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Saran AI</div>
            <div className={styles.saranBox}>
              <span className={styles.saranIcon}>💡</span>
              <p>{log.saran}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
