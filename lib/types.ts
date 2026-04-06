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
