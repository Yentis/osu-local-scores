export default interface Filter {
  search: string
  status: number[]
  gamemode: number[]
  scoreMin?: number | string
  scoreMax?: number | string
  grade: number[]
  accuracyMin?: number | string
  accuracyMax?: number | string
  missesMin?: number | string
  missesMax?: number | string
  comboMin?: number | string
  comboMax?: number | string
  altComboMin?: number | string
  altComboMax?: number | string
  maxComboMin?: number | string
  maxComboMax?: number | string
  mods: Map<number, boolean | null>
  dateMin?: string
  dateMax?: string
  ppMin?: number | string
  ppMax?: number | string
  altPpMin?: number | string
  altPpMax?: number | string
  maxPpMin?: number | string
  maxPpMax?: number | string
  highestScorePerMode: boolean
}
