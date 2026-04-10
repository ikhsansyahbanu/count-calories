interface ReminderInput {
  jumlah_makan: number
  target: number
  streak?: number
}

interface ReminderResult {
  show: boolean
  message: string
}

export function useReminderCheck({ jumlah_makan, streak }: ReminderInput): ReminderResult {
  const hour = new Date().getHours()

  if (jumlah_makan === 0 && (streak ?? 0) >= 3 && hour >= 20) {
    return { show: true, message: `⚠️ Streak ${streak} harimu terancam! Log sekarang sebelum tengah malam.` }
  }
  if (jumlah_makan === 0 && hour >= 13) {
    return { show: true, message: 'Belum ada catatan hari ini — jangan lupa log makan siang!' }
  }
  if (jumlah_makan === 1 && hour >= 19) {
    return { show: true, message: 'Baru 1x makan tercatat — tambah makan malam?' }
  }
  return { show: false, message: '' }
}
