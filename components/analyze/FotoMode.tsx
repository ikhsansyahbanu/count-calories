'use client'
import { useRef } from 'react'
import styles from '../AnalyzeTab.module.css'

interface Props {
  imagePreview: string | null
  isMobile: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onReset: () => void
}

export default function FotoMode({ imagePreview, isMobile, onFileChange, onDrop, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  if (imagePreview) {
    return (
      <div className={styles.previewWrap}>
        <img src={imagePreview} alt="preview" className={styles.previewImg} />
        <button className={styles.removeBtn} onClick={onReset}>✕</button>
      </div>
    )
  }

  return (
    <div className={styles.uploadArea} onDrop={onDrop} onDragOver={e => e.preventDefault()}>
      {/* capture="environment" opens camera directly — separate from gallery picker */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} hidden />
      {/* No capture attribute — shows OS file picker with gallery access. Must use image/* not specific MIME types — specific types cause onChange to silently not fire on iOS Safari and some Android browsers */}
      <input ref={galleryRef} type="file" accept="image/*" onChange={onFileChange} hidden />

      <div className={styles.uploadIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <div className={styles.uploadTitle}>Unggah foto makanan</div>
      <div className={styles.uploadSub}>JPG, PNG, WebP</div>

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
  )
}
