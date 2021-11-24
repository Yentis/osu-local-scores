export default interface Filter {
  search: string
  status: number[]
  gamemode: number[]
  scoreMin?: number
  scoreMax?: number
  grade: number[]
  accuracyMin?: number
  accuracyMax?: number
  missesMin?: number
  missesMax?: number
  comboMin?: number
  comboMax?: number
  altComboMin?: number
  altComboMax?: number
  maxComboMin?: number
  maxComboMax?: number
  comboType: number
  mods: Map<number, boolean | null>
  dateMin?: string
  dateMax?: string
  ppMin?: number
  ppMax?: number
  altPpMin?: number
  altPpMax?: number
  maxPpMin?: number
  maxPpMax?: number
  ppType: number
  highestScorePerMode: boolean
}
