'use client'
import { useState, useRef, useEffect } from 'react'
import { FoodLog, FoodFavorite, User } from '@/lib/types'
import styles from './AnalyzeTab.module.css'

type InputMode = 'foto' | 'manual'
type KategoriOption = 'Makanan' | 'Minuman'
type PorsiOption = 'Kecil' | 'Normal' | 'Besar' | 'Ekstra'
type MetodeMasakOption = 'Goreng' | 'Bakar' | 'Rebus' | 'Kukus' | 'Mentah'
type MinumanManisOption = 'Tidak Manis' | 'Sedikit Manis' | 'Manis' | 'Sangat Manis'
type MinumanSuhuOption = 'Dingin' | 'Hangat' | 'Panas'

export default function AnalyzeTab({ user, onAnalyzed }: { user: User | null; onAnalyzed?: () => void }) {
  const [inputMode, setInputMode] = useState<InputMode>('foto')

  // Foto mode state
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState('image/jpeg')

  // Manual mode state
  const [manualKategori, setManualKategori] = useState<KategoriOption>('Makanan')
  const [manualNama, setManualNama] = useState('')
  const [manualPorsi, setManualPorsi] = useState<PorsiOption>('Normal')
  const [manualMetode, setManualMetode] = useState<MetodeMasakOption>('Goreng')
  const [manualSantan, setManualSantan] = useState(false)
  const [manualManis, setManualManis] = useState<MinumanManisOption>('Manis')
  const [manualSuhu, setManualSuhu] = useState<MinumanSuhuOption>('Dingin')

  // Shared state
  const [target, setTarget] = useState(user?.target_kalori || 2000)
  const [keterangan, setKeterangan] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FoodLog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Favorites state
  const [favorites, setFavorites] = useState<FoodFavorite[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [savingFav, setSavingFav] = useState(false)
  const [savedFavId, setSavedFavId] = useState<number | null>(null)

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    if (user?.target_kalori) setTarget(user.target_kalori)
  }, [user?.target_kalori])

  useEffect(() => {
    loadFavorites()
    setSavedFavId(null)
  }, [user?.id])

  async function loadFavorites() {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/favorites?user_id=${user.id}`)
      const json = await res.json()
      if (json.success) setFavorites(json.data)
    } catch { /* silent */ }
  }

  async function saveFavorite() {
    if (!result || !user?.id) return
    setSavingFav(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          nama: result.nama,
          porsi: result.porsi,
          total_kalori: result.total_kalori,
          protein_g: result.protein_g,
          karbo_g: result.karbo_g,
          lemak_g: result.lemak_g,
          items: result.items
        })
      })
      const json = await res.json()
      if (json.success) {
        setSavedFavId(json.data.id)
        if (!json.duplicate) {
          setFavorites(prev => [json.data, ...prev])
        }
      }
    } finally {
      setSavingFav(false)
    }
  }

  async function deleteFavorite(id: number) {
    fetch(`/api/favorites?id=${id}`, { method: 'DELETE' })
    if (savedFavId === id) setSavedFavId(null)
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  async function relogFavorite(fav: FoodFavorite) {
    setLoading(true)
    setError(null)
    setResult(null)
    setShowFavorites(false)
    try {
      const res = await fetch('/api/favorites/relog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite_id: fav.id, user_id: user?.id, keterangan, target_kalori: target })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      onAnalyzed?.()
    } catch {
      setError('Gagal log ulang favorit.')
    } finally {
      setLoading(false)
    }
  }

  function handleFile(file: File) {
    setMediaType('image/jpeg')
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      // Compress foto sebelum disimpan
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        let { width, height } = img
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        // Compress sampai di bawah 1MB
        let quality = 0.7
        let compressed = canvas.toDataURL('image/jpeg', quality)
        while (compressed.length > 1_300_000 && quality > 0.3) {
          quality -= 0.1
          compressed = canvas.toDataURL('image/jpeg', quality)
        }
        setImageBase64(compressed.split(',')[1])
        setImagePreview(compressed)
        setResult(null)
        setError(null)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }

  function resetPhoto() {
    setImageBase64(null)
    setImagePreview(null)
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  function resetManual() {
    setManualNama('')
    setManualKategori('Makanan')
    setManualPorsi('Normal')
    setManualMetode('Goreng')
    setManualSantan(false)
    setManualManis('Manis')
    setManualSuhu('Dingin')
    setResult(null)
    setError(null)
  }

  function switchMode(mode: InputMode) {
    setInputMode(mode)
    setResult(null)
    setError(null)
  }

  async function analyze() {
    if (!imageBase64) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType, target_kalori: target, keterangan, user_id: user?.id })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal menganalisis foto.')
      setResult(json.data)
      onAnalyzed?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis foto. Coba lagi dengan foto yang lebih jelas.')
    } finally {
      setLoading(false)
    }
  }

  async function estimateManual() {
    if (!manualNama.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: manualNama.trim(),
          kategori: manualKategori,
          porsi: manualPorsi,
          metode_masak: manualMetode,
          santan: manualSantan,
          manis: manualManis,
          suhu: manualSuhu,
          target_kalori: target,
          keterangan,
          user_id: user?.id
        })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      onAnalyzed?.()
    } catch {
      setError('Gagal mengestimasi kalori. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const pct = result ? Math.round((result.total_kalori / target) * 100) : 0
  const items = result?.items
    ? (typeof result.items === 'string' ? JSON.parse(result.items) : result.items)
    : []

  return (
    <div className={styles.wrap}>
      {/* Mode toggle */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${inputMode === 'foto' ? styles.modeBtnActive : ''}`}
          onClick={() => switchMode('foto')}
          type="button"
        >
          <span className={styles.modeBtnIcon}>📷</span>
          Foto
        </button>
        <button
          className={`${styles.modeBtn} ${inputMode === 'manual' ? styles.modeBtnActive : ''}`}
          onClick={() => switchMode('manual')}
          type="button"
        >
          <span className={styles.modeBtnIcon}>✏️</span>
          Manual
        </button>
      </div>

      {/* Favorites section */}
      {favorites.length > 0 && (
        <div className={styles.favSection}>
          <button className={styles.favSectionHeader} onClick={() => setShowFavorites(!showFavorites)}>
            <span>⭐ Favorit Saya ({favorites.length})</span>
            <span className={styles.favChevron}>{showFavorites ? '▲' : '▼'}</span>
          </button>
          {showFavorites && (
            <div className={styles.favList}>
              {favorites.map(fav => (
                <div key={fav.id} className={styles.favItem}>
                  <div className={styles.favItemInfo}>
                    <div className={styles.favItemName}>{fav.nama}</div>
                    <div className={styles.favItemMeta}>{fav.total_kalori} kkal · {fav.porsi}</div>
                  </div>
                  <div className={styles.favItemActions}>
                    <button className={styles.favRelogBtn} onClick={() => relogFavorite(fav)}>Log</button>
                    <button className={styles.favDeleteBtn} onClick={() => deleteFavorite(fav.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FOTO MODE */}
      {inputMode === 'foto' && (
        <>
          {!imagePreview ? (
            <div className={styles.uploadArea} onDrop={onDrop} onDragOver={e => e.preventDefault()}>
              {/* Input kamera */}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} hidden />
              {/* Input galeri/file */}
              <input ref={galleryRef} type="file" accept="image/*" onChange={onFileChange} hidden />

              <div className={styles.uploadIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div className={styles.uploadTitle}>Unggah foto makanan</div>
              <div className={styles.uploadSub}>JPG, PNG, HEIC</div>

              <div className={styles.uploadBtns}>
                {isMobile && (
                  <button type="button" className={styles.uploadBtn} onClick={() => fileRef.current?.click()}>
                    📷 Kamera
                  </button>
                )}
                <button type="button" className={styles.uploadBtn} onClick={() => galleryRef.current?.click()}>
                  {isMobile ? '🖼️ Galeri' : '📁 Upload File'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.previewWrap}>
              <img src={imagePreview} alt="preview" className={styles.previewImg} />
              <button className={styles.removeBtn} onClick={resetPhoto}>✕</button>
            </div>
          )}
        </>
      )}

      {/* MANUAL MODE */}
      {inputMode === 'manual' && (
        <div className={styles.manualForm}>

          {/* Kategori toggle */}
          <div className={styles.manualField}>
            <label className={styles.manualLabel}>Kategori</label>
            <div className={styles.toggleGroup}>
              {(['Makanan', 'Minuman'] as KategoriOption[]).map(k => (
                <button key={k} type="button"
                  className={`${styles.toggleBtn} ${manualKategori === k ? styles.toggleBtnActive : ''}`}
                  onClick={() => setManualKategori(k)}>
                  {k === 'Makanan' ? '🍽️ Makanan' : '🥤 Minuman'}
                </button>
              ))}
            </div>
          </div>

          {/* Nama */}
          <div className={styles.manualField}>
            <label className={styles.manualLabel}>{manualKategori === 'Makanan' ? 'Nama Makanan' : 'Nama Minuman'}</label>
            <input
              type="text"
              placeholder={manualKategori === 'Makanan' ? 'contoh: Nasi goreng, Ayam bakar...' : 'contoh: Es teh manis, Kopi susu...'}
              value={manualNama}
              onChange={e => setManualNama(e.target.value)}
              className={styles.manualInput}
              maxLength={100}
            />
          </div>

          {/* Ukuran porsi */}
          <div className={styles.manualField}>
            <label className={styles.manualLabel}>Ukuran {manualKategori === 'Makanan' ? 'Porsi' : 'Minuman'}</label>
            <div className={styles.chipGroup}>
              {(['Kecil', 'Normal', 'Besar', 'Ekstra'] as PorsiOption[]).map(p => (
                <button key={p} type="button"
                  className={`${styles.chip} ${manualPorsi === p ? styles.chipActive : ''}`}
                  onClick={() => setManualPorsi(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Makanan-only fields */}
          {manualKategori === 'Makanan' && (
            <>
              <div className={styles.manualField}>
                <label className={styles.manualLabel}>Metode Masak</label>
                <div className={styles.chipGroup}>
                  {(['Goreng', 'Bakar', 'Rebus', 'Kukus', 'Mentah'] as MetodeMasakOption[]).map(m => (
                    <button key={m} type="button"
                      className={`${styles.chip} ${manualMetode === m ? styles.chipActive : ''}`}
                      onClick={() => setManualMetode(m)}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.manualField}>
                <label className={styles.manualLabel}>Pakai Santan?</label>
                <div className={styles.toggleGroup}>
                  <button type="button"
                    className={`${styles.toggleBtn} ${!manualSantan ? styles.toggleBtnActive : ''}`}
                    onClick={() => setManualSantan(false)}>Tidak</button>
                  <button type="button"
                    className={`${styles.toggleBtn} ${manualSantan ? styles.toggleBtnActive : ''}`}
                    onClick={() => setManualSantan(true)}>Ya</button>
                </div>
              </div>
            </>
          )}

          {/* Minuman-only fields */}
          {manualKategori === 'Minuman' && (
            <>
              <div className={styles.manualField}>
                <label className={styles.manualLabel}>Tingkat Kemanisan</label>
                <div className={styles.chipGroup}>
                  {(['Tidak Manis', 'Sedikit Manis', 'Manis', 'Sangat Manis'] as MinumanManisOption[]).map(m => (
                    <button key={m} type="button"
                      className={`${styles.chip} ${manualManis === m ? styles.chipActive : ''}`}
                      onClick={() => setManualManis(m)}>
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
                      className={`${styles.toggleBtn} ${manualSuhu === s ? styles.toggleBtnActive : ''}`}
                      onClick={() => setManualSuhu(s)}>
                      {s === 'Dingin' ? '🧊 Dingin' : s === 'Hangat' ? '☕ Hangat' : '🔥 Panas'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Shared: Target & Keterangan */}
      <div className={styles.targetRow}>
        <span className={styles.targetLabel}>Target harian</span>
        <input
          type="number"
          value={target}
          onChange={e => setTarget(parseInt(e.target.value) || 2000)}
          className={styles.targetInput}
          min={1000} max={4000}
        />
        <span className={styles.targetUnit}>kkal/hari</span>
      </div>

      <div className={styles.keteranganRow}>
        <div className={styles.keteranganQuick}>
          {['Makan Pagi', 'Makan Siang', 'Makan Malam', 'Snack'].map(k => (
            <button
              key={k}
              className={`${styles.keteranganChip} ${keterangan === k ? styles.keteranganChipActive : ''}`}
              onClick={() => setKeterangan(keterangan === k ? '' : k)}
              type="button"
            >
              {k}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Keterangan (opsional)"
          value={keterangan}
          onChange={e => setKeterangan(e.target.value)}
          className={styles.keteranganInput}
          maxLength={100}
        />
      </div>

      {inputMode === 'foto' ? (
        <button
          className={styles.analyzeBtn}
          disabled={!imageBase64 || loading}
          onClick={analyze}
        >
          {loading ? 'Menganalisis...' : 'Analisis Kalori'}
        </button>
      ) : (
        <button
          className={styles.analyzeBtn}
          disabled={!manualNama.trim() || loading}
          onClick={estimateManual}
        >
          {loading ? 'Mengestimasi...' : 'Estimasi Kalori'}
        </button>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>
            {inputMode === 'foto' ? 'AI sedang menganalisis makananmu...' : 'AI sedang mengestimasi kalori...'}
          </p>
        </div>
      )}

      {result && (
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
                  onClick={savedFavId ? () => deleteFavorite(savedFavId) : saveFavorite}
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
              {items.map((item: { nama: string; kalori: number }, i: number) => (
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

          <button
            className={styles.resetBtn}
            onClick={inputMode === 'foto' ? resetPhoto : resetManual}
          >
            {inputMode === 'foto' ? 'Analisis foto lain' : 'Estimasi makanan lain'}
          </button>
        </div>
      )}
    </div>
  )
}
