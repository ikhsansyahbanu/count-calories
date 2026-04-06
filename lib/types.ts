export interface User {
  id: number
  nama: string
  berat_badan: number
  tinggi_badan: number
  usia: number
  jenis_kelamin: 'laki-laki' | 'perempuan'
  aktivitas: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  target_kalori: number
  created_at: string
  streak?: number
  last_log_date?: string
}

export interface FoodLog {
  id: number
  nama: string
  porsi: string
  total_kalori: number
  protein_g: number
  karbo_g: number
  lemak_g: number
  items: FoodItem[]
  saran: string
  target_kalori: number
  keterangan: string
  confidence: 'low' | 'medium' | 'high'
  manual: boolean
  created_at: string
}

export interface FoodItem {
  nama: string
  kalori: number
}

export interface AnalyzeResult {
  nama: string
  porsi: string
  total_kalori: number
  protein_g: number
  karbo_g: number
  lemak_g: number
  confidence: 'low' | 'medium' | 'high'
  items: FoodItem[]
  saran: string
}


export interface DaySummary {
  tanggal: string
  total_kalori: number
  total_protein: number
  total_karbo: number
  total_lemak: number
  jumlah_makan: number
  target_kalori: number
}
