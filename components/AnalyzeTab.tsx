'use client'
import { useState, useRef } from 'react'
import { FoodLog, User } from '@/lib/types'
import styles from './AnalyzeTab.module.css'

export default function AnalyzeTab({ user }: { user: User | null }) {
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState('image/jpeg')
  const [target, setTarget] = useState(user?.target_kalori || 2000)
  const [keterangan, setKeterangan] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FoodLog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setMediaType(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImageBase64(dataUrl.split(',')[1])
      setImagePreview(dataUrl)
      setResult(null)
      setError(null)
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
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
    } catch {
      setError('Gagal menganalisis foto. Coba lagi dengan foto yang lebih jelas.')
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
      {!imagePreview ? (
        <div
          className={styles.uploadArea}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} hidden />
          <div className={styles.uploadIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className={styles.uploadTitle}>Foto atau upload makanan</div>
          <div className={styles.uploadSub}>JPG, PNG, HEIC · tap untuk kamera</div>
        </div>
      ) : (
        <div className={styles.previewWrap}>
          <img src={imagePreview} alt="preview" className={styles.previewImg} />
          <button className={styles.removeBtn} onClick={resetPhoto}>✕</button>
        </div>
      )}

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

      <button
        className={styles.analyzeBtn}
        disabled={!imageBase64 || loading}
        onClick={analyze}
      >
        {loading ? 'Menganalisis...' : 'Analisis Kalori'}
      </button>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>AI sedang menganalisis makananmu...</p>
        </div>
      )}

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <div className={styles.resultName}>{result.nama}</div>
            <div className={styles.resultPortion}>{result.porsi}</div>
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

          <button className={styles.resetBtn} onClick={resetPhoto}>Analisis foto lain</button>
        </div>
      )}
    </div>
  )
}
