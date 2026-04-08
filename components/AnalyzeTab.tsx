'use client'
import { useState, useEffect } from 'react'
import { FoodLog, FoodFavorite, User } from '@/lib/types'
import FotoMode from './analyze/FotoMode'
import ManualMode, {
  KategoriOption, PorsiOption, MetodeMasakOption, MinumanManisOption, MinumanSuhuOption,
} from './analyze/ManualMode'
import FavoritesPanel from './analyze/FavoritesPanel'
import ResultCard from './analyze/ResultCard'
import styles from './AnalyzeTab.module.css'

type InputMode = 'foto' | 'manual'

export default function AnalyzeTab({ user, onAnalyzed }: { user: User | null; onAnalyzed?: () => void }) {
  const [inputMode, setInputMode] = useState<InputMode>('foto')

  // Foto state
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState('image/jpeg')

  // Manual state
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
  const [isMobile, setIsMobile] = useState(false)

  // Favorites state
  const [favorites, setFavorites] = useState<FoodFavorite[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [savingFav, setSavingFav] = useState(false)
  const [savedFavId, setSavedFavId] = useState<number | null>(null)
  const [reloggingFavId, setReloggingFavId] = useState<number | null>(null)
  const [loggedFavIds, setLoggedFavIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    if (user?.target_kalori) setTarget(user.target_kalori)
  }, [user])

  useEffect(() => {
    loadFavorites()
    setSavedFavId(null)
  }, [user?.id])

  async function loadFavorites() {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/favorites`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.success) setFavorites(json.data)
      else setError('Gagal memuat favorit.')
    } catch (err) {
      console.error('[loadFavorites]', err)
      setError('Gagal memuat daftar favorit.')
    }
  }

  async function saveFavorite() {
    if (!result || !user?.id) return
    setSavingFav(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: result.nama,
          porsi: result.porsi,
          total_kalori: result.total_kalori,
          protein_g: result.protein_g,
          karbo_g: result.karbo_g,
          lemak_g: result.lemak_g,
          items: result.items,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSavedFavId(json.data.id)
        if (!json.duplicate) setFavorites(prev => [json.data, ...prev])
      } else {
        setError(json.error || 'Gagal menyimpan favorit.')
      }
    } catch (err) {
      console.error('[saveFavorite]', err)
      setError('Gagal menyimpan favorit.')
    } finally {
      setSavingFav(false)
    }
  }

  async function deleteFavorite(id: number) {
    if (savedFavId === id) setSavedFavId(null)
    setFavorites(prev => prev.filter(f => f.id !== id))
    try {
      const res = await fetch(`/api/favorites?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // Rollback optimistic update
        await loadFavorites()
        setError('Gagal menghapus favorit.')
      }
    } catch (err) {
      console.error('[deleteFavorite]', err)
      await loadFavorites()
      setError('Gagal menghapus favorit.')
    }
  }

  async function relogFavorite(fav: FoodFavorite) {
    if (reloggingFavId != null) return
    setReloggingFavId(fav.id)
    try {
      const res = await fetch('/api/favorites/relog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite_id: fav.id, keterangan, target_kalori: target }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal log ulang favorit.')
      setLoggedFavIds(prev => new Set(prev).add(fav.id))
      onAnalyzed?.()
      setTimeout(() => setLoggedFavIds(prev => { const s = new Set(prev); s.delete(fav.id); return s }), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal log ulang favorit.')
    } finally {
      setReloggingFavId(null)
    }
  }

  async function handleFile(file: File) {
    // Limit file size before reading to avoid memory crash on mobile (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('Foto terlalu besar (maks 20MB). Coba foto dengan kualitas lebih rendah.')
      return
    }

    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!isHeic && !validTypes.includes(file.type) && file.type !== '') {
      setError('Format tidak didukung. Gunakan JPG, PNG, atau WebP.')
      return
    }

    let processedFile: File | Blob = file

    // Convert HEIC/HEIF to JPEG using heic2any (client-side, no backend needed)
    if (isHeic) {
      setLoading(true)
      try {
        const heic2any = (await import('heic2any')).default
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
        processedFile = Array.isArray(converted) ? converted[0] : converted
      } catch {
        setError('Gagal mengkonversi foto HEIC. Coba screenshot foto tersebut lalu upload screenshot-nya.')
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
    }

    setMediaType('image/jpeg')
    const reader = new FileReader()
    reader.onerror = () => {
      setError('Gagal membaca file. Coba foto yang lain.')
    }
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onerror = () => {
        setError('Gagal memuat gambar. Format mungkin tidak didukung browser ini.')
      }
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        let { width, height } = img
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
        canvas.width = width
        canvas.height = height

        // getContext can return null on mobile if GPU memory is exhausted
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setError('Gagal memproses gambar. Coba tutup aplikasi lain lalu ulangi.')
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
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
    reader.readAsDataURL(processedFile)
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
        body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType, target_kalori: target, keterangan }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal menganalisis foto.')
      setResult(json.data)
      onAnalyzed?.()
    } catch (err) {
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
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal mengestimasi kalori.')
      setResult(json.data)
      onAnalyzed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengestimasi kalori. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      {/* Mode toggle */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${inputMode === 'foto' ? styles.modeBtnActive : ''}`}
          onClick={() => switchMode('foto')}
          type="button"
        >
          <span className={styles.modeBtnIcon}>📷</span> Foto
        </button>
        <button
          className={`${styles.modeBtn} ${inputMode === 'manual' ? styles.modeBtnActive : ''}`}
          onClick={() => switchMode('manual')}
          type="button"
        >
          <span className={styles.modeBtnIcon}>✏️</span> Manual
        </button>
      </div>

      <FavoritesPanel
        favorites={favorites}
        show={showFavorites}
        onToggle={() => setShowFavorites(s => !s)}
        onRelog={relogFavorite}
        onDelete={deleteFavorite}
        reloggingId={reloggingFavId}
        loggedIds={loggedFavIds}
      />

      {inputMode === 'foto' && (
        <FotoMode
          imagePreview={imagePreview}
          isMobile={isMobile}
          onFileChange={onFileChange}
          onDrop={onDrop}
          onReset={resetPhoto}
        />
      )}

      {inputMode === 'manual' && (
        <ManualMode
          kategori={manualKategori} setKategori={setManualKategori}
          nama={manualNama} setNama={setManualNama}
          porsi={manualPorsi} setPorsi={setManualPorsi}
          metode={manualMetode} setMetode={setManualMetode}
          santan={manualSantan} setSantan={setManualSantan}
          manis={manualManis} setManis={setManualManis}
          suhu={manualSuhu} setSuhu={setManualSuhu}
          onSubmit={estimateManual}
        />
      )}

      {/* Target & Keterangan */}
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
        <button className={styles.analyzeBtn} disabled={!imageBase64 || loading} onClick={analyze}>
          {loading ? 'Menganalisis...' : 'Analisis Kalori'}
        </button>
      ) : (
        <button className={styles.analyzeBtn} disabled={!manualNama.trim() || loading} onClick={estimateManual}>
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
        <ResultCard
          result={result}
          target={target}
          user={user}
          inputMode={inputMode}
          savedFavId={savedFavId}
          savingFav={savingFav}
          onSaveFavorite={saveFavorite}
          onDeleteFavorite={deleteFavorite}
          onReset={inputMode === 'foto' ? resetPhoto : resetManual}
        />
      )}
    </div>
  )
}
