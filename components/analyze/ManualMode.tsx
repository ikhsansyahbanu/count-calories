'use client'
import styles from '../AnalyzeTab.module.css'

export type KategoriOption = 'Makanan' | 'Minuman'
export type PorsiOption = 'Kecil' | 'Normal' | 'Besar' | 'Ekstra'
export type MetodeMasakOption = 'Goreng' | 'Bakar' | 'Rebus' | 'Kukus' | 'Mentah'
export type MinumanManisOption = 'Tidak Manis' | 'Sedikit Manis' | 'Manis' | 'Sangat Manis'
export type MinumanSuhuOption = 'Dingin' | 'Hangat' | 'Panas'

interface Props {
  kategori: KategoriOption
  setKategori: (v: KategoriOption) => void
  nama: string
  setNama: (v: string) => void
  porsi: PorsiOption
  setPorsi: (v: PorsiOption) => void
  metode: MetodeMasakOption
  setMetode: (v: MetodeMasakOption) => void
  santan: boolean
  setSantan: (v: boolean) => void
  manis: MinumanManisOption
  setManis: (v: MinumanManisOption) => void
  suhu: MinumanSuhuOption
  setSuhu: (v: MinumanSuhuOption) => void
  onSubmit?: () => void
}

export default function ManualMode({
  kategori, setKategori,
  nama, setNama,
  porsi, setPorsi,
  metode, setMetode,
  santan, setSantan,
  manis, setManis,
  suhu, setSuhu,
  onSubmit,
}: Props) {
  return (
    <div className={styles.manualForm}>
      <div className={styles.manualField}>
        <label className={styles.manualLabel}>Kategori</label>
        <div className={styles.toggleGroup}>
          {(['Makanan', 'Minuman'] as KategoriOption[]).map(k => (
            <button key={k} type="button"
              className={`${styles.toggleBtn} ${kategori === k ? styles.toggleBtnActive : ''}`}
              onClick={() => setKategori(k)}>
              {k === 'Makanan' ? '🍽️ Makanan' : '🥤 Minuman'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.manualField}>
        <label className={styles.manualLabel}>{kategori === 'Makanan' ? 'Nama Makanan' : 'Nama Minuman'}</label>
        <input
          type="text"
          placeholder={kategori === 'Makanan' ? 'contoh: Nasi goreng, Ayam bakar...' : 'contoh: Es teh manis, Kopi susu...'}
          value={nama}
          onChange={e => setNama(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && nama.trim()) onSubmit?.() }}
          className={styles.manualInput}
          maxLength={100}
          autoFocus
        />
      </div>

      <div className={styles.manualField}>
        <label className={styles.manualLabel}>Ukuran {kategori === 'Makanan' ? 'Porsi' : 'Minuman'}</label>
        <div className={styles.chipGroup}>
          {(['Kecil', 'Normal', 'Besar', 'Ekstra'] as PorsiOption[]).map(p => (
            <button key={p} type="button"
              className={`${styles.chip} ${porsi === p ? styles.chipActive : ''}`}
              onClick={() => setPorsi(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {kategori === 'Makanan' && (
        <>
          <div className={styles.manualField}>
            <label className={styles.manualLabel}>Metode Masak</label>
            <div className={styles.chipGroup}>
              {(['Goreng', 'Bakar', 'Rebus', 'Kukus', 'Mentah'] as MetodeMasakOption[]).map(m => (
                <button key={m} type="button"
                  className={`${styles.chip} ${metode === m ? styles.chipActive : ''}`}
                  onClick={() => setMetode(m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.manualField}>
            <label className={styles.manualLabel}>Pakai Santan?</label>
            <div className={styles.toggleGroup}>
              <button type="button"
                className={`${styles.toggleBtn} ${!santan ? styles.toggleBtnActive : ''}`}
                onClick={() => setSantan(false)}>Tidak</button>
              <button type="button"
                className={`${styles.toggleBtn} ${santan ? styles.toggleBtnActive : ''}`}
                onClick={() => setSantan(true)}>Ya</button>
            </div>
          </div>
        </>
      )}

      {kategori === 'Minuman' && (
        <>
          <div className={styles.manualField}>
            <label className={styles.manualLabel}>Tingkat Kemanisan</label>
            <div className={styles.chipGroup}>
              {(['Tidak Manis', 'Sedikit Manis', 'Manis', 'Sangat Manis'] as MinumanManisOption[]).map(m => (
                <button key={m} type="button"
                  className={`${styles.chip} ${manis === m ? styles.chipActive : ''}`}
                  onClick={() => setManis(m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.manualField}>
            <label className={styles.manualLabel}>Suhu</label>
            <div className={styles.toggleGroup}>
              {(['Dingin', 'Hangat', 'Panas'] as MinumanSuhuOption[]).map(s => (
                <button key={s} type="button"
                  className={`${styles.toggleBtn} ${suhu === s ? styles.toggleBtnActive : ''}`}
                  onClick={() => setSuhu(s)}>
                  {s === 'Dingin' ? '🧊 Dingin' : s === 'Hangat' ? '☕ Hangat' : '🔥 Panas'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
