'use client'
import { FoodLog, User } from '@/lib/types'
import styles from '../AnalyzeTab.module.css'

interface Props {
  result: FoodLog
  target: number
  user: User | null
  inputMode: 'foto' | 'manual'
  savedFavId: number | null
  savingFav: boolean
  onSaveFavorite: () => void
  onDeleteFavorite: (id: number) => void
  onReset: () => void
}

export default function ResultCard({
  result, target, user, inputMode,
  savedFavId, savingFav,
  onSaveFavorite, onDeleteFavorite, onReset,
}: Props) {
  const pct = Math.round((result.total_kalori / target) * 100)
  const items: { nama: string; kalori: number }[] = result.items
    ? (typeof result.items === 'string'
        ? (() => { try { return JSON.parse(result.items as string) } catch { return [] } })()
        : result.items)
    : []

  return (
    <div className={styles.resultCard}>
      <div className={styles.resultHeader}>
        <div className={styles.resultHeaderTop}>
          <div>
            <div className={styles.resultName}>{result.nama}</div>
            <div className={styles.resultPortion}>{result.porsi}</div>
          </div>
          {user && (
            <button
              className={`${styles.favBtn} ${savedFavId ? styles.favBtnSaved : ''}`}
              onClick={savedFavId ? () => onDeleteFavorite(savedFavId) : onSaveFavorite}
              disabled={savingFav}
            >
              {savedFavId ? '⭐' : '☆'}
            </button>
          )}
        </div>
        {result.confidence && (
          <div className={`${styles.confidenceBadge} ${styles[`confidence_${result.confidence}`]}`}>
            {result.confidence === 'high' ? '✅ Akurasi Tinggi' : result.confidence === 'medium' ? '⚠️ Akurasi Sedang' : '❓ Akurasi Rendah'}
          </div>
        )}
      </div>

      <div className={styles.kalBig}>
        <div className={styles.kalNumber}>{result.total_kalori}</div>
        <div className={styles.kalLabel}>kkal total</div>
      </div>

      <div className={styles.macros}>
        <div className={styles.macroPill}>
          <div className={`${styles.macroVal} ${styles.protein}`}>{result.protein_g}g</div>
          <div className={styles.macroLbl}>Protein</div>
        </div>
        <div className={styles.macroPill}>
          <div className={`${styles.macroVal} ${styles.karbo}`}>{result.karbo_g}g</div>
          <div className={styles.macroLbl}>Karbo</div>
        </div>
        <div className={styles.macroPill}>
          <div className={`${styles.macroVal} ${styles.lemak}`}>{result.lemak_g}g</div>
          <div className={styles.macroLbl}>Lemak</div>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          <span>Dari target harian</span>
          <span>{pct}%</span>
        </div>
        <div className={styles.progressBg}>
          <div
            className={`${styles.progressFill} ${pct > 100 ? styles.over : ''}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {items.length > 0 && (
        <div className={styles.breakdown}>
          <div className={styles.breakdownTitle}>Rincian per item</div>
          {items.map((item, i) => (
            <div key={i} className={styles.foodItem}>
              <div className={styles.foodDot} />
              <div className={styles.foodName}>{item.nama}</div>
              <div className={styles.foodKal}>{item.kalori} kkal</div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.tipsBox}>
        <div className={styles.tipsTitle}>Saran</div>
        <div>{result.saran}</div>
      </div>

      <button className={styles.resetBtn} onClick={onReset}>
        {inputMode === 'foto' ? 'Analisis foto lain' : 'Estimasi makanan lain'}
      </button>
    </div>
  )
}
