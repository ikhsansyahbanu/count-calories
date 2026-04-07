'use client'
import { FoodFavorite } from '@/lib/types'
import styles from '../AnalyzeTab.module.css'

interface Props {
  favorites: FoodFavorite[]
  show: boolean
  onToggle: () => void
  onRelog: (fav: FoodFavorite) => void
  onDelete: (id: number) => void
}

export default function FavoritesPanel({ favorites, show, onToggle, onRelog, onDelete }: Props) {
  if (favorites.length === 0) return null

  return (
    <div className={styles.favSection}>
      <button className={styles.favSectionHeader} onClick={onToggle}>
        <span>⭐ Favorit Saya ({favorites.length})</span>
        <span className={styles.favChevron}>{show ? '▲' : '▼'}</span>
      </button>
      {show && (
        <div className={styles.favList}>
          {favorites.map(fav => (
            <div key={fav.id} className={styles.favItem}>
              <div className={styles.favItemInfo}>
                <div className={styles.favItemName}>{fav.nama}</div>
                <div className={styles.favItemMeta}>{fav.total_kalori} kkal · {fav.porsi}</div>
              </div>
              <div className={styles.favItemActions}>
                <button className={styles.favRelogBtn} onClick={() => onRelog(fav)}>Log</button>
                <button className={styles.favDeleteBtn} onClick={() => onDelete(fav.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
