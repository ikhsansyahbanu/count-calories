'use client'
import { useState } from 'react'
import styles from './ShareButton.module.css'

interface Props {
  text: string
  label?: string
  small?: boolean
}

export default function ShareButton({ text, label = 'Bagikan', small }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <button
      className={`${styles.btn} ${small ? styles.small : ''}`}
      onClick={handleShare}
      title="Bagikan progress"
      type="button"
    >
      {copied ? '✓ Disalin!' : `📤 ${label}`}
    </button>
  )
}
